import { requireSupabase } from "./supabaseClient.js";
import { WISP_LIMITS, WISP_RPCS, WISP_TABLES, isUuid } from "./config.js";

const PUBLIC_PROFILE_COLUMNS = "id,username,bio,avatar_url";
const OWN_PROFILE_UPDATE_KEYS = new Set([
  "username",
  "bio",
  "showOnlineStatus",
  "showReadReceipts",
]);
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/;

function normalizePeerProfile(profile) {
  if (!profile) return null;
  const lastSeenAt = Date.parse(profile.last_seen || "");
  const presenceIsFresh = Number.isFinite(lastSeenAt) && Date.now() - lastSeenAt < 90_000;
  return {
    id: profile.id,
    username: profile.username,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    status: presenceIsFresh && profile.status === "online" ? "online" : null,
    last_seen: presenceIsFresh ? (profile.last_seen ?? null) : null,
  };
}

function normalizeOwnProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    status: profile.status,
    last_seen: profile.last_seen ?? null,
    show_online_status: profile.show_online_status === true,
    show_read_receipts: profile.show_read_receipts === true,
  };
}

function characterLength(value) {
  return [...value].length;
}

function validatedOwnProfileUpdates(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Profile changes must be an object.");
  }
  for (const key of Object.keys(changes)) {
    if (!OWN_PROFILE_UPDATE_KEYS.has(key)) {
      throw new Error(`Profile field ${key} cannot be updated.`);
    }
  }

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(changes, "username")) {
    if (typeof changes.username !== "string") throw new TypeError("Username must be text.");
    const username = changes.username.trim();
    if (characterLength(username) < 3
        || characterLength(username) > WISP_LIMITS.username
        || !USERNAME_PATTERN.test(username)) {
      throw new Error("Username must be 3-32 letters, numbers, dots, dashes, or underscores.");
    }
    updates.username = username;
  }

  if (Object.prototype.hasOwnProperty.call(changes, "bio")) {
    if (changes.bio !== null && typeof changes.bio !== "string") {
      throw new TypeError("Bio must be text.");
    }
    const bio = changes.bio === null ? "" : changes.bio.trim();
    if (characterLength(bio) > 280) throw new Error("Bio must be 280 characters or fewer.");
    updates.bio = bio || null;
  }

  if (Object.prototype.hasOwnProperty.call(changes, "showOnlineStatus")) {
    if (typeof changes.showOnlineStatus !== "boolean") {
      throw new TypeError("Online-status privacy must be true or false.");
    }
    updates.show_online_status = changes.showOnlineStatus;
  }

  if (Object.prototype.hasOwnProperty.call(changes, "showReadReceipts")) {
    if (typeof changes.showReadReceipts !== "boolean") {
      throw new TypeError("Read-receipt privacy must be true or false.");
    }
    updates.show_read_receipts = changes.showReadReceipts;
  }

  if (!Object.keys(updates).length) throw new Error("Choose at least one profile field to update.");
  return updates;
}

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

async function readOwnProfile(client = requireSupabase()) {
  const { data, error } = await client.rpc(WISP_RPCS.getOwnProfile).maybeSingle();
  if (error) throw error;
  return normalizeOwnProfile(data);
}

async function readVisibleProfiles(profileIds, client = requireSupabase()) {
  const ids = [...new Set((profileIds || []).filter(isUuid))].slice(0, 200);
  if (!ids.length) return [];
  const { data, error } = await client.rpc(WISP_RPCS.getVisibleProfiles, {
    p_profile_ids: ids,
  });
  if (error) throw error;
  return (data || []).map(normalizePeerProfile).filter(Boolean);
}

export async function ensureWispProfile(user, preferredUsername = "") {
  if (!user?.id || user.is_anonymous) throw new Error("A permanent account is required.");
  const client = requireSupabase();
  const existing = await readOwnProfile(client);
  if (existing) return existing;

  const username = normalizeUsername(preferredUsername || user.user_metadata?.username, user.id);
  const { data, error } = await client
    .rpc(WISP_RPCS.enrollProfile, { p_username: username })
    .single();
  if (error) throw error;
  return normalizeOwnProfile(data);
}

/** Read the full safe profile and privacy preferences for the current user. */
export async function getOwnProfile() {
  const client = requireSupabase();
  await authenticatedUser();
  const profile = await readOwnProfile(client);
  if (!profile) throw new Error("Complete your Wisp profile first.");
  return profile;
}

/** Update only the current user's allowlisted public-profile preferences. */
export async function updateOwnProfile(changes) {
  const updates = validatedOwnProfileUpdates(changes);
  const client = requireSupabase();
  await authenticatedUser();
  const { data, error } = await client
    .rpc(WISP_RPCS.updateOwnProfile, { p_changes: updates })
    .single();
  if (error) throw error;
  return normalizeOwnProfile(data);
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

/** Return the current user's private, one-way address book. */
export async function listContacts() {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data: rows, error: contactError } = await client
    .from(WISP_TABLES.contacts)
    .select("contact_id,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (contactError) throw contactError;

  const contactIds = [...new Set(
    (rows || []).map(({ contact_id: contactId }) => contactId).filter(isUuid),
  )];
  if (!contactIds.length) return [];

  const profiles = await readVisibleProfiles(contactIds, client);

  const profileById = new Map(
    (profiles || []).map((profile) => [profile.id, normalizePeerProfile(profile)]),
  );
  return (rows || [])
    .map((row) => {
      const profile = profileById.get(row.contact_id);
      return profile ? { ...profile, addedAt: row.created_at } : null;
    })
    .filter(Boolean);
}

/** Save a profile to the current user's one-way address book. */
export async function addContact(contactId) {
  if (!isUuid(contactId)) throw new Error("That contact identifier is invalid.");
  const client = requireSupabase();
  const user = await authenticatedUser();
  if (contactId === user.id) throw new Error("You cannot add yourself as a contact.");

  const { error } = await client
    .from(WISP_TABLES.contacts)
    .insert({ owner_id: user.id, contact_id: contactId });
  // Adding an already-saved contact is an idempotent success. Do not use an
  // upsert here: the browser intentionally has INSERT but not UPDATE access.
  if (error && error.code !== "23505") throw error;
  return true;
}

/** Remove a profile from the current user's one-way address book. */
export async function removeContact(contactId) {
  if (!isUuid(contactId)) throw new Error("That contact identifier is invalid.");
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { error } = await client
    .from(WISP_TABLES.contacts)
    .delete()
    .eq("owner_id", user.id)
    .eq("contact_id", contactId);
  if (error) throw error;
  return true;
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

  const profiles = await readVisibleProfiles(peerIds, client);
  const profileById = new Map(
    (profiles || []).map((profile) => [profile.id, normalizePeerProfile(profile)]),
  );
  return new Map(
    [...peerIdByChat]
      .map(([chatId, peerId]) => [chatId, profileById.get(peerId)])
      .filter(([, profile]) => profile),
  );
}

function normalizeChatPageCursor(before) {
  if (before === null || before === undefined) return null;
  const activityAt = String(before?.activityAt || "");
  if (!isUuid(before?.chatId)
      || !activityAt
      || Number.isNaN(Date.parse(activityAt))) {
    throw new Error("That conversation-page cursor is invalid.");
  }
  return { activityAt, chatId: before.chatId };
}

/**
 * List one stable, keyset-paginated inbox page.
 *
 * Returning a cursor instead of applying a browser-side 100-chat cap keeps
 * every conversation reachable while bounding each Data API request.
 */
export async function listMyChats({ before = null, limit = 50 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > WISP_LIMITS.chats) {
    throw new Error(`Conversation pages must contain 1-${WISP_LIMITS.chats} chats.`);
  }
  const cursor = normalizeChatPageCursor(before);
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data: summaries, error } = await client.rpc(WISP_RPCS.listChatSummaries, {
    p_before_activity_at: cursor?.activityAt || null,
    p_before_chat_id: cursor?.chatId || null,
    p_limit: limit,
  });
  if (error) throw error;

  // The RPC returns one look-ahead row. Keep it out of the rendered page and
  // use it only to say whether an older page exists.
  const validSummaries = (summaries || [])
    .filter(({ chat_id: chatId, activity_at: activityAt }) =>
      isUuid(chatId) && !Number.isNaN(Date.parse(activityAt || "")));
  const hasMore = validSummaries.length > limit;
  const pageSummaries = validSummaries.slice(0, limit);
  const lastSummary = pageSummaries[pageSummaries.length - 1] || null;
  const nextCursor = hasMore && lastSummary ? {
    activityAt: lastSummary.activity_at,
    chatId: lastSummary.chat_id,
  } : null;

  const chatIds = [...new Set(pageSummaries.map(({ chat_id: chatId }) => chatId))];
  if (!chatIds.length) return { chats: [], hasMore: false, nextCursor: null };
  const peers = await peerProfilesByChat(chatIds, user.id);
  const chats = pageSummaries
    .map((summary) => ({
      chatId: summary.chat_id,
      contact: peers.get(summary.chat_id),
      activityAt: summary.activity_at,
      lastMessage: isUuid(summary.latest_message_id) ? {
        id: summary.latest_message_id,
        content: summary.latest_content,
        created_at: summary.latest_created_at,
        sender_id: summary.latest_sender_id,
      } : null,
      unreadCount: Math.max(0, Number.parseInt(summary.unread_count, 10) || 0),
    }))
    .filter(({ contact }) => contact);
  return { chats, hasMore, nextCursor };
}

async function attachVisibleReadReceipts(messages, userId, client) {
  const ownMessageIds = messages
    .filter(({ sender_id: senderId }) => senderId === userId)
    .map(({ id }) => id)
    .filter(isUuid);
  if (!ownMessageIds.length) return messages;

  // Receipt RLS returns another person's receipt to the sender only while
  // that person has opted in and neither side has blocked the other.
  const { data: receipts, error: receiptError } = await client
    .from(WISP_TABLES.messageReceipts)
    .select("message_id,read_at")
    .in("message_id", ownMessageIds)
    .not("read_at", "is", null);
  if (receiptError) throw receiptError;
  const readAtByMessage = new Map(
    (receipts || []).map(({ message_id: messageId, read_at: readAt }) => [messageId, readAt]),
  );
  return messages.map((message) => ({
    ...message,
    read_at: readAtByMessage.get(message.id) || null,
  }));
}

export async function listMessages(chatId, { before = null } = {}) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const client = requireSupabase();
  const user = await authenticatedUser();
  let query = client
    .from(WISP_TABLES.messages)
    .select("id,sender_id,content,created_at,deleted_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(WISP_LIMITS.messagePage);
  if (before !== null) {
    const beforeCreatedAt = String(before?.createdAt || "");
    if (!isUuid(before?.id) || !beforeCreatedAt || Number.isNaN(Date.parse(beforeCreatedAt))) {
      throw new Error("That message-page cursor is invalid.");
    }
    query = query.or(
      `created_at.lt.${beforeCreatedAt},and(created_at.eq.${beforeCreatedAt},id.lt.${before.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  const messages = (data || []).reverse();
  return attachVisibleReadReceipts(messages, user.id, client);
}

/** Refresh specific already-known rows after a private Broadcast hint. */
export async function listMessagesByIds(chatId, messageIds) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const ids = [...new Set((messageIds || []).filter(isUuid))].slice(0, WISP_LIMITS.messages);
  if (!ids.length) return [];
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { data, error } = await client
    .from(WISP_TABLES.messages)
    .select("id,sender_id,content,created_at,deleted_at")
    .eq("chat_id", chatId)
    .in("id", ids);
  if (error) throw error;
  return attachVisibleReadReceipts(data || [], user.id, client);
}

export async function sendMessage(chatId, content) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const message = String(content || "").trim();
  if (!message || characterLength(message) > WISP_LIMITS.message) {
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

/** Soft-delete one message through the sender-only server RPC. */
export async function deleteMessage(messageId) {
  if (!isUuid(messageId)) throw new Error("That message identifier is invalid.");
  const client = requireSupabase();
  await authenticatedUser();
  const { data, error } = await client.rpc(WISP_RPCS.deleteMessage, {
    p_message_id: messageId,
  });
  if (error) throw error;
  if (data !== true) throw new Error("The message service did not confirm deletion.");
  return true;
}

/** Mark the current user's bounded, visible window of peer messages read. */
export async function markChatRead(chatId, messageIds) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const visibleIds = [...new Set((messageIds || []).filter(isUuid))];
  if (!visibleIds.length) return 0;
  if (visibleIds.length > WISP_LIMITS.messages) {
    throw new Error(`At most ${WISP_LIMITS.messages} visible messages can be marked read.`);
  }
  const client = requireSupabase();
  await authenticatedUser();
  const { data, error } = await client.rpc(WISP_RPCS.markChatRead, {
    p_chat_id: chatId,
    p_message_ids: visibleIds,
  });
  if (error) throw error;
  const count = Number(data);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("The read-status service returned an invalid result.");
  }
  return count;
}

/**
 * Subscribe to a private, membership-gated refresh channel. Payloads are only
 * hints; every message and receipt still comes from an RLS-protected read.
 */
export async function subscribeToChatActivity(
  chatId,
  { onRefresh = () => {} } = {},
) {
  if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
  const client = requireSupabase();
  const channel = client
    .channel(`wisp-chat:${chatId}`, {
      config: { private: true },
    })
    .on(
      "broadcast",
      { event: "refresh" },
      () => onRefresh(),
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

  return {
    unsubscribe: async () => {
      await client.removeChannel(channel).catch(() => {});
    },
  };
}

export async function getProfile(userId) {
  if (!isUuid(userId)) throw new Error("That profile identifier is invalid.");
  const profiles = await readVisibleProfiles([userId]);
  if (!profiles[0]) throw new Error("That profile is unavailable.");
  return profiles[0];
}

export async function searchProfiles(query) {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const search = String(query || "").trim().replace(/[%_]/g, "").slice(0, WISP_LIMITS.profileSearch);
  if (search.length < 2) return [];
  const { data, error } = await client
    .from(WISP_TABLES.profiles)
    .select(PUBLIC_PROFILE_COLUMNS)
    .ilike("username", `%${search}%`)
    .neq("id", user.id)
    .limit(20);
  if (error) throw error;
  return readVisibleProfiles((data || []).map(({ id }) => id), client);
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
