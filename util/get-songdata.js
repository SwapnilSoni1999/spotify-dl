'use strict';
const spotify = require('../lib/api');

class SpotifyExtractor {
  async getTrack(url) {
    return await this.extractTrack(await this.getID(url));
  }

  async getAlbum(url) {
    return await this.extractAlbum(await this.getID(url));
  }

  async getArtist(url) {
    return await this.extractArtist(await this.getID(url));
  }

  async getArtistAlbums(url) {
    const artistResult = await this.getArtist(url);
    const albumsResult = await this.extractArtistAlbums(
      artistResult.id,
    );
    const albumIds = albumsResult.map(album => album.id);
    let albumInfos = [];
    for (let x = 0; x < albumIds.length; x++) {
      albumInfos.push(await this.extractAlbum(albumIds[x]));
    }
    return {
      albums: albumInfos,
      artist: artistResult,
    };
  }

  async getPlaylist(url) {
    return await this.extractPlaylist(await this.getID(url));
  }

  async getID(url) {
    var token = await spotify.setup();
    spotify.setToken(token);
    var id;
    for (let i = 0; i < url.length; i++) {
      if (i > 10 && url[i] == '/') {
        for (let j = i; j < url.length; j++) {
          if (url[j] == '/') {
            id = url.slice(++j);
          }
        }
      }
    }
    return id;
  }

  async extractTrack(trackId) {
    const trackData = await spotify.extractTrack(trackId);
    trackData.id = trackId;
    return trackData;
  }

  async extractPlaylist(playlistId) {
    return await spotify.extractPlaylist(playlistId);
  }

  async extractAlbum(albumId) {
    return await spotify.extractAlbum(albumId);
  }

  async extractArtist(artistId) {
    return await spotify.extractArtist(artistId);
  }

  async extractArtistAlbums(artistId) {
    return await spotify.extractArtistAlbums(artistId);
  }
}

module.exports = SpotifyExtractor;