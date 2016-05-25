'use strict';

module.exports = [
    {
        root: 'config.app',
        handler: (app) => Object.assign(app, { badArrTransform: true }),
        match: (root, route) => {

            return { value: route.config.app, error: null };
        }
    }
];
