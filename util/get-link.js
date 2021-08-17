'use strict';
const { promisify } = require('util');
const youtubeSearch = require('yt-search');
const {
  YOUTUBE_SEARCH: { MAX_MINUTES },
  INPUT_TYPES: { SONG },
} = require('./constants');
const stringSimilarity = require('string-similarity');
const { logInfo } = require('./log-helper');
const search = promisify(youtubeSearch);

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
  const similarity = stringSimilarity.compareTwoStrings(itemName, albumName);
  let links = [];
  // to avoid duplicate song downloads
  extraSearch = extraSearch ? ` ${extraSearch}` : '';
  if (similarity < 0.5) {
    links = await tryLink(`${itemName} - ${albumName}${extraSearch}`);
  }
  if (!links.length) {
    links = await tryLink(`${itemName} - ${artistName}${extraSearch}`);
  }
  return links;
};

module.exports = getLinks;
