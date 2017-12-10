'use strict';

module.exports = {
    dependencies: 'vision',
    after: (server) => {

        server.app.deps = server.app.deps || [];
        server.app.deps.push('vision');
    }
};
