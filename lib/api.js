'user strict';
const SpotifyWebApi = require('spotify-web-api-node');

class Spotify {
    constructor(credentials) {
        this.credentials = { id: credentials.id, secret: credentials.secret };
        var spotifyApi = new SpotifyWebApi({
            clientId: this.credentials.id,
            clientSecret: this.credentials.secret
        });
        spotifyApi.clientCredentialsGrant().then(
            (data) => {
                spotifyApi.setAccessToken(data.body['access_token']);
                console.log(data.body);
            },
            (err) => {
                console.error(
                    'Something went wrong when retrieving an access token',
                    err.message
                );
                process.exit(-1);
            }
        );
    }
}

module.exports = Spotify;

