'use strict';

module.exports = [
    {
        type: 'onPostAuth',
        method: (request, h) => {

            request.app.lifecycle.push('onPostAuth');
            return h.continue;
        }
    },
    {   // Should get { type: onPreHandler } from filename
        method: (request, h) => {

            request.app.lifecycle.push('onPreHandler');
            return h.continue;
        }
    }
];
