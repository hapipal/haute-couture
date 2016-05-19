'use strict';

module.exports = {
    after: (server, next) => {

        server.app.deps = ['test-dep'];
        next();
    },
    options: {
        before: 'vision'
    }
};
