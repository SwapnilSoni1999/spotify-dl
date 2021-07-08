

const path = require('path');
const getLinks = require('./get-link');
const filter = require('./filters');
const {
  INPUT_TYPES,
} = require('./constants');
const downloader = require('../lib/downloader');
const cache = require('../lib/cache');
const mergeMetadata = require('../lib/metadata');
const { cliInputs } = require('../lib/setup');
const SpotifyExtractor = require('./get-songdata');
const { logSuccess, logInfo } = require('./log-helper');
const { inputs, extraSearch, output, outputOnly } = cliInputs();

module.exports = {
  itemOutputDir: item => {
    const outputDir = path.normalize(output);
    return outputOnly ? outputDir : path.join(
      outputDir,
      filter.cleanOutputPath(item.artist_name),
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
      logSuccess(`All items already downloaded for ${list.name}!\n`);
    } else {
      const nextItem = remainingItems[0];
      const itemDir = this.itemOutputDir(nextItem);
      const itemId = nextItem.id;
      const itemName = nextItem.name;
      const albumName = nextItem.album_name;
      const artistName = nextItem.artist_name;
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
      if (ytLinks.length) {
        const output = path.resolve(
          itemDir,
          `${filter.cleanOutputPath(itemName)}.mp3`,
        );
        await downloader(ytLinks, output);
        await mergeMetadata(output, nextItem);
        cache.writeId(itemDir, itemId);
      }
      // we mark as cached to continue
      list.items = list.items.map(item => {
        if (item.id == itemId) {
          item.cached = true;
        }
        return item;
      });
      await this.downloadLoop(list);
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
    await this.downloadLoop(list);
  },
  run: async function () {
    const spotifyExtractor = new SpotifyExtractor();
    for (const input of inputs) {
      logInfo(`Starting processing of ${input.type} (${input.url})`);
      const URL = input.url;
      switch (input.type) {
        case INPUT_TYPES.SONG.SONG: {
          const track = await spotifyExtractor.getTrack(URL);
          await this.downloadList({
            items: [
              track,
            ],
            name: `${track.name} ${track.artist_name}`,
            type: input.type,
          });
          break;
        }
        case INPUT_TYPES.SONG.PLAYLIST: {
          const list = await spotifyExtractor.getPlaylist(URL);
          list.type = input.type;
          await this.downloadList(list);
          break;
        }
        case INPUT_TYPES.SONG.ALBUM: {
          const list = await spotifyExtractor.getAlbum(URL);
          list.type = input.type;
          await this.downloadList(await this.downloadList(list));
          break;
        }
        case INPUT_TYPES.SONG.ARTIST: {
          const artistAlbumInfos = await spotifyExtractor.getArtistAlbums(URL);
          for (let x = 0; x < artistAlbumInfos.length; x++) {
            const list = artistAlbumInfos[x];
            list.type = input.type;
            logInfo(`Starting album ${x + 1}/${artistAlbumInfos.length}`);
            await this.downloadList(list);
          }
          break;
        }
        case INPUT_TYPES.EPISODE.EPISODE: {
          const episode = await spotifyExtractor.getEpisode(URL);
          await this.downloadList({
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
          await this.downloadList(list);
          break;
        }
        case INPUT_TYPES.EPISODE.SAVED_SHOWS: {
          const savedShowsInfo = await spotifyExtractor.getSavedShows();
          for (let x = 0; x < savedShowsInfo.length; x++) {
            logInfo(`Starting show ${x + 1}/${savedShowsInfo.length}`);
            await this.downloadList(savedShowsInfo[x]);
          }
          break;
        }
        case INPUT_TYPES.SONG.SAVED_ALBUMS: {
          const savedAlbumsInfo = await spotifyExtractor.getSavedAlbums();
          for (let x = 0; x < savedAlbumsInfo.length; x++) {
            const list = savedAlbumsInfo[x];
            list.type = input.type;
            logInfo(`Starting album ${x + 1}/${savedAlbumsInfo.length}`);
            await this.downloadList(list);
          }
          break;
        }
        case INPUT_TYPES.SONG.SAVED_PLAYLISTS: {
          const savedPlaylistsInfo = await spotifyExtractor.getSavedPlaylists();
          for (let x = 0; x < savedPlaylistsInfo.length; x++) {
            const list = savedPlaylistsInfo[x];
            list.type = input.type;
            logInfo(
              `Starting playlist ${x + 1}/${savedPlaylistsInfo.length}`,
            );
            await this.downloadList(list);
          }
          break;
        }
        case INPUT_TYPES.SONG.SAVED_TRACKS: {
          const list = await spotifyExtractor.getSavedTracks();
          list.type = input.type;
          await this.downloadList(list);
          break;
        }
        case INPUT_TYPES.YOUTUBE: {
          await this.downloadList({
            items: [
              {
                name: URL,
                artist_name: '',
                album_name: URL,
                release_date: null,
                //todo can we get the youtube image?
                cover_url: 'https://lh3.googleusercontent.com/z6Sl4j9zQ88oUKN \
                y0G3PAMiVwy8DzQLh_ygyvBXv0zVNUZ_wQPN_n7EAR2By3dhoUpX7kTpaHjRP \
                ni1MHwKpaBJbpNqdEsHZsH4q',
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
    }
  },
};