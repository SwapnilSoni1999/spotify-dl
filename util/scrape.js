'use strict';
const cheerio = require('cheerio');
/**
 * This function scrapes the given html page(spotify page) and returns title and artist name from given page
 *
 * @param {Object} html page for spotify
 * @returns {Object} mapping title and artist name
 */
const scrape = html => {
  const $ = cheerio.load(html);

  const title = $(
    '#body > div.page > header > div.wrapper.padding-notch > div.entity.full-width > div.entity-info.media > div.media-bd > h1'
  ).text();

  const artist = $(
    '#body > div.page > header > div.wrapper.padding-notch > div.entity.full-width > div.entity-info.media > div.media-bd > h2'
  )
    .text()
    .slice(3);

  return {
    title,
    artist,
  };
};

module.exports = scrape;

