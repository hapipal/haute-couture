'use strict';

module.exports = {
    // This case is significant because we should not auto-assign an
    // id to routes with multiple methods, as it is not allowed by hapi.
    method: ['get', 'post'],
    path: '/multi-method-route',
    handler: () => 'multi-method-route'
};
