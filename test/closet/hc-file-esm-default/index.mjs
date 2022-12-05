import HauteCouture from '../../../lib/index.js'

export const plugin = {
    name: 'hc-file-esm-default',
    async register(server, options) {

        await HauteCouture.compose(server, options);
    }
};
