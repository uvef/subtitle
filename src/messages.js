/**
 * Every user-facing string the bot sends, collected in one place so
 * copy can be reviewed, translated, or customized without touching the
 * logic in handlers.js. Messages use Telegram's HTML parse mode
 * (see telegram.js), so <code>, <b>, <i>, etc. are safe to use here.
 */

export const WELCOME = `Hello! \u{1F44B}
I can find Persian subtitles for movies and TV series for you.

Send me a movie or series title (in Persian or English) to search, for example:
<code>Supergirl</code>

Then tap the matching button below the results to receive the subtitle file.`;

export const QUERY_TOO_SHORT = "Please enter at least 2 characters of a movie or series title.";

export const SEARCH_FAILED = "\u274C Something went wrong while searching. Please try again in a moment.";

/**
 * @param {string} query - Already HTML-escaped by the caller.
 */
export function noResultsForQuery(query) {
  return `No results found for \u00AB${query}\u00BB \u{1F615}
Try the English title of the movie/series, or double-check the spelling.`;
}

export const REFERENCE_EXPIRED_RESULT = "\u231B This result has expired. Please search for the title again.";
export const REFERENCE_EXPIRED_LIST = "\u231B This list has expired. Please search for the title again.";

export const DOWNLOAD_LOOKUP_FAILED =
  "\u274C Something went wrong while fetching the download link. Please try again later.";

export const NO_DOWNLOAD_LINKS = "No download link was found for this title \u{1F615}";

export const CHOOSE_SUBTITLE_VERSION = "Multiple subtitle versions were found \u2014 which one would you like?";

/**
 * @param {string} query - Already HTML-escaped by the caller.
 */
export function searchResultsHeader(query) {
  return `Search results for \u00AB${query}\u00BB \u{1F3AC}`;
}

/**
 * @param {string} query - Already HTML-escaped by the caller.
 */
export function noMoreResultsFooter(query) {
  return `More results for \u00AB${query}\u00BB \u{1F3AC}
(No further results were found)`;
}

export const SHOW_MORE_RESULTS = "Show more results \u{1F50E}";

export const PREPARING_DOWNLOAD = "\u23F3 Preparing your subtitle file...";
export const DOWNLOAD_SENT = "\u2705 Subtitle file sent.";
export const DOWNLOAD_FAILED = "\u274C Sorry, the file could not be sent. Please try again.";

export const SUBTITLE_CAPTION = "Persian subtitle \u{1F3AC}";
