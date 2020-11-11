'use strict';

const internals = {};

internals.plugin = {
    name: 'specific-sub-plugin',
    register: (srv, options) => null
};

module.exports = [{ plugin: internals.plugin }];
