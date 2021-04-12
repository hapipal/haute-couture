'use strict';

module.exports = {
    method: (srv) => {

        srv.app['x/on-pre-start'] = true;
    }
};
