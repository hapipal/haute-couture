'use strict';

module.exports = {
    name: 'my-named-scheme',
    scheme: (server, options) => {

        return {
            authenticate: (request, h) => {

                 return h.authenticated({ credentials: { myNamedScheme: options } });
            }
        };
    }
};
