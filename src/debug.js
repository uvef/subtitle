/**
 * Lightweight outbound-connectivity checks used while developing or
 * troubleshooting a deployment. Cloudflare Workers occasionally has
 * different egress behavior than a local machine, so these are handy
 * for confirming the Worker can actually reach the services it depends
 * on. Routed and access-controlled from src/index.js — never exposed
 * without a valid SETUP_TOKEN.
 */

/**
 * Check that the Worker can make an arbitrary outbound HTTPS request.
 */
export async function testExternalConnectivity() {
  try {
    const res = await fetch("https://httpbin.org/get", {
      method: "GET",
      headers: { "User-Agent": "SubtitleBot/1.0" }
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Check that the configured bot token is valid and the Worker can
 * reach the Telegram Bot API.
 */
export async function testTelegramConnectivity(env) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`, {
      method: "GET",
      headers: { "User-Agent": "SubtitleBot/1.0" }
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Check that the Worker can reach the configured companion subtitle
 * search API.
 */
export async function testSubtitleApiConnectivity(env) {
  if (!env.SUBTITLE_API_URL) {
    return { ok: false, error: "SUBTITLE_API_URL is not configured" };
  }
  try {
    const res = await fetch(env.SUBTITLE_API_URL, {
      method: "GET",
      headers: { "User-Agent": "SubtitleBot/1.0" }
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
