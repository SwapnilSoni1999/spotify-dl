

const path = require('path');
const getLinks = require('./get-link');
const filter = require('./filters');
const urlParser = require('./url-parser');
const {
  INPUT_TYPES,
} = require('./constants');
const downloader = require('../lib/downloader');
const cache = require('../lib/cache');
const mergeMetadata = require('../lib/metadata');
const { getSpinner } = require('../lib/setup');
const SpotifyExtractor = require('./get-songdata');

module.exports = {
  run: async function ({ 
    inputs, 
    extraSearch, 
    output, 
    outputOnly,
    savedAlbums,
    savedTracks,
    savedPlaylists,
  }) {

    const trackOutputDir = track => {
      const outputDir = path.normalize(output);
      return outputOnly ? outputDir : path.join(
        outputDir,
        filter.cleanOutputPath(track.artist_name),
        filter.cleanOutputPath(track.album_name),
      );
    };

    const downloadLoop = async function (list) {
      const spinner = getSpinner();
      const tracks = list.tracks;
      const remainingTracks = tracks.filter(track => !track.cached);
      const tracksCount = tracks.length;
      const remainingTracksCount = remainingTracks.length;
      const currentCount = tracksCount - remainingTracksCount + 1;
      if (!remainingTracksCount) {
        spinner.succeed(`All songs already downloaded for ${list.name}!\n`);
      } else {
        const nextTrack = remainingTracks[0];
        const trackDir = trackOutputDir(nextTrack);
        const trackId = nextTrack.id;
        const trackName = nextTrack.name;
        const albumName = nextTrack.album_name;
        const artistName = nextTrack.artist_name;
        spinner.info(
          [
            `${currentCount}/${tracksCount}`,
            `Artist: ${artistName}`,
            `Album: ${albumName}`,
            `Song: ${trackName}`,
          ].join('\n'),
        );
        const ytLinks = nextTrack.URL ? [nextTrack.URL] : await getLinks(
          {
            trackName,
            albumName,
            artistName,
            extraSearch,
          },
        );
        if (ytLinks.length) {
          const output = path.resolve(
            trackDir,
            `${filter.cleanOutputPath(trackName)}.mp3`,
          );
          await downloader(ytLinks, output);
          await mergeMetadata(output, nextTrack);
          cache.writeId(trackDir, trackId);
        }
        // we mark as cached to continue
        list.tracks = list.tracks.map(track => {
          if (track.id == trackId) {
            track.cached = true;
          }
          return track;
        });
        await downloadLoop(list);
      }
    };

    const downloadList = async function (list) {
      const spinner = getSpinner();
      list.name = list.name.replace('/', '-');
      spinner.info(`Downloading: ${list.name}`);
      spinner.info(`Total Songs: ${list.tracks.length}`);
      list.tracks = list.tracks.map(track => {
        track.cached = cache.findId(track.id, trackOutputDir(track));
        return track;
      });
      await downloadLoop(list);
    };


    const spotifyExtractor = new SpotifyExtractor();
    const spinner = getSpinner();

    inputs = inputs.map(link => {
      const cleanedURL = filter.removeQuery(link);
      return {
        type: urlParser(cleanedURL),
        // only use cleaned url for spotify to not break youtube support
        url: link.includes('spotify') ? cleanedURL : link,
      };
    });

    if (savedAlbums) {
      inputs.push({ type: INPUT_TYPES.SAVED_ALBUMS, url: null });
    }
    if (savedTracks) {
      inputs.push({ type: INPUT_TYPES.SAVED_TRACKS, url: null });
    }
    if (savedPlaylists) {
      inputs.push({ type: INPUT_TYPES.SAVED_PLAYLISTS, url: null });
    }


    for (const input of inputs) {
      const URL = input.url;
      switch (input.type) {
        case INPUT_TYPES.SONG: {
          const track = await spotifyExtractor.getTrack(URL);
          await downloadList({
            tracks: [
              track,
            ],
            name: `${track.name} ${track.artist_name}`,
          });
          break;
        }
        case INPUT_TYPES.PLAYLIST: {
          await downloadList(
            await spotifyExtractor.getPlaylist(URL),
          );
          break;
        }
        case INPUT_TYPES.ALBUM: {
          await downloadList(
            await spotifyExtractor.getAlbum(URL),
          );
          break;
        }
        case INPUT_TYPES.ARTIST: {
          const artistAlbumInfos = await spotifyExtractor.getArtistAlbums(URL);
          for (let x = 0; x < artistAlbumInfos.length; x++) {
            spinner.info(`Starting album ${x + 1}/${artistAlbumInfos.length}`);
            await downloadList(artistAlbumInfos[x]);
          }
          break;
        }
        case INPUT_TYPES.SAVED_ALBUMS: {
          const savedAlbumsInfo = await spotifyExtractor.getSavedAlbums();
          for (let x = 0; x < savedAlbumsInfo.length; x++) {
            spinner.info(`Starting album ${x + 1}/${savedAlbumsInfo.length}`);
            await downloadList(savedAlbumsInfo[x]);
          }
          break;
        }
        case INPUT_TYPES.SAVED_PLAYLISTS: {
          const savedPlaylistsInfo = await spotifyExtractor.getSavedPlaylists();
          for (let x = 0; x < savedPlaylistsInfo.length; x++) {
            spinner.info(
              `Starting playlist ${x + 1}/${savedPlaylistsInfo.length}`,
            );
            await downloadList(savedPlaylistsInfo[x]);
          }
          break;
        }
        case INPUT_TYPES.SAVED_TRACKS: {
          await downloadList(await spotifyExtractor.getSavedTracks());
          break;
        }
        case INPUT_TYPES.YOUTUBE: {
          await downloadList({
            tracks: [
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
          });
          break;
        }
        default: {
          throw new Error('Invalid URL type');
        }
      }
    }
  },
};