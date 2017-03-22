'use strict';

module.exports = [
    {
        method: 'get',
        path: '/loveboat',
        handler: (request, reply) => reply('loveboat'),
        config: {
            id: 'loveboat',
            app: {}
        }
    }
];
