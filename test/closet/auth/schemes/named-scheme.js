'use strict';

module.exports = {
    name: 'my-named-scheme',
    scheme: (server, options) => {

        return {
            authenticate: (request, reply) => {

                return reply.continue({ credentials: { myNamedScheme: options } });
            }
        };
    }
};
