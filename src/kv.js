/**
 * Thin wrapper around the Workers KV binding used to store short-lived
 * "references" — movie URLs, subtitle archive URLs, pagination state —
 * that are too large (or too sensitive) to fit inside Telegram's
 * 64-byte `callback_data` field. Each reference is stored under a
 * random short id and expires automatically after TTL_SECONDS.
 */

import { shortId } from "./utils.js";

/** How long a stored reference stays valid, in seconds (30 minutes). */
export const TTL_SECONDS = 30 * 60;

/**
 * Store an arbitrary JSON-serializable value in KV and return the short
 * id it was stored under. Use this id as (part of) an inline keyboard
 * button's `callback_data`.
 *
 * @param {object} env - Worker environment bindings (needs SUBS_KV).
 * @param {object} value - The value to store.
 * @returns {Promise<string>} The generated reference id.
 */
export async function putRef(env, value) {
  const id = shortId(12);
  await env.SUBS_KV.put(`ref:${id}`, JSON.stringify(value), {
    expirationTtl: TTL_SECONDS
  });
  return id;
}

/**
 * Retrieve a previously stored reference by id.
 *
 * @param {object} env - Worker environment bindings (needs SUBS_KV).
 * @param {string} id - The reference id returned by `putRef`.
 * @returns {Promise<object|null>} The stored value, or `null` if it has
 *   expired, was never created, or failed to parse.
 */
export async function getRef(env, id) {
  const raw = await env.SUBS_KV.get(`ref:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
