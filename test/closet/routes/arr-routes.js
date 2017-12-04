'use strict';

module.exports = [
    {
        method: 'get',
        path: '/arr-route-one',
        options: {
            handler: () => 'arr-route-one'
        }
    },
    {
        method: 'get',
        path: '/arr-route-two',
        options: {
            handler: () => 'arr-route-two'
        }
    }
];
