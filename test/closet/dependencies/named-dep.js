'use strict';

module.exports = {
    dependencies: 'vision',
    after: (server, next) => {

        server.app.deps = server.app.deps || [];
        server.app.deps.push('vision');
        next();
    }
};
