'use strict';

module.exports = {
    method: 'get',
    path: '/id-route',
    config: {
        id: 'my-id-route',
        handler: (request, reply) => reply('my-id-route')
    }
};
