/**
 * Worker entry point. Routes incoming HTTP requests to either the
 * Telegram webhook handler or one of the small operational endpoints
 * (/setup, /debug/*).
 */

import { handleUpdate } from "./handlers.js";
import { setWebhook, deleteWebhook } from "./telegram.js";
import { testExternalConnectivity, testTelegramConnectivity, testSubtitleApiConnectivity } from "./debug.js";

// Re-exported so it can be imported directly in tests without going
// through the full `fetch` handler.
export { handleUpdate };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/setup") {
      return handleSetupEndpoint(env, url);
    }

    if (request.method === "GET" && url.pathname.startsWith("/debug/")) {
      return handleDebugEndpoint(env, url);
    }

    if (request.method === "GET") {
      return new Response("OK - Telegram subtitle bot worker is running", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Acknowledge Telegram immediately; do the actual work in the
    // background so the webhook call never times out waiting on us.
    ctx.waitUntil(
      handleUpdate(update, env).catch((err) => {
        console.error("handleUpdate failed:", err);
      })
    );

    return new Response("OK");
  }
};

/**
 * GET /setup?token=...&webhook=https://...&mode=set|delete
 *
 * Occasional-use endpoint for registering (or removing) this Worker as
 * the bot's Telegram webhook. Protected by SETUP_TOKEN so it can't be
 * triggered by anyone who merely finds the URL.
 */
async function handleSetupEndpoint(env, url) {
  if (!isAuthorized(env, url)) {
    return new Response("Forbidden", { status: 403 });
  }

  const mode = url.searchParams.get("mode") || "set";
  if (mode === "delete") {
    return Response.json(await deleteWebhook(env));
  }

  const webhook = url.searchParams.get("webhook");
  if (!webhook) {
    return new Response("Missing ?webhook=https://your-worker.workers.dev/", { status: 400 });
  }

  return Response.json(await setWebhook(env, webhook, env.TELEGRAM_WEBHOOK_SECRET));
}

/**
 * GET /debug/{external|telegram|subtitle-api}?token=...
 *
 * Small connectivity checks, handy when diagnosing outbound-request
 * issues from the Workers runtime. Protected by SETUP_TOKEN.
 */
async function handleDebugEndpoint(env, url) {
  if (!isAuthorized(env, url)) {
    return new Response("Forbidden", { status: 403 });
  }

  const check = url.pathname.slice("/debug/".length);
  switch (check) {
    case "external":
      return Response.json(await testExternalConnectivity());
    case "telegram":
      return Response.json(await testTelegramConnectivity(env));
    case "subtitle-api":
      return Response.json(await testSubtitleApiConnectivity(env));
    default:
      return new Response("Unknown debug check", { status: 404 });
  }
}

function isAuthorized(env, url) {
  return Boolean(env.SETUP_TOKEN) && url.searchParams.get("token") === env.SETUP_TOKEN;
}
