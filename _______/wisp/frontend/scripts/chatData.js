import { requireSupabase } from "./supabaseClient.js";
import { WISP_LIMITS, WISP_RPCS, WISP_TABLES, isUuid } from "./config.js";

function normalizeUsername(value, userId) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.-]/g, "")
    .replace(/^[^A-Za-z0-9]+/, "")
    .slice(0, 32);
  return normalized.length >= 3 ? normalized : `wisp_${String(userId).replace(/-/g, "").slice(0, 12)}`;
}

async function authenticatedUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user || data.user.is_anonymous) {
    throw error || new Error("A permanent account is required.");
  }
  return data.user;
}

export async function ensureWispProfile(user, preferredUsername = "") {
  if (!user?.id || user.is_anonymous) throw new Error("A permanent account is required.");
  const client = requireSupabase();
  const { data: existing, error: readError } = await client
    .from(WISP_TABLES.profiles)
    .select("id,username,bio,avatar_url,status,last_seen")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;

  const username = normalizeUsername(preferredUsername || user.user_metadata?.username, user.id);
  const { data, error } = await client
    .rpc(WISP_RPCS.enrollProfile, { p_username: username })
    .single();
  if (error) throw error;
  return data;
}

/** Create or reuse a one-to-one chat through the server-side membership RPC. */
export async function getOrCreateOneToOneChat(otherUserId) {
  if (!isUuid(otherUserId)) throw new Error("That contact identifier is invalid.");
  const client = requireSupabase();
  const user = await authenticatedUser();
  if (otherUserId === user.id) throw new Error("You cannot start a chat with yourself.");

  const { data, error } = await client.rpc(WISP_RPCS.getOrCreateDirectChat, {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  if (!isUuid(data)) throw new Error("The conversation service returned an invalid identifier.");
  return data;
}

async function peerProfilesByChat(chatIds, myId) {
  const client = requireSupabase();
  if (!chatIds.length) return new Map();

  const { data: members, error: memberError } = await client
    .from(WISP_TABLES.chatMembers)
    .select("chat_id,user_id")
    .in("chat_id", chatIds);
  if (memberError) throw memberError;

  const peerIdByChat = new Map();
  for (const member of members || []) {
    if (member.user_id !== myId && !peerIdByChat.has(member.chat_id)) {
      peerIdByChat.set(member.chat_id, member.user_id);
    }
  }
  const peerIds = [...new Set(peerIdByChat.values())];
  if (!peerIds.length) return new Map();

  const { data: profiles, error: profileError } = await client
    .from(WISP_TABLES.profiles)
    .select("id,username,bio,status,avatar_url")
    .in("id", peerIds);
  if (profileError) throw profileError;
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return new Map(
    [...peerIdByChat]
      .map(([chatId, peerId]) => [chatId, profileById.get(peerId)])
      .filter(([, profile]) => profile),
  );
}

/** List the current user's direct chats with the other participant and latest message. */
export async function listMyChats() {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data: memberships, error } = await client
    .from(WISP_TABLES.chatMembers)
    .select("chat_id")
    .eq("user_id", user.id)
    .limit(WISP_LIMITS.chats);
  if (error) throw error;

  const chatIds = [...new Set((memberships || []).map(({ chat_id: chatId }) => chatId).filter(isUuid))];
  if (!chatIds.length) return [];
  const peers = await peerProfilesByChat(chatIds, user.id);
  const { data: messages, error: messageError } = await client
    .from(WISP_TABLES.messages)
    .select("chat_id,content,created_at,sender_id")
    .in("chat_id", chatIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(1000, chatIds.length * 20));
  if (messageError) throw messageError;

  const latestByChat = new Map();
  for (const message of messages || []) {
    if (!latestByChat.has(message.chat_id)) latestByChat.set(message.chat_id, message);
  }
  return chatIds
    .map((chatId) => ({ chatId, contact: peers.get(chatId), lastMessage: latestByChat.get(chatId) || null }))
    .filter(({ contact }) => contact)
    .sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0));
}

export async function listMessages(chatId) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const client = requireSupabase();
  const { data, error } = await client
    .from(WISP_TABLES.messages)
    .select("id,sender_id,content,created_at,deleted_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(WISP_LIMITS.messages);
  if (error) throw error;
  return (data || []).reverse();
}

export async function sendMessage(chatId, content) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const message = String(content || "").trim();
  if (!message || message.length > WISP_LIMITS.message) {
    throw new Error(`Messages must be between 1 and ${WISP_LIMITS.message} characters.`);
  }
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data, error } = await client
    .from(WISP_TABLES.messages)
    .insert({ chat_id: chatId, sender_id: user.id, content: message })
    .select("id,sender_id,content,created_at,deleted_at")
    .single();
  if (error) throw error;
  return data;
}

/** Subscribe to new messages after the channel confirms it is ready. */
export async function subscribeToMessages(chatId, onInsert) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const client = requireSupabase();
  const channel = client
    .channel(`wisp-messages:${chatId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: WISP_TABLES.messages, filter: `chat_id=eq.${chatId}` },
      (payload) => onInsert(payload.new),
    );

  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Message updates timed out.")), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeout);
        resolve();
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        window.clearTimeout(timeout);
        reject(new Error("Message updates could not connect."));
      }
    });
  }).catch(async (error) => {
    await client.removeChannel(channel).catch(() => {});
    throw error;
  });

  return async () => {
    await client.removeChannel(channel).catch(() => {});
  };
}

export async function getProfile(userId) {
  if (!isUuid(userId)) throw new Error("That profile identifier is invalid.");
  const client = requireSupabase();
  const { data, error } = await client
    .from(WISP_TABLES.profiles)
    .select("id,username,bio,status,avatar_url,last_seen")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function searchProfiles(query) {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const search = String(query || "").trim().replace(/[%_]/g, "").slice(0, WISP_LIMITS.profileSearch);
  if (search.length < 2) return [];
  const { data, error } = await client
    .from(WISP_TABLES.profiles)
    .select("id,username,bio,status,avatar_url")
    .ilike("username", `%${search}%`)
    .neq("id", user.id)
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function listCallHistory() {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data: calls, error } = await client
    .from(WISP_TABLES.calls)
    .select("id,chat_id,initiated_by,call_type,status,started_at,ended_at")
    .order("started_at", { ascending: false })
    .limit(WISP_LIMITS.calls);
  if (error) throw error;
  const validCalls = (calls || []).filter((call) => isUuid(call.chat_id));
  const peers = await peerProfilesByChat(
    [...new Set(validCalls.map(({ chat_id: chatId }) => chatId))],
    user.id,
  );
  return validCalls.map((call) => ({
    ...call,
    contact: peers.get(call.chat_id) || null,
    direction: call.initiated_by === user.id ? "outgoing" : "incoming",
  }));
}
