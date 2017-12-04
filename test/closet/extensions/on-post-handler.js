'use strict';

module.exports = {
    method: (request, h) => {

        request.app.lifecycle.push('onPostHandler');
        return h.continue;
    }
};
