

const path = require('path');
const getLinks = require('./get-link');
const filter = require('./filters');
const {
  INPUT_TYPES,
  YOUTUBE_SEARCH: { GENERIC_IMAGE },
} = require('./constants');
const downloader = require('../lib/downloader');
const cache = require('../lib/cache');
const mergeMetadata = require('../lib/metadata');
const { cliInputs } = require('../lib/setup');
const SpotifyExtractor = require('./get-songdata');
const { logSuccess, logInfo, logFailure } = require('./log-helper');
const { inputs, extraSearch, output, outputOnly, downloadReport } = cliInputs();
module.exports = {
  itemOutputDir: item => {
    const outputDir = path.normalize(output);
    return outputOnly ? outputDir : path.join(
      outputDir,
      filter.cleanOutputPath(item.artists[0]),
      filter.cleanOutputPath(item.album_name),
    );
  },
  downloadLoop: async function (list) {
    const items = list.items;
    const remainingItems = items.filter(item => !item.cached);
    const itemsCount = items.length;
    const remainingItemsCount = remainingItems.length;
    const currentCount = itemsCount - remainingItemsCount + 1;
    if (!remainingItemsCount) {
      logSuccess(`Finished processing ${list.name}!\n`);
      return list;
    } else {
      const nextItem = remainingItems[0];
      const itemDir = this.itemOutputDir(nextItem);
      const itemId = nextItem.id;
      const itemName = nextItem.name;
      const albumName = nextItem.album_name;
      const artistName = nextItem.artists[0];
      logInfo(
        [
          `${currentCount}/${itemsCount}`,
          `Artist: ${artistName}`,
          `Album: ${albumName}`,
          `Item: ${itemName}`,
        ].join('\n'),
      );

      const ytLinks = nextItem.URL ? [nextItem.URL] : await getLinks(
        {
          itemName,
          albumName,
          artistName,
          extraSearch,
          type: list.type,
        },
      );

      const output = path.resolve(
        itemDir,
        `${filter.cleanOutputPath(itemName)}.mp3`,
      );
      const downloadSuccessful = await downloader(ytLinks, output);
      if (downloadSuccessful) {
        await mergeMetadata(output, nextItem);
        cache.writeId(itemDir, itemId);
      }

      for (const item of list.items) {
        if (item.id == itemId) {
          item.cached = true;
          item.failed = !downloadSuccessful;
          break;
        }
      };
      return await this.downloadLoop(list);
    }
  },
  downloadList: async function (list) {
    list.name = list.name.replace('/', '-');
    logInfo(`Downloading: ${list.name}`);
    logInfo(`Total Items: ${list.items.length}`);
    list.items = list.items.map(item => {
      item.cached = cache.findId(item.id, this.itemOutputDir(item));
      return item;
    });
    return await this.downloadLoop(list);
  },
  generateReport: async function (listResults) {
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
          ].join(' '),
        );
        if (failedItemLength) {
          logFailure(
            [
              'Failed items:',
              ...failedItems.map(item => {
                return [
                  `Item: (${item.name})`,
                  `Album: ${item.album_name}`,
                  `Artist: ${item.artists[0]}`,
                  `ID: (${item.id})`,
                ].join(' ');
              }),
            ].join('\n'),
          );
        }
      });
    }
  },
  run: async function () {
    const spotifyExtractor = new SpotifyExtractor();
    const listResults = [];
    for (const input of inputs) {
      const lists = [];
      logInfo(`Starting processing of ${input.type} (${input.url})`);
      const URL = input.url;
      switch (input.type) {
        case INPUT_TYPES.SONG.SONG: {
          const track = await spotifyExtractor.getTrack(URL);
          lists.push({
            items: [
              track,
            ],
            name: `${track.name} ${track.artists[0]}`,
            type: input.type,
          });
          break;
        }
        case INPUT_TYPES.SONG.PLAYLIST: {
          const list = await spotifyExtractor.getPlaylist(URL);
          list.type = input.type;
          lists.push(list);
          break;
        }
        case INPUT_TYPES.SONG.ALBUM: {
          const list = await spotifyExtractor.getAlbum(URL);
          list.type = input.type;
          lists.push(list);
          break;
        }
        case INPUT_TYPES.SONG.ARTIST: {
          const artistAlbumInfos = await spotifyExtractor.getArtistAlbums(URL);
          lists.push(...artistAlbumInfos.map(list => {
            list.type = input.type;
            return list;
          }));
          break;
        }
        case INPUT_TYPES.EPISODE.EPISODE: {
          const episode = await spotifyExtractor.getEpisode(URL);
          lists.push({
            items: [
              episode,
            ],
            name: `${episode.name} ${episode.album_name}`,
            type: input.type,
          });
          break;
        }
        case INPUT_TYPES.EPISODE.SHOW: {
          const list = await spotifyExtractor.getShowEpisodes(URL);
          list.type = input.type;
          lists.push(list);
          break;
        }
        case INPUT_TYPES.EPISODE.SAVED_SHOWS: {
          const savedShowsInfo = await spotifyExtractor.getSavedShows();
          lists.push(...savedShowsInfo.map(list => {
            list.type = input.type;
            return list;
          }));
          break;
        }
        case INPUT_TYPES.SONG.SAVED_ALBUMS: {
          const savedAlbumsInfo = await spotifyExtractor.getSavedAlbums();
          lists.push(...savedAlbumsInfo.map(list => {
            list.type = input.type;
            return list;
          }));
          break;
        }
        case INPUT_TYPES.SONG.SAVED_PLAYLISTS: {
          const savedPlaylistsInfo = await spotifyExtractor.getSavedPlaylists();
          lists.push(...savedPlaylistsInfo.map(list => {
            list.type = input.type;
            return list;
          }));
          break;
        }
        case INPUT_TYPES.SONG.SAVED_TRACKS: {
          const list = await spotifyExtractor.getSavedTracks();
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
          throw new Error(`Invalid URL type (${input.type}), ` +
            'Please visit github and make a request to support this type');
        }
      }

      for (const [x, list] of lists.entries()) {
        logInfo(`Starting download of list ${x + 1}/${lists.length}`);
        const downloadResult = await this.downloadList(list);
        if (downloadReport) {
          listResults.push(downloadResult);
        }
      }
    }
    await this.generateReport(listResults);
    logSuccess('Finished!');
  },
};