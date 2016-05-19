'use strict';

module.exports = {
    type: 'onPreAuth',
    method: (request, reply) => {

        request.app.lifecycle = ['onPreAuth'];
        reply.continue();
    }
};
