'use strict';

module.exports = {
    method: (srv) => {

        srv.app['x/not-an-ext'] = true;
    }
};
