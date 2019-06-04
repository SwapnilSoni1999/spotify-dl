'use strict';
const fs = require('fs');

module.exports = {
    write: async (dir, counter) => {
        if (fs.existsSync(dir)) {
            fs.unlink(dir, function () {
                fs.writeFile(dir, counter, function (err) {
                    if (err) throw err;
                });
            });
        }
        else {
            fs.writeFile(dir, counter, function (err) {
                if (err) throw err;
            });
        }
    }
}