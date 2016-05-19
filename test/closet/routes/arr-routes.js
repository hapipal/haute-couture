'use strict';

module.exports = [
    {
        method: 'get',
        path: '/arr-route-one',
        config: {
            handler: (request, reply) => reply('arr-route-one')
        }
    },
    {
        method: 'get',
        path: '/arr-route-two',
        config: {
            handler: (request, reply) => reply('arr-route-two')
        }
    }
];
