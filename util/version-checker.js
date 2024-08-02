import axios from 'axios';
import meow from 'meow';

const checkVersion = async () => {
  try {
    const res = await axios.default(
      'https://api.github.com/repos/SwapnilSoni1999/spotify-dl/tags'
    );
  } catch (_e) {
     console.log("Could not check current version, have checked too many times skipping");
     return;
  }
  const latestVersion = res.data[0].name;
  const pkg = meow('', { importMeta: import.meta }).pkg;

  if (pkg.version !== latestVersion) {
    console.log(
      [
        '\n========Update Available========',
        'Use npm install -g spotify-dl',
        'to update the package.',
        '================================\n',
      ].join('\n')
    );
  }
};

export default checkVersion;
