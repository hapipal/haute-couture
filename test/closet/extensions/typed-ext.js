'use strict';

module.exports = {
    type: 'onPreAuth',
    method: (request, h) => {

        request.app.lifecycle = ['onPreAuth'];
        return h.continue;
    }
};
