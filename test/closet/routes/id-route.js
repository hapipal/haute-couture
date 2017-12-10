'use strict';

module.exports = {
    method: 'get',
    path: '/id-route',
    options: {
        id: 'my-id-route',
        handler: () => 'my-id-route'
    }
};
