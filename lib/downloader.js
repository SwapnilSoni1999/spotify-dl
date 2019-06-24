'use strict';
const ytdl = require('ytdl-core');
const options = require('../config');
const ffmpeg = require('fluent-ffmpeg');
/**
 * This function downloads the given youtube video in best audio format as mp3 file
 *
 * @param {*} youtubeLink link of youtube video
 * @param {*} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 * @param {function} callback callback after work finishes
 */
const downloader = (youtubeLink, output, spinner, callback) => {
  const download = ytdl(youtubeLink, options);

  ffmpeg(download)
    .audioBitrate(256)
    .save(`${output}`)
    .on('progress', (p) => {
      spinner.text = `${(p.targetSize / 1024).toFixed(2)}MB Downloaded...`;
    })
    .on('end', () => {
      spinner.succeed('Download completed.');
      if (typeof callback === "function") callback();
    });
};

module.exports = downloader;
