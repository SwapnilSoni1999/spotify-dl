'use strict';
const { promisify } = require('util');
const youtubeSearch = require('yt-search');

const search = promisify(youtubeSearch);

function buildUrl(topResult) {
  return topResult.url.includes('https://youtube.com')
    ? topResult.url
    : 'https://youtube.com' + topResult.url;
}

/**
 * This function searches youtube for given songname and returns the link of topmost result
 *
 * @param {String} songName name of song
 * @returns {Promise<String>} youtube link of music video
 */
const getLink = async songName => {
  try {
    const result = await search(songName);

    const [topResult] = result.videos;

    const youtubeLink = buildUrl(topResult);

    return youtubeLink;
  } catch (_) {
    try {
      const result = await search(songName.replace('-', ' '));

      const [topResult] = result.videos;

      const youtubeLink = buildUrl(topResult);

      return youtubeLink;
    } catch (error) {
      return error;
    }
  }
};

module.exports = getLink;
