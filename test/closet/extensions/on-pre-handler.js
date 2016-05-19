'use strict';

module.exports = [
    {
        type: 'onPostAuth',
        method: (request, reply) => {

            request.app.lifecycle.push('onPostAuth');
            reply.continue();
        }
    },
    {   // Should get { type: onPreHandler } from filename
        method: (request, reply) => {

            request.app.lifecycle.push('onPreHandler');
            reply.continue();
        }
    }
];
