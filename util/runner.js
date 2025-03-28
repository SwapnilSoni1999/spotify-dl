import path from 'path';
import fs from 'fs';

import downloader from '../lib/downloader.js';
import { writeId, findId } from '../lib/cache.js';
import mergeMetadata from '../lib/metadata.js';
import { cliInputs } from '../lib/setup.js';
import downloadSubtitles from '../lib/subtitle-downloader.js';

import getLinks from './get-link.js';
import { cleanOutputPath } from './filters.js';
import Constants from './constants.js';
import {
  getTrack,
  getPlaylist,
  getArtistAlbums,
  getEpisode,
  getShowEpisodes,
  getSavedShows,
  getSavedAlbums,
  getSavedPlaylists,
  getSavedTracks,
  getAlbum,
} from './get-songdata.js';
import { logSuccess, logInfo, logFailure } from './log-helper.js';
import { generateTemplateString } from './format-generators.js';

const {
  INPUT_TYPES,
  YOUTUBE_SEARCH: { GENERIC_IMAGE },
} = Constants;
const {
  inputs,
  extraSearch,
  output,
  outputOnly,
  downloadReport,
  downloadLyrics,
  searchFormat,
  exclusionFilters,
  outputFormat,
  outputFileType,
} = cliInputs();

const itemOutputPath = (itemName, albumName, artistName) => {
  itemName = cleanOutputPath(itemName || '_');
  const generatedPathSegments = cleanOutputPath(
    generateTemplateString(itemName, albumName, artistName, outputFormat)
  ).split('___');
  
return `${path.join(
    path.normalize(output),
    ...(outputOnly ? [itemName] : generatedPathSegments)
  )}.${outputFileType}`;
};

const downloadList = async list => {
  list.name = list.name.replace('/', '-');
  const totalItems = list.items.length;
  logInfo(`Downloading: ${list.name}`);
  logInfo(`Total Items: ${totalItems}`);
  let currentCount = 0;
  for (const nextItem of list.items) {
    currentCount++;
    const itemId = nextItem.id;
    const itemName = nextItem.name;
    const albumName = nextItem.album_name;
    const artistName = nextItem.artists[0];
    const fullItemPath = itemOutputPath(itemName, albumName, artistName);
    const itemDir = fullItemPath.substr(0, fullItemPath.lastIndexOf(path.sep));
    const cached = findId(nextItem.id, itemDir);

    if (!cached) {
      logInfo(
        [
          `${currentCount}/${totalItems}`,
          `Artist: ${artistName}`,
          `Album: ${albumName}`,
          `Item: ${itemName}`,
        ].join('\n')
      );
      //create the dir if it doesn't exist
      fs.mkdirSync(itemDir, { recursive: true });

      if (downloadLyrics) {
        nextItem.lyrics = await downloadSubtitles(itemName, artistName);
      }

      const ytLinks = nextItem.URL
        ? [nextItem.URL]
        : await getLinks({
            itemName,
            albumName,
            artistName,
            extraSearch,
            searchFormat,
            type: list.type,
            exclusionFilters,
          });

      const outputFilePath = path.resolve(fullItemPath);

      const downloadSuccessful = await downloader(ytLinks, outputFilePath);

      if (downloadSuccessful) {
        await mergeMetadata(outputFilePath, nextItem);
        writeId(itemDir, itemId);
      }
      nextItem.failed = !downloadSuccessful;
    }
    nextItem.cached = true;
  }
  logSuccess(`Finished processing ${list.name}!\n`);
  
return list;
};

const generateReport = async listResults => {
  if (listResults.length) {
    logInfo('Download Report:');
    listResults.forEach(result => {
      const listItems = result.items;
      const itemLength = listItems.length;
      const failedItems = listItems.filter(item => item.failed);
      const failedItemLength = failedItems.length;
      logInfo(
        [
          'Successfully downloaded',
          `${itemLength - failedItemLength}/${itemLength}`,
          `for ${result.name} (${result.type})`,
        ].join(' ')
      );
      if (failedItemLength) {
        logFailure(
          [
            'Failed items:',
            ...failedItems.map(item => [
                `Item: (${item.name})`,
                `Album: ${item.album_name}`,
                `Artist: ${item.artists[0]}`,
                `ID: (${item.id})`,
              ].join(' ')),
          ].join('\n')
        );
      }
    });
  }
};

const run = async () => {
  const listResults = [];
  for (const input of inputs) {
    const lists = [];
    logInfo(`Starting processing of ${input.type} (${input.url})`);
    const URL = input.url;
    switch (input.type) {
      case INPUT_TYPES.SONG.SONG: {
        const track = await getTrack(URL);
        lists.push({
          items: [track],
          name: `${track.name} ${track.artists[0]}`,
          type: input.type,
        });
        break;
      }
      case INPUT_TYPES.SONG.PLAYLIST: {
        const list = await getPlaylist(URL);
        list.type = input.type;
        lists.push(list);
        break;
      }
      case INPUT_TYPES.SONG.ALBUM: {
        const list = await getAlbum(URL);
        list.type = input.type;
        lists.push(list);
        break;
      }
      case INPUT_TYPES.SONG.ARTIST: {
        const artistAlbumInfos = await getArtistAlbums(URL);
        lists.push(
          ...artistAlbumInfos.map(list => {
            list.type = input.type;
            
return list;
          })
        );
        break;
      }
      case INPUT_TYPES.EPISODE.EPISODE: {
        const episode = await getEpisode(URL);
        if (episode) {
          lists.push({
            items: [episode],
            name: `${episode.name} ${episode.album_name}`,
            type: input.type,
          });
        } else {
          logFailure('Failed to find episode, you may need to use auth');
        }

        break;
      }
      case INPUT_TYPES.EPISODE.SHOW: {
        const list = await getShowEpisodes(URL);
        list.type = input.type;
        lists.push(list);
        break;
      }
      case INPUT_TYPES.EPISODE.SAVED_SHOWS: {
        const savedShowsInfo = await getSavedShows();
        lists.push(
          ...savedShowsInfo.map(list => {
            list.type = input.type;
            
return list;
          })
        );
        break;
      }
      case INPUT_TYPES.SONG.SAVED_ALBUMS: {
        const savedAlbumsInfo = await getSavedAlbums();
        lists.push(
          ...savedAlbumsInfo.map(list => {
            list.type = input.type;
            
return list;
          })
        );
        break;
      }
      case INPUT_TYPES.SONG.SAVED_PLAYLISTS: {
        const savedPlaylistsInfo = await getSavedPlaylists();
        lists.push(
          ...savedPlaylistsInfo.map(list => {
            list.type = input.type;
            
return list;
          })
        );
        break;
      }
      case INPUT_TYPES.SONG.SAVED_TRACKS: {
        const list = await getSavedTracks();
        list.type = input.type;
        lists.push(list);
        break;
      }
      case INPUT_TYPES.YOUTUBE: {
        lists.push({
          items: [
            {
              name: URL,
              artists: [''],
              album_name: URL,
              release_date: null,
              //todo can we get the youtube image?
              cover_url: GENERIC_IMAGE,
              id: URL,
              URL: URL,
            },
          ],
          name: URL,
          type: input.type,
        });
        break;
      }
      default: {
        throw new Error(
          `Invalid URL type (${input.type}), ` +
            'Please visit github and make a request to support this type'
        );
      }
    }

    for (const [x, list] of lists.entries()) {
      logInfo(`Starting download of list ${x + 1}/${lists.length}`);
      const downloadResult = await downloadList(list);
      if (downloadReport) {
        listResults.push(downloadResult);
      }
    }
  }
  await generateReport(listResults);
  logSuccess('Finished!');
};

export default run;
