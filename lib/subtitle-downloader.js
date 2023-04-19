import fs from 'fs';
import Genius from 'genius-lyrics';
import {
  logInfo,
} from '../util/log-helper.js';

const downloadSubtitles = async (itemName, artistName, output) => {
  const Client = new Genius.Client();
  const term = `${itemName} - ${artistName}`;
  let searches;
  try {
    searches = await Client.songs.search(term);
  } catch (e) {
    logInfo(e.message);
  }
  if (searches || searches.length) {
    const firstSong = searches[0];
    const lyrics = await firstSong.lyrics();
    logInfo(`lyrics downloading for ${term}`);

    fs.writeFileSync(output, lyrics);
  } else {
    logInfo(`No lyrics found for ${term}`);
  }
};

export default downloadSubtitles;
