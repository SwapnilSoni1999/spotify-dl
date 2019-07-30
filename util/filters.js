'use strict';

module.exports = {
    validateOutput: async function (output) {
        output = output.replace(/[&\/\\#+$!"~%:*?<>{}\|]/g, '');      
        return output;
    },
    removeQuery: async function (url) {
        for(let i=0; i<url.length; i++) {
            if(i > 15) {
                if(url[i] == '?') {
                    url = url.slice(0, i);
                }
            }
        }
        return url;
    }
}
