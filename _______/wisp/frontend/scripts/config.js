export const WISP_TABLES = Object.freeze({
  profiles: "wisp_profiles",
  contacts: "wisp_contacts",
  blocks: "wisp_blocks",
  chats: "wisp_chats",
  chatMembers: "wisp_chat_members",
  messages: "wisp_messages",
  messageReceipts: "wisp_message_receipts",
  calls: "wisp_calls",
  callParticipants: "wisp_call_participants",
});

export const WISP_RPCS = Object.freeze({
  enrollProfile: "wisp_enroll_profile",
  getOrCreateDirectChat: "wisp_get_or_create_direct_chat",
  deleteMessage: "wisp_delete_message",
  markChatRead: "wisp_mark_chat_read",
  listUnreadCounts: "wisp_list_unread_counts",
  listChatSummaries: "wisp_list_chat_summaries",
  getOwnProfile: "wisp_get_own_profile",
  updateOwnProfile: "wisp_update_own_profile",
  getVisibleProfiles: "wisp_get_visible_profiles",
  setPresence: "wisp_set_presence",
  startCall: "wisp_start_call",
  joinCall: "wisp_join_call",
  endCall: "wisp_end_call",
});

export const WISP_LIMITS = Object.freeze({
  username: 32,
  email: 254,
  password: 128,
  message: 4000,
  profileSearch: 64,
  chats: 100,
  messages: 200,
  messagePage: 50,
  messageRefresh: 500,
  calls: 100,
});

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}
