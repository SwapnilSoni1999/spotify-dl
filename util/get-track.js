'use strict';
const axios = require('axios');
const scrape = require('./scrape');

/**
 * This function takes spotify link and returns the title and artist name of song
 * from given spotify link
 *
 * @param {String} url spotify track url
 * @returns {Object} mapping title and artist
 */
const trackinfo = async url => {
  try {
    const response = await axios(url);
    const html = response.data;

    return scrape(html);
  } catch (error) {
    return error;
  }
};

module.exports = trackinfo;
