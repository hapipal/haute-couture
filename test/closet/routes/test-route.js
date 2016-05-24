'use strict';

module.exports = {
    method: 'get',
    path: '/test-route',
    handler: (request, reply) => reply('test-route')
};
