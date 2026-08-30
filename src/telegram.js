/**
 * Minimal wrapper around the subset of the Telegram Bot API this project
 * uses. Every exported function mirrors a single Bot API method — see
 * https://core.telegram.org/bots/api for the full reference.
 */

/**
 * Build a fully-qualified Bot API URL for the given method.
 *
 * @param {string} token - The bot token issued by @BotFather.
 * @param {string} method - Bot API method name, e.g. "sendMessage".
 * @returns {string}
 */
function apiUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

/**
 * Perform a JSON POST call against a Bot API method.
 *
 * @param {object} env - Worker environment bindings (needs TELEGRAM_BOT_TOKEN).
 * @param {string} method - Bot API method name.
 * @param {object} payload - JSON body to send.
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl=fetch] - Overridable fetch
 *   implementation, useful for unit tests.
 * @returns {Promise<{ok: boolean, [key: string]: unknown}>}
 */
async function call(env, method, payload, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(apiUrl(env.TELEGRAM_BOT_TOKEN, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  try {
    return await response.json();
  } catch {
    return { ok: false, description: `Non-JSON response (HTTP ${response.status})` };
  }
}

/**
 * Send a text message to a chat, using HTML parse mode by default.
 * https://core.telegram.org/bots/api#sendmessage
 */
export function sendMessage(env, chatId, text, extra = {}, opts) {
  return call(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra }, opts);
}

/**
 * Edit the text (and optionally the inline keyboard) of an existing
 * message.
 * https://core.telegram.org/bots/api#editmessagetext
 */
export function editMessageText(env, chatId, messageId, text, extra = {}, opts) {
  return call(
    env,
    "editMessageText",
    { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...extra },
    opts
  );
}

/**
 * Acknowledge an inline-keyboard button tap. Telegram expects this to
 * be called within a few seconds of every callback query, even when
 * there is nothing to show the user — otherwise the button spins
 * forever in the client.
 * https://core.telegram.org/bots/api#answercallbackquery
 */
export function answerCallbackQuery(env, callbackQueryId, text = "", extra = {}, opts) {
  return call(env, "answerCallbackQuery", { callback_query_id: callbackQueryId, text, ...extra }, opts);
}

/**
 * Ask Telegram to fetch and forward a document from a public URL. This
 * is the cheap path: Telegram's own servers perform the download, so
 * the Worker never has to buffer the file itself.
 * https://core.telegram.org/bots/api#senddocument
 */
export function sendDocumentByUrl(env, chatId, url, caption, opts) {
  return call(env, "sendDocument", { chat_id: chatId, document: url, caption }, opts);
}

/**
 * Upload a document as raw bytes via multipart/form-data. Used as a
 * fallback when Telegram is unable to fetch a URL directly (for
 * example, because the source host blocks Telegram's crawler).
 * https://core.telegram.org/bots/api#senddocument
 *
 * @param {object} env - Worker environment bindings.
 * @param {number|string} chatId
 * @param {string} filename
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} [caption]
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl=fetch]
 */
export async function sendDocumentBytes(env, chatId, filename, arrayBuffer, caption, { fetchImpl = fetch } = {}) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([arrayBuffer], { type: "application/zip" }), filename);

  const response = await fetchImpl(apiUrl(env.TELEGRAM_BOT_TOKEN, "sendDocument"), {
    method: "POST",
    body: form
  });

  try {
    return await response.json();
  } catch {
    return { ok: false, description: `Non-JSON response (HTTP ${response.status})` };
  }
}

/**
 * Register this Worker's public URL as the bot's webhook.
 * https://core.telegram.org/bots/api#setwebhook
 */
export function setWebhook(env, url, secretToken, opts) {
  return call(
    env,
    "setWebhook",
    { url, secret_token: secretToken, allowed_updates: ["message", "callback_query"] },
    opts
  );
}

/**
 * Remove the currently configured webhook (useful when switching to
 * long polling for local development, or decommissioning a deployment).
 * https://core.telegram.org/bots/api#deletewebhook
 */
export function deleteWebhook(env, opts) {
  return call(env, "deleteWebhook", {}, opts);
}
