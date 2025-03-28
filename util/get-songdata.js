import {
  extractTracks,
  extractAlbum,
  extractArtist,
  extractArtistAlbums,
  extractPlaylist,
  extractEpisodes,
  extractShowEpisodes,
  extractSavedShows,
  extractSavedAlbums,
  extractSavedPlaylists,
  extractSavedTracks,
} from '../lib/api.js';

export const getTrack = async function (url) {
  return (await extractTracks([getID(url)]))[0];
};

export const getAlbum = async function (url) {
  return await extractAlbum(getID(url));
};

export const getArtist = async function (url) {
  return await extractArtist(getID(url));
};

export const getArtistAlbums = async function (url) {
  const artistResult = await getArtist(url);
  const albumsResult = await extractArtistAlbums(artistResult.id);
  const albumIds = albumsResult.map(album => album.id);
  let albumInfos = [];
  for (let x = 0; x < albumIds.length; x++) {
    const albumInfo = await extractAlbum(albumIds[x]);
    // hardcode to artist being requested
    albumInfo.items = albumInfo.items.map(item => {
      item.artists = [artistResult.name, ...item.artists];

      return item;
    });
    albumInfos.push(albumInfo);
  }

  return albumInfos;
};

export const getPlaylist = async function (url) {
  return await extractPlaylist(getID(url));
};

const getID = url => {
  const splits = url.split('/');

  return splits[splits.length - 1];
};

export const getEpisode = async function (url) {
  return (await extractEpisodes([getID(url)]))[0];
};

export const getShowEpisodes = async function (url) {
  return await extractShowEpisodes(getID(url));
};

export const getSavedShows = async function () {
  const shows = await extractSavedShows();
  let episodes = [];
  for (let x = 0; x < shows.length; x++) {
    episodes.push(await extractShowEpisodes(shows[x].id));
  }

  return episodes;
};

export const getSavedAlbums = async function () {
  const albums = await extractSavedAlbums();
  let albumInfos = [];
  for (let x = 0; x < albums.length; x++) {
    albumInfos.push(await extractAlbum(albums[x].id));
  }

  return albumInfos;
};

export const getSavedPlaylists = async function () {
  const playlistsResults = await extractSavedPlaylists();
  const playlistIds = playlistsResults.map(playlist => playlist.id);
  let playlistInfos = [];
  for (let x = 0; x < playlistIds.length; x++) {
    playlistInfos.push(await extractPlaylist(playlistIds[x]));
  }

  return playlistInfos;
};

export const getSavedTracks = async function () {
  return await extractSavedTracks();
};
