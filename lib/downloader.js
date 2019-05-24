'use strict';
const fs = require('fs');
const ytdl = require('ytdl-core');
const options = require('./../config');
const playlistDownload = require('../util/playlist-download');
console.log(playlistDownload);

/**
 * This function downloads the given youtube video in best audio format as mp3 file
 *
 * @param {*} youtubeLink link of youtube video
 * @param {*} output path/name of file to be downloaded(songname.mp3)
 * @param {*} spinner ora spinner to show download progress
 */
const downloader = async (youtubeLink, output, spinner, trackList, trackCounter) => {
  spinner.start('Processing...');

  const download = ytdl(youtubeLink, options);

  download.pipe(fs.createWriteStream(output));
  download.on('progress', (chunkLength, downloaded, total) => {
    spinner.text = `Downloading ${(downloaded / 1024 / 1024).toFixed(
      2
    )}MB of ${(total / 1024 / 1024).toFixed(2)}MB\n`;
  });

  download.on('end', () => {
    spinner.succeed('Download completed');
    if(trackList != 'undefined') {
      if(trackCounter < --trackList.length) {
        trackCounter++;
        playlistDownload(trackList, trackCounter, spinner);
      }
    }
  });
};

module.exports = downloader;
