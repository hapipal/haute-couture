'use strict';

module.exports = {
    dependencies: '@hapi/vision',
    after: (server) => {

        server.app.deps = server.app.deps || [];
        server.app.deps.push('@hapi/vision');
    }
};
