'use strict';
const { promisify } = require('util');
const youtubeSearch = require('yt-search');

const search = promisify(youtubeSearch);

function buildUrl(topResult) {
  return (topResult.url.includes('https://youtube.com')) ?
    topResult.url : 'https://youtube.com' + topResult.url;
}

/**
 * This function searches youtube for given songname 
 * and returns the link of topmost result
 *
 * @param {String} songName name of song
 * @returns {Promise<String>} youtube link of music video
 */
// this roughly equates to a max of 120mb
const MAX_MINUTES = 60;
const getLinks = async songName => {
  const tryLink = async () => {
    const result = await search(songName);
    return result.videos.slice(0, 10)
      .filter(video => video.seconds < (MAX_MINUTES * 60))
      .map(video => buildUrl(video));
  };
  try {
    return await tryLink(songName);
  } catch (_) {
    try {
      return await tryLink(songName.replace('-', ' '));
    } catch (error) {
      return error;
    }
  }
};

module.exports = getLinks;
