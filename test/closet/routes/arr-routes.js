'use strict';

module.exports = [
    {
        method: 'get',
        path: '/arr-route-one',
        config: {
            handler: () => 'arr-route-one'
        }
    },
    {
        method: 'get',
        path: '/arr-route-two',
        config: {
            handler: () => 'arr-route-two'
        }
    }
];
