'use strict';

module.exports = {
    name: 'myNamedHandler',
    method: (route, options) => (request, reply) => reply({ myNamedHandler: options })
};
