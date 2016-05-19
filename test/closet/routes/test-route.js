'use strict';

module.exports = {
    method: 'get',
    path: '/test-route',
    config: {
        handler: (request, reply) => reply('test-route')
    }
};
