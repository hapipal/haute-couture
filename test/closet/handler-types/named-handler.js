'use strict';

module.exports = {
    name: 'myNamedHandler',
    method: (route, options) => {

        return (request, reply) => reply({ myNamedHandler: options });
    }
};
