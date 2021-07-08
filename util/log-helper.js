const ora = require('ora');

const spinner = ora('Searching… Please be patient :)\n').start();

module.exports = {
  logInfo(message) {
    spinner.info(message);
  },
  logStart(message) {
    spinner.start(message);
  },
  logSuccess(message) {
    spinner.succeed(message);
  },
  logFailure(message) {
    spinner.fail(message);
  },
  updateSpinner(message) {
    if (process.stdout.isTTY) {
      spinner.text = message;
    } else {
      spinner.info(message);
    }
  },
};