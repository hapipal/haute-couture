'use strict';

module.exports = {
    type: 'onPreStart',
    method: (srv) => {

        srv.app['x/has-configured-ext'] = true;
    }
};
