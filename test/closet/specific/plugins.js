'use strict';

const internals = {};

internals.plugin = (srv, options, next) => next();

internals.plugin.attributes = { name: 'specific-sub-plugin' };

module.exports = [{ plugins: internals.plugin }];
