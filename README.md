# haute-couture

File-based hapi plugin composer

[![Build Status](https://travis-ci.org/hapipal/haute-couture.svg?branch=master)](https://travis-ci.org/hapipal/haute-couture) [![Coverage Status](https://coveralls.io/repos/hapipal/haute-couture/badge.svg?branch=master&service=github)](https://coveralls.io/github/hapipal/haute-couture?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Introduction
> Note, this library is intended to work with **hapi v17+**

This library will wire your hapi plugin together based simply upon where you place files.  It has the ability to call every configuration-related method in the hapi plugin API.  This means many good things.

To name a few,

 - Route configurations placed in your `routes/` directory will be registered using `server.route()`.
 - You can place your authentication scheme in `auth/schemes.js` rather than calling `server.auth.scheme()`.
 - You can provision a cache simply by placing its configuration in `caches/my-cache-name.js`, and forget about `server.cache.provision()`.
 - Where applicable, any of these files can be configured as JSON.
 - You can teach haute-couture how to use your own custom server decorations.
 - You can still write all the custom plugin code you desire.

Again, **haute-couture** understands 17 hapi plugin methods– those for server methods, server/request decorations, request lifecycle extensions, route configuration, cookie definitions, [vision](https://github.com/hapijs/vision) view managers, [schwifty](https://github.com/hapipal/schwifty) models, [schmervice](https://github.com/hapipal/schmervice) services, and plenty more.  It can also be used as an alternative to [glue](https://github.com/hapijs/glue) for composing a server.

## Usage
> See also the [API Reference](API.md)

This library is actually not used as a hapi plugin.  Think of it instead as a useful subroutine of any hapi plugin.  The full documentation of the files and directories it recognizes can be found in the [API](API.md#files-and-directories).

Here's an example of a very simple plugin that registers a single "pinger" route.

#### `index.js`
```js
const HauteCouture = require('haute-couture');

// Either...
// 1. a plugin wired with haute-couture plus custom logic
module.exports = {
  name: 'my-hapi-plugin',
  register: async (server, options) => {

    // Do custom plugin duties

    await HauteCouture.using()(server, options);
  }
};

// 2. a plugin entirely wired using haute-couture
module.exports = {
  name: 'my-hapi-plugin',
  register: HauteCouture.using()
};
```

#### `routes/pinger.js`
```js
// Note, this could also export an array of routes
module.exports = {
  method: 'get',
  path: '/',
  options: {
    // The route id 'pinger' will be assigned
    // automatically from the filename
    handler: (request) => {

      return { ping: 'pong' };
    }
  }
};
```
