'use strict';
const spotify = require('../lib/api');

class SpotifyExtractor {
  async checkCredentials() {
    return await spotify.checkCredentials();
  }

  async getTrack(url) {
    return (await spotify.extractTracks([this.getID(url)]))[0];
  }

  async getAlbum(url) {
    return await spotify.extractAlbum(this.getID(url));
  }

  async getArtist(url) {
    return await spotify.extractArtist(this.getID(url));
  }

  async getArtistAlbums(url) {
    const artistResult = await this.getArtist(url);
    const albumsResult = await spotify.extractArtistAlbums(
      artistResult.id,
    );
    const albumIds = albumsResult.map(album => album.id);
    let albumInfos = [];
    for (let x = 0; x < albumIds.length; x++) {
      const albumInfo = await spotify.extractAlbum(albumIds[x]);
      // hardcode to artist being requested
      albumInfo.items.forEach(item => {
        item.artist_name = artistResult.name;
      });
      albumInfos.push(albumInfo);
    }
    return albumInfos;
  }

  async getPlaylist(url) {
    return await spotify.extractPlaylist(this.getID(url));
  }

  getID(url) {
    const splits = url.split('/');
    return splits[splits.length - 1];
  }

  async getEpisode(url) {
    return (await spotify.extractEpisodes([this.getID(url)]))[0];
  }

  async getShowEpisodes(url) {
    return await spotify.extractShowEpisodes(this.getID(url));
  }

  async getSavedShows() {
    const shows = await spotify.extractSavedShows();
    let episodes = [];
    for (let x = 0; x < shows.length; x++) {
      episodes.push(await spotify.extractShowEpisodes(shows[x].id));
    }
    return episodes;
  }

  async getSavedAlbums() {
    const albums = await spotify.extractSavedAlbums();
    let albumInfos = [];
    for (let x = 0; x < albums.length; x++) {
      albumInfos.push(await spotify.extractAlbum(albums[x].id));
    }
    return albumInfos;
  }

  async getSavedPlaylists() {
    const playlistsResults = await spotify.extractSavedPlaylists();
    const playlistIds = playlistsResults.map(playlist => playlist.id);
    let playlistInfos = [];
    for (let x = 0; x < playlistIds.length; x++) {
      playlistInfos.push(await spotify.extractPlaylist(playlistIds[x]));
    }
    return playlistInfos;
  }

  async getSavedTracks() {
    return await spotify.extractSavedTracks();
  }
}

module.exports = SpotifyExtractor;