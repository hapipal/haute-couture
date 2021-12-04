'use strict';

exports.createRoute = (name) => ({
    method: 'get',
    path: `/${name}`,
    handler: () => name
});
