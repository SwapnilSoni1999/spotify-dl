'use strict';
const ffmetadata = require('ffmetadata');
const fs = require('fs');
const axios = require('axios').default;
const ffmpeg = require('fluent-ffmpeg');

const downloadAndSaveCover = async function (uri, filename) {
  const writer = fs.createWriteStream(filename);
  const cover = await axios({
    method: 'GET',
    url: uri,
    responseType: 'stream',
  });
  cover.data.pipe(writer);
};

const mergeMetadata = async (output, songData, spinner) => {
  const coverFileName = output.slice(0, output.length - 3) + 'jpg';

  await downloadAndSaveCover(songData.cover_url, coverFileName);
  const metadata = {
    artist: songData.artists,
    album: songData.album_name,
    title: songData.name,
    date: songData.release_date,
    attachments: [coverFileName],
  };

  await new Promise((resolve, reject) => {
    ffmetadata
      .write(output, metadata, {},
        function (err) {
          if (err) {
            reject(err);
          }
          else {
            resolve();
          }
        },
      );
  });

  const tempPath = output.slice(0, output.length - 3) + 'temp.mp3';
  await new Promise((resolve, reject) => {
    ffmpeg()
      .on('error', err => {
        reject(err);
      })
      .on('end', () => {
        resolve();
      })
      .input(output)
      .addOutputOptions(
        '-i',
        coverFileName,
        '-map',
        '0:0',
        '-map',
        '1:0',
        '-c',
        'copy',
        '-id3v2_version',
        '3',
      )
      .save(tempPath);
  });
  fs.unlinkSync(output);
  fs.renameSync(tempPath, output);
  fs.unlinkSync(coverFileName);
  spinner.succeed('Metadata Merged!');
};

module.exports = mergeMetadata;