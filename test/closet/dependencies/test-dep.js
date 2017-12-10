'use strict';

module.exports = {
    after: (server) => {

        server.app.deps = server.app.deps || [];
        server.app.deps.push('test-dep');
    }
};
