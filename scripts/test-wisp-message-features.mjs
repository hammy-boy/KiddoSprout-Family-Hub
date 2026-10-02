import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

const [migration, config, data, chat, home, chatPage, homePage, chatStyles, screenStyles] = await Promise.all([
  source("supabase/migrations/20261001202059_wisp_message_deletion_read_receipts.sql"),
  source("_______/wisp/frontend/scripts/config.js"),
  source("_______/wisp/frontend/scripts/chatData.js"),
  source("_______/wisp/frontend/scripts/chat.js"),
  source("_______/wisp/frontend/scripts/home.js"),
  source("_______/wisp/frontend/pages/chat.html"),
  source("_______/wisp/frontend/pages/home.html"),
  source("_______/wisp/frontend/styles/chat.css"),
  source("_______/wisp/frontend/styles/screens.css"),
]);

function functionBlock(sql, qualifiedName) {
  const escaped = qualifiedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escaped}\\b[\\s\\S]*?(?=\\ncreate\\s+or\\s+replace\\s+function|\\nrevoke\\s+all|$)`,
    "i",
  ));
  return match?.[0] || "";
}

test("message lifecycle mutations are guarded RPCs, not browser table writes", () => {
  for (const name of ["wisp_private.delete_message", "wisp_private.mark_chat_read"]) {
    const block = functionBlock(migration, name);
    assert.ok(block, `${name} must exist`);
    assert.match(block, /security\s+definer/i);
    assert.match(block, /set\s+search_path\s*=\s*''/i);
    assert.match(block, /auth\.uid\s*\(\)|is_permanent_actor|can_interact_in_chat/i);
  }

  for (const name of ["public.wisp_delete_message", "public.wisp_mark_chat_read"]) {
    const block = functionBlock(migration, name);
    assert.ok(block, `${name} must exist`);
    assert.match(block, /security\s+invoker/i);
    assert.doesNotMatch(block, /security\s+definer/i);
  }

  assert.match(migration, /revoke\s+update\s*,\s*delete\s+on\s+table\s+public\.wisp_messages[\s\S]*?authenticated/i);
  assert.match(migration, /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+public\.wisp_message_receipts[\s\S]*?authenticated/i);
  assert.doesNotMatch(migration, /grant\s+execute[\s\S]*?public\.wisp_(?:delete_message|mark_chat_read)[\s\S]*?\bto\s+(?:public\s*,\s*)?anon\b/i);
  assert.match(migration, /content\s*=\s*null[\s\S]*?media_url\s*=\s*null[\s\S]*?deleted_at\s*=/i);
  assert.match(migration, /limit\s+200/i);
  assert.match(migration, /can_interact_in_chat\s*\(\s*p_chat_id\s*\)/i);
  assert.match(migration, /message\.id\s*=\s*any\(p_message_ids\)/i);
  assert.match(data, /p_message_ids:\s*visibleIds/);
});

test("read receipt visibility honours opt-out and blocks", () => {
  const visibility = functionBlock(migration, "wisp_private.can_view_message_receipt");
  assert.match(visibility, /show_read_receipts\s*=\s*true/i);
  assert.match(visibility, /shared_receipt\.shared_at\s+is\s+not\s+null/i);
  assert.match(visibility, /can_view_profile\s*\(\s*p_receipt_user_id\s*\)/i);
  assert.match(migration, /create\s+policy\s+wisp_message_receipts_select_visible[\s\S]*?can_view_message_receipt/i);
  for (const table of ["wisp_messages", "wisp_message_receipts"]) {
    assert.match(migration, new RegExp(`alter\\s+publication\\s+supabase_realtime[\\s\\S]*?drop\\s+table\\s+public\\.${table}`, "i"));
  }
  assert.match(migration, /create\s+policy\s+wisp_chat_receive[\s\S]*?can_receive_chat_topic/i);
  assert.match(migration, /create\s+trigger\s+wisp_messages_broadcast_refresh/i);
  assert.match(migration, /realtime\.send\s*\(\s*'\{\}'::jsonb\s*,\s*'refresh'/i);
  assert.match(migration, /marked_count\s*>\s*0\s+and\s+share_receipts\s+is\s+true/i);
  assert.doesNotMatch(migration, /\^wisp-chat:[^']*'[\s\S]{0,500}for\s+insert/i);
});

test("chat summaries keep unread totals exact and fetch one latest row per inbox chat", () => {
  const unread = functionBlock(migration, "public.wisp_list_unread_counts");
  const summaries = functionBlock(migration, "public.wisp_list_chat_summaries");
  assert.match(unread, /security\s+invoker/i);
  assert.match(unread, /wisp_chat_members/i);
  assert.match(unread, /wisp_message_receipts/i);
  assert.match(unread, /can_interact_in_chat\s*\(\s*message\.chat_id\s*\)/i);
  assert.match(unread, /sender_id\s*<>\s*\(\s*select\s+auth\.uid\s*\(\s*\)\s*\)/i);
  assert.match(config, /listUnreadCounts\s*:\s*["']wisp_list_unread_counts["']/);
  assert.match(config, /listChatSummaries\s*:\s*["']wisp_list_chat_summaries["']/);
  assert.match(summaries, /security\s+invoker/i);
  assert.match(summaries, /left\s+join\s+lateral[\s\S]*?order\s+by\s+message\.created_at\s+desc[\s\S]*?limit\s+1/i);
  assert.match(summaries, /wisp_message_receipts/i);
  assert.match(summaries, /p_before_activity_at\s+timestamptz/i);
  assert.match(summaries, /p_before_chat_id\s+uuid/i);
  assert.match(summaries, /p_limit\s+integer/i);
  assert.match(summaries, /activity_at\s*<\s*p_before_activity_at[\s\S]*?chat_id\s*<\s*p_before_chat_id/i);
  assert.match(summaries, /order\s+by\s+inbox_page\.activity_at\s+desc\s*,\s*inbox_page\.chat_id\s+desc/i);
  assert.match(summaries, /limit\s+least\([\s\S]*?100\)\s*\+\s*1/i);
  assert.doesNotMatch(summaries, /limit\s+100\s*;/i,
    "the inbox RPC must paginate instead of silently truncating the account at 100 chats");
  assert.match(data, /rpc\(WISP_RPCS\.listChatSummaries\s*,/);
  assert.match(data, /p_before_activity_at:\s*cursor\?\.activityAt\s*\|\|\s*null/);
  assert.match(data, /p_before_chat_id:\s*cursor\?\.chatId\s*\|\|\s*null/);
  assert.match(data, /validSummaries\.length\s*>\s*limit/);
  assert.match(data, /nextCursor\s*=\s*hasMore/);
  assert.doesNotMatch(data, /limit\(Math\.min\(1000,\s*chatIds\.length\s*\*\s*20\)\)/);
  assert.match(home, /chat\.unreadCount/);
  assert.match(home, /className\s*=\s*["']unread-badge["']/);
  assert.match(home, /loadChatWindow\(Math\.max\(INBOX_PAGE_SIZE,\s*allChats\.length\)\)/,
    "polling must refresh the whole inbox window the user has already loaded");
  assert.match(home, /loadNextVisiblePage\(cursor\)/);
  assert.match(home, /loadMoreButton\.addEventListener\(["']click["']/);
  assert.match(home, /seenCursors\.has\(key\)/,
    "a malformed or stale cursor must not create an infinite pagination loop");
  assert.match(homePage, /id=["']load-more-chats["'][^>]*hidden/);
  assert.match(homePage, /id=["']inbox-pagination-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/);
  assert.match(homePage, /id=["']chat-search-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/);
  assert.match(home, /matchingChats\.length[\s\S]{0,180}?matching[\s\S]{0,100}?conversation/,
    "Conversation search should announce an exact result count.");
  assert.match(home, /scheduleDateBoundaryRefresh[\s\S]{0,300}?setHours\(24,\s*0,\s*0,\s*50\)/,
    "Today timestamps must be rerendered after the local date changes.");
  assert.match(screenStyles, /\.inbox-pagination[\s\S]*?env\(safe-area-inset-bottom/);
  assert.match(screenStyles, /\.inbox-pagination\s+\.btn\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(screenStyles, /\.list-row-sub\s*\{[^}]*min-width:\s*0/);
  assert.match(screenStyles, /\.list-row-preview\s*\{[^}]*flex:\s*1[^}]*min-width:\s*0/);
  assert.match(home, /setInterval\([\s\S]*?scheduleLoad\(\)[\s\S]*?30_000/);
  assert.doesNotMatch(home, /postgres_changes|WISP_TABLES\.messageReceipts/);
});

test("chat UI supports receipts, sender deletion, drafts, keyboard send, and non-jumping updates", () => {
  assert.match(config, /deleteMessage\s*:\s*["']wisp_delete_message["']/);
  assert.match(config, /markChatRead\s*:\s*["']wisp_mark_chat_read["']/);
  assert.match(data, /export\s+async\s+function\s+deleteMessage/);
  assert.match(data, /export\s+async\s+function\s+markChatRead/);
  assert.match(data, /WISP_TABLES\.messageReceipts/);
  assert.match(data, /channel\(`wisp-chat:\$\{chatId\}`[\s\S]*?private:\s*true/);
  assert.match(data, /["']broadcast["'][\s\S]*?event:\s*["']refresh["']/);
  assert.doesNotMatch(data, /postgres_changes|\.send\s*\(/,
    "private chat clients receive opaque server hints and never publish database events.");

  assert.match(chat, /message\.read_at\s*\?\s*["']Read["']\s*:\s*["']Sent["']/);
  assert.match(chat, /data-delete-message|dataset\.deleteMessage/);
  assert.match(chat, /window\.confirm\s*\(/);
  assert.match(chat, /sessionStorage\.setItem\s*\(draftKey/);
  assert.match(chat, /sessionStorage\.removeItem\s*\(draftKey/);
  assert.doesNotMatch(chat, /localStorage/);
  assert.match(chat, /event\.key\s*!==\s*["']Enter["']/);
  assert.match(chat, /event\.shiftKey/);
  assert.match(chat, /isNearBottom\s*\(\)/);
  assert.match(chat, /newMessagesButton\.hidden/);
  assert.match(chat, /reloadMessages\([^)]*\)\.then\(\(\)\s*=>\s*refreshKnownMessages\(/);
  assert.match(chat, /setInterval\([\s\S]*?15_000/);
  assert.match(chat, /canUpdateMessagesInPlace/);
  assert.doesNotMatch(chat, /\.innerHTML\s*=|insertAdjacentHTML\s*\(/);

  assert.match(chatPage, /role=["']log["']/);
  assert.match(chatStyles, /\.new-messages-btn/);
  assert.match(chatStyles, /\.bubble-delete-btn/);
  assert.match(chatStyles, /\.chat-connection-status/);
});

test("message history uses stable pagination and marks only visible rows read", () => {
  assert.match(config, /messagePage\s*:\s*50/);
  assert.match(data, /order\(["']created_at["'],\s*\{\s*ascending:\s*false\s*\}\)[\s\S]*?order\(["']id["'],\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(data, /created_at\.lt\.\$\{beforeCreatedAt\}[\s\S]*?created_at\.eq\.\$\{beforeCreatedAt\}[\s\S]*?id\.lt\.\$\{before\.id\}/);
  assert.doesNotMatch(data, /beforeDate\.toISOString/);
  assert.match(chat, /loadOlderButton[\s\S]*?Load earlier messages/);
  assert.match(chat, /prependEarlierMessages/);
  assert.match(chat, /function\s+visiblePeerMessageIds/);
  assert.match(chat, /getBoundingClientRect\(\)/);
  assert.match(chat, /document\.visibilityState\s*!==\s*["']visible["']/);
  assert.match(chat, /overlay\.classList\.contains\(["']is-visible["']\)/,
    "Messages hidden behind the call dialog must not be marked read.");
  assert.match(chat, /closeOverlay[\s\S]*?markVisibleMessagesRead/,
    "Visible messages should be reconsidered only after the call dialog closes.");
  assert.doesNotMatch(chat, /markChatRead\(chatId,\s*olderPage\.map/);
  assert.match(chat, /paginationStatus\.textContent/);
  assert.match(chatPage, /id=["']chat-body["'][^>]*tabindex=["']-1["']/);
  assert.match(chatStyles, /\.load-older-messages-btn[\s\S]*?color:\s*var\(--color-ink\)/);
  assert.match(chatStyles, /\.chat-main\s*\{[^}]*flex-direction:\s*column/,
    "The history pagination control must stack above the message scroller.");
});
