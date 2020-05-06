const axios = require('axios').default;
const pkg = require('../package.json');

const checkVersion = async () => {
    const res = await axios("https://api.github.com/repos/SwapnilSoni1999/spotify-dl/tags");
    const latestVersion = res.data[0].name;
    if (pkg.version !== latestVersion) {
        return "========Update Available========\nUse npm install -g spotify-dl\nto update the package.\n================================";
    }
    return;
};

module.exports = checkVersion;