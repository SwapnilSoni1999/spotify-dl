'use strict';

module.exports = {
    validateOutput: async function (output) {
        output = output.replace(/[&\/\\#+$~%*?<>{}]/g, '');      
        return output;
    }
}