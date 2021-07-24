'use strict';
const { promisify } = require('util');
const youtubeSearch = require('yt-search');
const { YOUTUBE_SEARCH: { MAX_MINUTES } } = require('./constants');
const stringSimilarity = require('string-similarity');
const search = promisify(youtubeSearch);

function buildUrl(topResult) {
  return (topResult.url.includes('https://youtube.com')) ?
    topResult.url : 'https://youtube.com' + topResult.url;
}

/**
 * This function searches youtube for given songname 
 * and returns the link of topmost result
 *
 * @param {String} trackName name of song
 * @param {String} albumName name of album
 * @param {String} artistName name of artist
 * @param {String} extraSearch extra search terms
 * @returns {String[]} youtube links
 */
const getLinks = async ({ trackName, albumName, artistName, extraSearch }) => {
  const tryLink = async searchTerms => {
    const result = await search(searchTerms);
    return result.videos.slice(0, 10)
      .filter(video => (
        video.seconds < (MAX_MINUTES * 60)) &&
        (video.seconds > 0),
      )
      .map(video => buildUrl(video));
  };
  const similarity = stringSimilarity.compareTwoStrings(trackName, albumName);
  let links = [];
  // to avoid duplicate song downloads
  if (similarity < 0.5) {
    links = await tryLink(`${trackName} - ${albumName} ${extraSearch}`);
  }
  if (!links.length) {
    links = await tryLink(`${trackName} - ${artistName} ${extraSearch}`);
  }
  return links;
};

module.exports = getLinks;
