import NodeID3 from 'node-id3';
import fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { logSuccess } from '../util/log-helper.js';
import Constants from '../util/constants.js';
import {
  logInfo,
} from '../util/log-helper.js';
const downloadAndSaveCover = function (uri, filename) {
  return new Promise(async (resolve, reject) => {
    const cover = await axios.default({
      method: 'GET',
      url: uri,
      responseType: 'stream',
    });
    const ffmpegCommand = ffmpeg();
    ffmpegCommand
      .on('error', e => {
        reject(e);
      })
      .on('end', () => {
        resolve();
      })
      .input(cover.data)
      .save(`${filename}`)
      .format('jpg');
  });
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
    }
  }

  if (!fs.existsSync(coverFileName)) {
    await downloadAndSaveCover(
      'https://i.ibb.co/PN87XDk/unknown.jpg',
      coverFileName,
    );
  }
  const date_splits = songData.release_date.split('-');
  const metadata = {
    artist: songData.artists[0],
    originalArtist: songData.artists[0],
    albumArtist: songData.artists.join('/'),
    composer: songData.artists[0],
    performerInfo: songData.artists.join('/'),
    author: songData.artists[0],
    album: songData.album_name,
    title: songData.name,
    bpm: songData.bpm.toString(),
    year: date_splits[0],
    date: `${date_splits[2]}${date_splits[1]}`,
    trackNumber: `${songData.track_number}/${songData.total_tracks}`,
    popularimeter: {
      email: 'mail@example.com',
      rating: (
        songData.popularity * Constants.FFMPEG.RATING_CONSTANT
      ).toString(),
      counter: 0,
    },
    APIC: coverFileName,
    unsynchronisedLyrics: {
      language: 'eng',
      text: songData.lyrics,
    },
  };

  console.log(metadata);

  NodeID3.update(metadata, output);
  fs.unlinkSync(coverFileName);
  logSuccess('Metadata Merged!\n');
};

export default mergeMetadata;
