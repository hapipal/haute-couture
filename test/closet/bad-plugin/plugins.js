'use strict';

const internals = {};

internals.plugin = (srv, options, next) => {

    next(new Error('Ya blew it!'));
};

internals.plugin.attributes = { name: 'err-plugin' };

module.exports = [{ plugins: internals.plugin }];
