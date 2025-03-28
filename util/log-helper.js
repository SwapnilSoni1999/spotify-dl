import ora from 'ora';

import Config from '../config.js';

const spinner = ora('Searching… Please be patient :)\n').start();

export const logInfo = function (message) {
  spinner.info(message);
};

export const logStart = function (message) {
  spinner.start(message);
};

export const logSuccess = function (message) {
  spinner.succeed(message);
};

export const logFailure = function (message) {
  spinner.fail(message);
};

export const updateSpinner = function (message) {
  if (Config.isTTY) {
    spinner.text = message;
  } else {
    spinner.info(message);
  }
};
