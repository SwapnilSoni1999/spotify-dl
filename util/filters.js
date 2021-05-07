'use strict';

module.exports = {
  validateOutputSync: function (output) {
    return output.replace(/[&\/\\#+$!"~%:*?<>{}\|]/g, '');
  },
  removeQuery: async function (url) {
    return url.split('?')[0];
  },
};
