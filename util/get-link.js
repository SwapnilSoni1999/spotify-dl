import { promisify } from 'util';
import YoutubeSearch from 'yt-search';
import StringSimilarity from 'string-similarity';
import Constants from './constants.js';
import { logInfo } from './log-helper.js';

const {
  YOUTUBE_SEARCH: { MAX_MINUTES, VALID_CONTEXTS },
  INPUT_TYPES: { SONG },
} = Constants;
const search = promisify(YoutubeSearch);

function buildUrl(topResult) {
  return (topResult.url.includes('https://youtube.com')) ?
    topResult.url : 'https://youtube.com' + topResult.url;
}

/**
 * This function searches youtube for given songname 
 * and returns the link of topmost result
 *
 * @param {String} itemName name of song
 * @param {String} albumName name of album
 * @param {String} artistName name of artist
 * @param {String} extraSearch extra search terms
 * @param {String} type type of download being requested
 * @returns {String[]} youtube links
 */
const getLinks = async ({
  itemName,
  albumName,
  artistName,
  extraSearch,
  searchFormat,
  type,
}) => {
  const tryLink = async searchTerms => {
    logInfo(`searching youtube with keywords "${searchTerms}"`);
    const result = await search(searchTerms);
    const isSong = Object.values(SONG).includes(type);
    return result.videos.slice(0, 10)
      .filter(video => ((!isSong || (video.seconds < (MAX_MINUTES * 60))) &&
        (video.seconds > 0)),
      ).map(video => buildUrl(video));
  };
  let links = [];

  if (searchFormat.length) {
    const contexts = searchFormat.match(/(?<=\{).+?(?=\})/g);
    const invalidContexts = contexts.filter(
      context => !VALID_CONTEXTS.includes(context),
    );
    if (invalidContexts.length > 0 || !contexts.length) {
      throw new Error(`Invalid search contexts: ${invalidContexts}`);
    }

    contexts.forEach(context =>
      searchFormat = searchFormat.replace(`{${context}}`, eval(context)),
    );
    links = await tryLink(searchFormat);
  }
  if (!links.length) {
    const similarity = StringSimilarity.compareTwoStrings(itemName, albumName);
    // to avoid duplicate song downloads
    extraSearch = extraSearch ? ` ${extraSearch}` : '';
    if (similarity < 0.5) {
      links = await tryLink(`${albumName} - ${itemName}${extraSearch}`);
    }
    if (!links.length) {
      links = await tryLink(`${artistName} - ${itemName}${extraSearch}`);
    }
  }
  return links;
};

export default getLinks;
