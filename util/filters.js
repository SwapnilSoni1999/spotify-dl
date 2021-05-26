'use strict';

module.exports = {
  validateOutputSync: function (output) {
    return output.replace(/[&\/\\#+$!"~%:*?<>{}\|]/g, '');
  },
  removeQuery: function (url) {
    return url.split('?')[0];
  },
  validateDirSync: function (output) {
    return output.replace(/[(.$)]/g, '');
  },
};
