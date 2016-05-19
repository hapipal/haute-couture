'use strict';

module.exports = {
    method: (request, reply) => {

        request.app.lifecycle.push('onPostHandler');
        reply.continue();
    }
};
