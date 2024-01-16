import { promisify } from 'util';
import YoutubeSearch from 'yt-search';
import StringSimilarity from 'string-similarity';
import Constants from './constants.js';
import { logInfo } from './log-helper.js';
import { generateTemplateString } from './format-generators.js';

const {
  YOUTUBE_SEARCH: { MAX_MINUTES },
  INPUT_TYPES: { SONG },
} = Constants;
const search = promisify(YoutubeSearch);

/**
 * This function does the actual api calls to youtube
 *
 * @param {String} searchTerms string to search on youtube with
 * @param {String} type the type of item being searched 
 * @param {String[]} exclusionFilters exclusion texts for description, title
 * @returns {String[]} youtube links
 */
const findLinks = async (searchTerms, type, exclusionFilters) => {
  logInfo(`searching youtube with keywords "${searchTerms}"`);
  const result = await search(searchTerms);
  const isSong = Object.values(SONG).includes(type);
  return result.videos
    .filter(video =>
      !exclusionFilters ||
      !(
        exclusionFilters.some(
          exclusionFilter => video.title.includes(exclusionFilter),
        ) ||
        exclusionFilters.some(
          exclusionFilter => video.description.includes(exclusionFilter),
        )
      ),
    )
    .filter(video => (
      (!isSong || (video.seconds < (MAX_MINUTES * 60))) &&
      (video.seconds > 0)
    ))
    .slice(0, 10)
    .map(video => (video.url.includes('https://youtube.com')) ?
      video.url : 'https://youtube.com' + video.url);
};

/**
 * This function searches youtube for given songname 
 * and returns the link of topmost result
 *
 * @param {String} itemName name of song
 * @param {String} albumName name of album
 * @param {String} artistName name of artist
 * @param {String} extraSearch extra search terms
 * @param {String} type type of download being requested
 * @param {String[]} exclusionFilters exclusion texts for description, title
 * @returns {String[]} youtube links
 */
const getLinks = async ({
  itemName,
  albumName,
  artistName,
  extraSearch,
  searchFormat,
  type,
  exclusionFilters,
}) => {
  let links = [];
  if (searchFormat.length) {
    links = await findLinks(
      generateTemplateString(itemName, albumName, artistName, searchFormat),
      type,
      exclusionFilters,
    );
  }
  // custom search format failed or was never provided try the generic way
  if (!links.length) {
    const similarity = StringSimilarity.compareTwoStrings(itemName, albumName);
    // to avoid duplicate song downloads
    extraSearch = extraSearch ? ` ${extraSearch}` : '';
    if (similarity < 0.5) {
      links = await findLinks(
        `${albumName} - ${itemName}${extraSearch}`,
        type,
        exclusionFilters,
      );
    }
    if (!links.length) {
      links = await findLinks(
        `${artistName} - ${itemName}${extraSearch}`, type, exclusionFilters,
      );
    }
  }
  return links;
};

export default getLinks;
