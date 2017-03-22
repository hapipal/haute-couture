# haute-couture

File-based hapi plugin composer

[![Build Status](https://travis-ci.org/devinivy/haute-couture.svg?branch=master)](https://travis-ci.org/devinivy/haute-couture) [![Coverage Status](https://coveralls.io/repos/devinivy/haute-couture/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/haute-couture?branch=master)

This library will wire your hapi plugin together based simply upon where you place files.  It has the ability to call every configuration-related method in the hapi plugin API.  This means many good things.

To name a few,

 - Route configurations placed in your `routes/` directory will be registered using `server.route()`.
 - You can place your authentication scheme in `auth/schemes.js` rather than calling `server.auth.scheme()`.
 - You can provision a cache simply by placing its configuration in `caches/my-cache-name.js`, and forget about `server.cache.provision()`.
 - Where applicable, any of these files can be configured as JSON.
 - You can teach haute-couture how to use your own custom server decorations.
 - You can still write all the custom plugin code you desire.

Again, **haute-couture** understands 23 hapi plugin methods– those for server methods, custom handler types, server/request decorations, request lifecycle extensions, route configuration, cookie definitions, [loveboat](https://github.com/devinivy/loveboat) routes and transforms, [vision](https://github.com/hapijs/vision) view managers, [dogwater](https://github.com/devinivy/dogwater) or [schwifty](https://github.com/BigRoomStudios/schwifty) model definitions, [chairo](https://github.com/hapijs/chairo) action-methods, and plenty more.  It can also be used as an alternative to [glue](https://github.com/hapijs/glue) for composing a server.

## Usage
> See also the [API Reference](API.md)

This library is actually not used as a hapi plugin.  Think of it instead as a useful subroutine of any hapi plugin.  The full documentation of the files and directories it recognizes can be found in the [API](API.md#files-and-directories).

Here's an example of a very simple plugin that registers a single "pinger" route.

#### `index.js`
```js
const HauteCouture = require('haute-couture');

// Either...
// 1. a plugin wired with haute-couture plus custom logic
module.exports = (server, options, next) => {

  HauteCouture.using()(server, options, (err) => {

    // Handle err, do custom plugin duties

    return next();
  });
};

// 2. a plugin entirely wired using haute-couture
module.exports = HauteCouture.using();

module.exports.attributes = {
  name: 'my-hapi-plugin'
};
```

#### `routes/pinger.js`
```js
// Note, this could also export an array of routes
module.exports = {
  method: 'get',
  path: '/',
  config: {
    // The route id 'pinger' will be assigned
    // automatically from the filename
    handler: (request, reply) => {
      reply({ ping: 'pong' });
    }
  }
};
```
