const axios = require('axios').default;
const pkg = require('../package.json');

const checkVersion = async () => {
  const res =
    await axios.default(
      'https://api.github.com/repos/SwapnilSoni1999/spotify-dl/tags',
    );
  const latestVersion = res.data[0].name;
  if (pkg.version !== latestVersion) {
    console.log([
      '\n========Update Available========',
      'Use npm install -g spotify-dl',
      'to update the package.',
      '================================\n',
    ].join('\n'));
  }
};

export default checkVersion;