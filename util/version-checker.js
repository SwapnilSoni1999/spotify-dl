import axios from 'axios';
import meow from 'meow';

const checkVersion = async () => {
  try {
    const res = await axios.get('https://api.github.com/repos/SwapnilSoni1999/spotify-dl/tags');
    const latestVersion = res.data[0].name;
    const pkg = meow('', { importMeta: import.meta }).pkg;

    if (pkg.version !== latestVersion) {
      console.log(
        '\n========Update Available========\n' +
        'Use npm install -g spotify-dl\n' +
        'to update the package.\n' +
        '================================\n'
      );
    }
  } catch (error) {
    console.log("Could not check current version, have checked too many times, skipping");
  }
};

export default checkVersion;
