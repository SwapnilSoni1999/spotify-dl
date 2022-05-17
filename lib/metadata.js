import ffmetadata from 'ffmetadata';
import fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { logSuccess } from '../util/log-helper.js';
import Constants from '../util/constants.js';
import {
  logInfo,
} from '../util/log-helper.js';

const downloadAndSaveCover = async function (uri, filename) {
  const writer = fs.createWriteStream(filename);
  const cover = await axios.default({
    method: 'GET',
    url: uri,
    responseType: 'stream',
  });
  cover.data.pipe(writer);
  // validate image is jpeg https://github.com/foxbit19/valid-jpeg/blob/master/index.js#L24
  if (!fs.readFileSync(filename).toString('hex', 0, 2) === 'ffd8') {
    throw new Error('invalid jpeg');
  }
};

const mergeMetadata = async (output, songData) => {
  const coverFileName = output.slice(0, output.length - 3) + 'jpg';
  let coverURL = songData.cover_url;
  if (!coverURL) {
    coverURL = Constants.YOUTUBE_SEARCH.GENERIC_IMAGE;
  }

  try {
    await downloadAndSaveCover(coverURL, coverFileName);
  } catch (_e) {
    // image is corrupt or not available try again
    logInfo('Album Thumbnail corrupt attempting again');
    try {
      await downloadAndSaveCover(coverURL, coverFileName);
    } catch (_e2) {
      // if it fails again just fallback to generic image
      logInfo(
        'Album Thumbnail corrupt for second time fallback to generic image',
      );
      await downloadAndSaveCover(
        Constants.YOUTUBE_SEARCH.GENERIC_IMAGE, coverFileName,
      );
    }
  }

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
  logSuccess('Metadata Merged!\n');
};

export default mergeMetadata;