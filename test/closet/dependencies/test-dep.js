'use strict';

module.exports = {
    after: (server, next) => {

        server.app.deps = server.app.deps || [];
        server.app.deps.push('test-dep');
        next();
    },
    options: {
        before: 'vision'
    }
};
