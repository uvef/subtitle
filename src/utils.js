/**
 * Small, dependency-free helper functions shared across the project.
 * Nothing in this file touches the network, KV, or the Telegram API —
 * that separation is what makes these functions easy to unit test
 * (see tests/utils.test.js).
 */

/**
 * Escape the characters that are meaningful in Telegram's HTML parse
 * mode, so arbitrary text (search queries, titles, etc.) can be safely
 * embedded inside an HTML-formatted message without breaking formatting
 * or allowing tag injection.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Truncate a string to at most `max` characters, appending an ellipsis
 * when truncation occurs. Telegram inline keyboard button text has a
 * hard 64-character limit, so this is mainly used to keep button
 * labels within bounds.
 *
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str, max) {
  if (!str) return str;
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}\u2026` : str;
}

/**
 * Strip the repetitive "Download Persian subtitle for <Movie/Series/
 * Anime>" prefix that the source website prepends to every result
 * title, so inline button labels show only the actual title.
 *
 * NOTE: this regular expression intentionally matches the *Persian*
 * prefix text, not an English translation of it. It has to match what
 * the scraped website actually returns, which is Persian-language
 * markup — translating the pattern itself would silently break title
 * cleanup. See the README's "Companion Search API" section for more
 * context on the external service this bot depends on.
 *
 * @param {string} title
 * @returns {string}
 */
export function cleanTitle(title) {
  if (!title) return title;
  const cleaned = title
    .replace(/^\u062F\u0627\u0646\u0644\u0648\u062F\s+\u0632\u06CC\u0631\u0646\u0648\u06CC\u0633\s+\u0641\u0627\u0631\u0633\u06CC\s*(\u0641\u06CC\u0644\u0645|\u0633\u0631\u06CC\u0627\u0644|\u0627\u0646\u06CC\u0645\u06CC\u0634\u0646)?\s*/u, "")
    .trim();
  return cleaned || title;
}

/**
 * Extract a readable file name from a URL's path, decoding any
 * percent-encoded characters. Falls back to naive slash-splitting if
 * the input isn't a well-formed URL.
 *
 * @param {string} url
 * @returns {string}
 */
export function filenameOf(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || url);
  } catch {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1] || url;
  }
}

/**
 * Generate a short, URL-safe random hex identifier using the Web Crypto
 * API available in the Workers runtime. Used as the KV key suffix for
 * cached references (see src/kv.js) so Telegram's 64-byte
 * `callback_data` limit is never a concern.
 *
 * @param {number} len - Desired identifier length, in hex characters.
 * @returns {string}
 */
export function shortId(len = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, len);
}
