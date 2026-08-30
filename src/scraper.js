/**
 * Client for the external "subtitle search" HTTP API this bot relies
 * on to actually find and resolve subtitles. That service is NOT part
 * of this repository — it's expected to be a separate scraper/API you
 * deploy yourself and point the bot at via the SUBTITLE_API_URL
 * environment variable. See the README's "Companion Search API"
 * section for the exact contract this client expects.
 */

const DEFAULT_SEARCH_LIMIT = 8;

/**
 * @typedef {object} MovieResult
 * @property {string} title - Raw title as returned by the search API
 *   (typically Persian-language, since it's scraped from a Persian
 *   subtitle site).
 * @property {string} url - Canonical page URL for the movie/series.
 * @property {string} [download_url] - Optional direct download URL, if
 *   the search API is able to resolve it eagerly.
 */

/**
 * Search the companion API for subtitle results matching `query`.
 *
 * @param {object} env - Worker environment bindings (needs SUBTITLE_API_URL).
 * @param {string} query - Free-text search query (movie/series name).
 * @param {object} [options]
 * @param {number} [options.limit=8] - Maximum number of results to return.
 * @param {Set<string>} [options.exclude] - Result URLs to filter out,
 *   used to implement the "show more results" pagination button.
 * @returns {Promise<MovieResult[]>}
 */
export async function searchMovies(env, query, { limit = DEFAULT_SEARCH_LIMIT, exclude = null } = {}) {
  try {
    // When paginating ("show more"), the companion API has no concept
    // of page numbers/offsets — it always returns its top N matches for
    // a query. To surface genuinely new results we ask for a deeper
    // slice (enough to cover everything already shown, plus a fresh
    // page) and then filter out what the user has already seen.
    const requestLimit = exclude ? exclude.size + limit : limit;

    const apiUrl = buildApiUrl(env, "/search", {
      query,
      language: "per",
      limit: String(requestLimit)
    });

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "SubtitleBot/1.0" }
    });

    if (!response.ok) {
      console.error("Search API error:", response.status, await safeText(response));
      return [];
    }

    const data = await response.json();
    let results = data.results || [];
    if (exclude) {
      results = results.filter((result) => !exclude.has(result.url));
    }
    return results.slice(0, limit);
  } catch (err) {
    console.error("searchMovies failed:", err);
    return [];
  }
}

/**
 * Resolve the downloadable subtitle archive URL(s) for a given
 * movie/series page URL.
 *
 * @param {object} env - Worker environment bindings (needs SUBTITLE_API_URL).
 * @param {string} movieUrl - The canonical page URL returned by `searchMovies`.
 * @returns {Promise<string[]>} A list of direct `.zip` download URLs.
 */
export async function getDownloadLinks(env, movieUrl) {
  try {
    const apiUrl = buildApiUrl(env, "/download", { url: movieUrl });
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "SubtitleBot/1.0" }
    });

    if (!response.ok) {
      console.error("Download API error:", response.status, await safeText(response));
      return [];
    }

    const data = await response.json();
    return data.urls || [];
  } catch (err) {
    console.error("getDownloadLinks failed:", err);
    return [];
  }
}

function buildApiUrl(env, path, params) {
  if (!env.SUBTITLE_API_URL) {
    throw new Error("SUBTITLE_API_URL is not configured. See the README for setup instructions.");
  }
  const url = new URL(path, env.SUBTITLE_API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return "<unreadable response body>";
  }
}
