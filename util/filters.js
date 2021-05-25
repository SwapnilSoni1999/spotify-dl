'use strict';

module.exports = {
  cleanOutputPath: function (output) {
    return output ? output.replace(/[&\/\\#+$!"~.%:*?<>{}\|]/g, '') : '';
  },
  removeQuery: function (url) {
    return url.split('?')[0];
  },
};
