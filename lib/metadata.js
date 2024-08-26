import NodeID3 from 'node-id3';
import fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { logSuccess } from '../util/log-helper.js';
import Constants from '../util/constants.js';
import { logInfo } from '../util/log-helper.js';
import { splitDates } from '../util/filters.js';
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
  if (coverURL) {
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
  }

  if (!fs.existsSync(coverFileName)) {
    fs.copyFileSync(Constants.YOUTUBE_SEARCH.GENERIC_IMAGE, coverFileName);
  }

  const dateSplits = splitDates(songData.release_date);
  const firstArtist =
    songData.artists && songData.artists.length > 0 ? songData.artists[0] : '';
  const metadata = {
    artist: firstArtist,
    originalArtist: firstArtist,
    albumArtist: songData.artists.join('/'),
    composer: firstArtist,
    performerInfo: songData.artists.join('/'),
    author: firstArtist,
    album: songData.album_name,
    title: songData.name,
    bpm: songData.bpm ? songData.bpm.toString() : undefined,
    year: dateSplits.year,
    date: `${dateSplits.day}${dateSplits.month}`,
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

  NodeID3.update(metadata, output);
  fs.unlinkSync(coverFileName);
  logSuccess('Metadata Merged!\n');
};

export default mergeMetadata;
