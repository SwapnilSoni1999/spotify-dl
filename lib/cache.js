'use strict';
const fs = require('fs');
const path = require('path');

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
    },
    read: async (dir, spinner) => {
        var cacheCounter;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            dir = path.join(dir, ".spdlcache");
            return 0;
        }
        else {
            dir = path.join(dir, ".spdlcache");
            if (fs.existsSync(dir)) {
                if(spinner) {
                    spinner.info("Fetching cache to resume Download\n");
                }
                cacheCounter = Number(fs.readFileSync(dir, 'utf-8'));
                return cacheCounter;
            }
            return 0;
        }
    }
}