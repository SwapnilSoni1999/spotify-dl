import Genius from 'genius-lyrics';
import {
  logInfo,
} from '../util/log-helper.js';

const downloadSubtitles = async (itemName, artistName) => {
  const Client = new Genius.Client();
  const term = `${itemName} - ${artistName}`;
  let searches;
  try {
    logInfo(`lyrics downloading for ${term}`);
    searches = await Client.songs.search(term);
  } catch (e) {
    logInfo(e.message);
  }
  let lyrics = '';
  if (searches || searches.length) {
    const firstSong = searches[0];
    lyrics = (await firstSong.lyrics()).trim();
  } else {
    logInfo(`No lyrics found for ${term}`);
  }

  return lyrics;
};

export default downloadSubtitles;
