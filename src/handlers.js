/**
 * Update handling: turns incoming Telegram messages and callback
 * queries into bot actions (searching, presenting results, sending
 * subtitle files). This is the "application layer" — it never calls
 * `fetch` directly, delegating instead to telegram.js, kv.js and
 * scraper.js.
 */

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  sendDocumentByUrl,
  sendDocumentBytes
} from "./telegram.js";
import { putRef, getRef } from "./kv.js";
import { escapeHtml, truncate, cleanTitle, filenameOf } from "./utils.js";
import { searchMovies, getDownloadLinks } from "./scraper.js";
import * as messages from "./messages.js";

/** Maximum number of inline-keyboard buttons shown per search "page". */
const SEARCH_LIMIT = 8;

/**
 * Entry point called for every Telegram update delivered to the
 * webhook. Dispatches to the message or callback-query handler.
 *
 * @param {object} update - A Telegram Update object.
 * @param {object} env - Worker environment bindings.
 */
export async function handleUpdate(update, env) {
  if (update.message) return handleMessage(update.message, env);
  if (update.callback_query) return handleCallback(update.callback_query, env);
}

/**
 * Handle an incoming text message: either a bot command, or a search
 * query.
 */
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  if (!text) return;

  if (text === "/start" || text === "/help") {
    await sendMessage(env, chatId, messages.WELCOME);
    return;
  }
  if (text.startsWith("/")) return; // Silently ignore unknown commands.
  if (text.length < 2) {
    await sendMessage(env, chatId, messages.QUERY_TOO_SHORT);
    return;
  }

  let results;
  try {
    results = await searchMovies(env, text, { limit: SEARCH_LIMIT });
  } catch (err) {
    console.error("search failed:", err);
    await sendMessage(env, chatId, messages.SEARCH_FAILED);
    return;
  }

  if (results.length === 0) {
    await sendMessage(env, chatId, messages.noResultsForQuery(escapeHtml(text)));
    return;
  }

  const buttons = [];
  const shownUrls = [];
  for (const result of results) {
    const id = await putRef(env, { type: "movie", url: result.url, download_url: result.download_url });
    buttons.push({ text: truncate(cleanTitle(result.title), 60), callback_data: `m:${id}` });
    shownUrls.push(result.url);
  }
  if (results.length === SEARCH_LIMIT) {
    const moreId = await putRef(env, { type: "more", query: text, shown: shownUrls, buttons });
    buttons.push({ text: messages.SHOW_MORE_RESULTS, callback_data: `n:${moreId}` });
  }

  await sendMessage(env, chatId, messages.searchResultsHeader(escapeHtml(text)), {
    reply_markup: { inline_keyboard: buttons.map((button) => [button]) }
  });
}

/**
 * Handle an inline-keyboard button tap.
 */
async function handleCallback(callbackQuery, env) {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data || "";

  // Telegram requires every callback query to be acknowledged, even
  // when there's nothing meaningful to show — otherwise the tapped
  // button keeps spinning in the client.
  await answerCallbackQuery(env, callbackQuery.id);
  if (!chatId || !messageId) return;

  if (data.startsWith("m:")) {
    await handleMovieSelected(env, chatId, messageId, data.slice(2));
  } else if (data.startsWith("z:")) {
    await handleZipSelected(env, chatId, messageId, data.slice(2));
  } else if (data.startsWith("n:")) {
    await handleMoreResults(env, chatId, messageId, data.slice(2));
  }
}

/** User tapped a movie/series title button. */
async function handleMovieSelected(env, chatId, messageId, id) {
  const ref = await getRef(env, id);
  if (!ref) {
    await editMessageText(env, chatId, messageId, messages.REFERENCE_EXPIRED_RESULT);
    return;
  }

  let zipUrls;
  try {
    zipUrls = await getDownloadLinks(env, ref.url);
  } catch (err) {
    console.error("getDownloadLinks failed:", err);
    await editMessageText(env, chatId, messageId, messages.DOWNLOAD_LOOKUP_FAILED);
    return;
  }

  if (zipUrls.length === 0) {
    await editMessageText(env, chatId, messageId, messages.NO_DOWNLOAD_LINKS);
    return;
  }
  if (zipUrls.length === 1) {
    await downloadAndSend(env, chatId, messageId, zipUrls[0]);
    return;
  }

  const buttons = [];
  for (const zipUrl of zipUrls) {
    const zipId = await putRef(env, { type: "zip", url: zipUrl });
    buttons.push([{ text: truncate(filenameOf(zipUrl), 60), callback_data: `z:${zipId}` }]);
  }
  await editMessageText(env, chatId, messageId, messages.CHOOSE_SUBTITLE_VERSION, {
    reply_markup: { inline_keyboard: buttons }
  });
}

/** User tapped a specific subtitle-archive button (when there were several). */
async function handleZipSelected(env, chatId, messageId, id) {
  const ref = await getRef(env, id);
  if (!ref) {
    await editMessageText(env, chatId, messageId, messages.REFERENCE_EXPIRED_RESULT);
    return;
  }
  await downloadAndSend(env, chatId, messageId, ref.url);
}

/** User tapped "Show more results". */
async function handleMoreResults(env, chatId, messageId, id) {
  const ref = await getRef(env, id);
  if (!ref) {
    await editMessageText(env, chatId, messageId, messages.REFERENCE_EXPIRED_LIST);
    return;
  }

  const exclude = new Set(ref.shown);
  let more;
  try {
    more = await searchMovies(env, ref.query, { limit: SEARCH_LIMIT, exclude });
  } catch (err) {
    console.error("more-results search failed:", err);
    await editMessageText(env, chatId, messageId, messages.SEARCH_FAILED);
    return;
  }

  if (more.length === 0) {
    await editMessageText(env, chatId, messageId, messages.noMoreResultsFooter(escapeHtml(ref.query)), {
      reply_markup: { inline_keyboard: ref.buttons.map((button) => [button]) }
    });
    return;
  }

  const newButtons = [];
  const allShown = [...ref.shown];
  for (const result of more) {
    const movieId = await putRef(env, { type: "movie", url: result.url, download_url: result.download_url });
    newButtons.push({ text: truncate(cleanTitle(result.title), 60), callback_data: `m:${movieId}` });
    allShown.push(result.url);
  }

  const combinedButtons = [...ref.buttons, ...newButtons];
  if (more.length === SEARCH_LIMIT) {
    const moreId = await putRef(env, { type: "more", query: ref.query, shown: allShown, buttons: combinedButtons });
    combinedButtons.push({ text: messages.SHOW_MORE_RESULTS, callback_data: `n:${moreId}` });
  }

  await editMessageText(env, chatId, messageId, messages.searchResultsHeader(escapeHtml(ref.query)), {
    reply_markup: { inline_keyboard: combinedButtons.map((button) => [button]) }
  });
}

/**
 * Send a subtitle archive to the chat, preferring the cheap "by URL"
 * path and falling back to downloading + re-uploading the bytes if
 * Telegram can't fetch the URL itself.
 */
async function downloadAndSend(env, chatId, messageId, zipUrl) {
  await editMessageText(env, chatId, messageId, messages.PREPARING_DOWNLOAD);

  let result = await sendDocumentByUrl(env, chatId, zipUrl, messages.SUBTITLE_CAPTION);
  if (result.ok) {
    await editMessageText(env, chatId, messageId, messages.DOWNLOAD_SENT);
    return;
  }

  try {
    const fileResponse = await fetch(zipUrl);
    if (!fileResponse.ok) throw new Error(`Upstream fetch failed with HTTP ${fileResponse.status}`);
    const buffer = await fileResponse.arrayBuffer();
    result = await sendDocumentBytes(env, chatId, filenameOf(zipUrl), buffer, messages.SUBTITLE_CAPTION);
  } catch (err) {
    console.error("fallback download/upload failed:", err);
    await editMessageText(env, chatId, messageId, messages.DOWNLOAD_FAILED);
    return;
  }

  await editMessageText(env, chatId, messageId, result.ok ? messages.DOWNLOAD_SENT : messages.DOWNLOAD_FAILED);
}
