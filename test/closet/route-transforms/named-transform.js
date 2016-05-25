'use strict';

module.exports = {
    name: 'my-named-transform',
    root: 'config.app',
    handler: (app) => Object.assign(app, { myNamedTransform: true }),
    match: (root, route) => {

        return { value: route.config.app, error: null };
    },
    after: 'test-transform'
};
