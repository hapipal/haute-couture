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

Again, **haute-couture** understands 23 hapi plugin methods– those for server methods, custom handler types, server/request decorations, request lifecycle extensions, route configuration, cookie definitions, [loveboat](https://github.com/devinivy/loveboat) routes and transforms, [vision](https://github.com/hapijs/vision) view managers, [dogwater](https://github.com/devinivy/dogwater) and [schwifty](https://github.com/BigRoomStudios/schwifty) model definitions, [chairo](https://github.com/hapijs/chairo) action-methods, and plenty more.  It can also be used as an alternative to [glue](https://github.com/hapijs/glue) for composing a server.

## Usage
This library is actually not used as a hapi plugin.  Think of it instead as a useful subroutine of any hapi plugin.

Here's an example of a very simple plugin that registers a single "pinger" route.

#### `index.js`
```js
const HauteCouture = require('haute-couture');

// Either...
// 1. a plugin wired with haute-couture plus custom logic
module.exports = (server, options, next) => {

  HauteCouture()(server, options, (err) => {

    // Handle err, do custom plugin duties

    return next();
  });
};

// 2. a plugin entirely wired using haute-couture
module.exports = HauteCouture();

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

### Files and directories
**haute-couture** is quite astute in mapping files and directories to hapi API calls.  And as seen in the comments of the example above, it also infers configuration from filenames where applicable.

Files will always export an array of values (representing multiple API calls) or a single value (one API call).  When a hapi method takes more than one argument (not including a callback), a single value consists of an object whose keys are the names of the arguments and whose values are the intended argument values.  The format of the argument values come from the [hapi API](https://github.com/hapijs/hapi/blob/master/API.md) unless otherwise specified.

For example, a file defining a new handler type (representing a call to `server.handler(name, method)`) would export an object of the format `{ name, method }`.

Lastly, files can always export a function with signature `function(server, options)` that returns the intended value or array of values.

Here's the complete rundown of how files and directories are mapped to API calls.  The order here reflects the order in which the calls would be made.

> **But first, an important note.**
>
> Below you'll find that this library can be used in conjunction with several hapi plugins.  There is no way to properly express an "optional peer dependency" using npm, so here I am to tell you which versions of those plugins work with haute-couture.
  - chairo - ≥1 and <3
  - dogwater - 2.x.x
  - loveboat - 1.x.x
  - vision - ≥2 and <5

#### Connections
> [`server.connection(options)`](https://github.com/hapijs/hapi/blob/master/API.md#serverconnectionoptions)
>
> Note, this can only be used with plugins whose attributes specify `{ connections: false }`.

  - **`connections.js`** - export an array of `options`.
  - **`connections/index.js`** - export an array of `options`.
  - **`connections/some-label.js`** - export `options`. `options.labels` will be assigned `'some-label'` from the filename if no labels are already specified.

#### Plugin registrations
> [`server.register(plugins, [options], [cb])`](https://github.com/hapijs/hapi/blob/master/API.md#serverregisterplugins-options-callback)

  - **`plugins.js`** - export an array of objects `{ plugins, options }`.
  - **`plugins/index.js`** - export an array of objects.
  - **`plugins/plugin-name.js`** - export an object.  If a plugin isn't specified in `plugins` it will be `require()`d using the filename.

#### Dependencies
> [`server.dependency(dependencies, [after])`](https://github.com/hapijs/hapi/blob/master/API.md#serverdependencydependencies-after)

  - **`dependencies.js`** - export an array of objects `{ dependencies, after }`.
  - **`dependencies/index.js`** - export an array of objects.
  - **`dependencies/plugin-name.js`** - export an object. `dependencies` will be derived from the filename if it is not already specified.

#### Provisioning caches
> [`server.cache.provision(options, [cb])`](https://github.com/hapijs/hapi/blob/master/API.md#servercacheprovisionoptions-callback)

  - **`caches.js`** - export an array of `options`.
  - **`caches/index.js`** - export an array of `options`.
  - **`caches/some-cache-name.js`** - export `options`.  The cache's `options.name` will be assigned `'cache-name'` from the filename if a name isn't already specified.

#### Server methods
> [`server.method(name, method, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#servermethodname-method-options)

  - **`methods.js`** - export an array of objects `{ name, method, options }`.
  - **`methods/index.js`** - export an array of objects.
  - **`methods/method-name.js`** - export an object.  The `name` will be assigned `'methodName'` camel-cased from the filename if it isn't already specified.

#### Seneca plugins (for [chairo](https://github.com/hapijs/chairo))
> [`server.seneca.use(plugin, [options])`](http://senecajs.org/api/#use-module-options-)

  - **`seneca-plugins.js`** - export an array of objects `{ plugin, options }`.
  - **`seneca-plugins/index.js`** - export an array of objects.
  - **`seneca-plugins/some-plugin-name.js`** - export an object.  The `plugin` will be assigned `'some-plugin-name'` from the filename if a plugin isn't already provided.

#### Action-methods (for [chairo](https://github.com/hapijs/chairo))
> [`server.action(name, pattern, [options])`](https://github.com/hapijs/chairo#serveractionname-pattern-options)

  - **`action-methods.js`** - export an array of objects `{ name, pattern, options }`.
  - **`action-methods/index.js`** - export an array of objects.
  - **`action-methods/method-name.js`** - export an object.  The `name` will be assigned `'methodName'` camel-cased from the filename if it isn't already specified.

#### View manager (for [vision](https://github.com/hapijs/vision))
> [`server.views(options)`](https://github.com/hapijs/vision/blob/master/API.md#serverviewsoptions)

  - **`view-manager.js`** - export `options`.
  - **`view-manager/index.js`** - export `options`.

#### Decorations
> [`server.decorate(type, property, method, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#serverdecoratetype-property-method-options)

  - **`decorations.js`** - export an array of objects `{ type, property, method, options }`.
  - **`decorations/index.js`** - export an array of objects.
  - **`decorations/decoration-name.js`** - export an object.  The `property` will be assigned `'decorationName'` camel-cased from the filename if it isn't already specified.
  - **`decorations/[type].decoration-name.js`** - export an object.  The `type` will additionally be inferred from the filename if it isn't already specified.

#### Handler types
> [`server.handler(name, method)`](https://github.com/hapijs/hapi/blob/master/API.md#serverhandlername-method)

  - **`handler-types.js`** - export an array of objects `{ name, method }`.
  - **`handler-types/index.js`** - export an array of objects.
  - **`handler-types/handler-name.js`** - export an object.  The `name` will be assigned `'handlerName'` camel-cased from the filename if it isn't already specified.

#### Server/request extensions
> [`server.ext(events)`](https://github.com/hapijs/hapi/blob/master/API.md#serverextevents)

  - **`extensions.js`** - export an array of `events`.
  - **`extensions/index.js`** - export an array of `events`.
  - **`extensions/[event-type].js`** - export `events`.  The `type` (of each item if there are multiple) will be assigned `[event-type]` camel-cased from the filename if it isn't already specified.  E.g. `onPreHandler`-type events can be placed in `extensions/on-pre-handler.js`.

#### Exposed properties
> [`server.expose(key, value)`](https://github.com/hapijs/hapi/blob/master/API.md#serverexposekey-value)

  - **`expose.js`** - export an array of objects `{ key, value }`.
  - **`expose/index.js`** - export an array of objects.
  - **`expose/property-name.js`** - export an object.  The `key` will be assigned `'propertyName'` camel-cased from the filename if it isn't already specified.

#### Path prefix
> [`server.path(relativeTo)`](https://github.com/hapijs/hapi/blob/master/API.md#serverpathrelativeto)

  - **`path.js`** - export `relativeTo`.
  - **`path/index.js`** - export `relativeTo`.

#### Globally bound context
> [`server.bind(context)`](https://github.com/hapijs/hapi/blob/master/API.md#serverbindcontext)

  - **`bind.js`** - export `context`.
  - **`bind/index.js`** - export `context`.

#### Authentication schemes
> [`server.auth.scheme(name, scheme)`](https://github.com/hapijs/hapi/blob/master/API.md#serverauthschemename-scheme)

  - **`auth/schemes.js`** - export an array of objects `{ name, scheme }`.
  - **`auth/schemes/index.js`** - export an array of objects.
  - **`auth/schemes/scheme-name.js`** - export an object.  The `name` will be assigned `'scheme-name'` from the filename if it isn't already specified.

#### Authentication strategies
> [`server.auth.strategy(name, scheme, [mode], [options])`](https://github.com/hapijs/hapi/blob/master/API.md#serverauthschemename-scheme)

  - **`auth/strategies.js`** - export an array of objects `{ name, scheme, mode, options }`.
  - **`auth/strategies/index.js`** - export an array of objects.
  - **`auth/strategies/strategy-name.js`** - export an object.  The `name` will be assigned `'strategy-name'` from the filename if it isn't already specified.

#### Default auth strategy
> [`server.auth.default(options)`](https://github.com/hapijs/hapi/blob/master/API.md#serverauthdefaultoptions)

  - **`auth/default.js`** - export `options`.
  - **`auth/default/index.js`** - export `options`.

#### Cookies
> [`server.state(name, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#serverstatename-options)

  - **`cookies.js`** - export an array of objects `{ name, options }`.
  - **`cookies/index.js`** - export an array of objects.
  - **`cookies/cookie-name.js`** - export an object.  The `name` will be assigned `'cookie-name'` from the filename if it isn't already specified.

#### Route transforms (for [loveboat](https://github.com/devinivy/loveboat))
> [`server.routeTransforms(transforms)`](https://github.com/devinivy/loveboat#serverroutetransformstransforms)

  - **`route-transforms.js`** - export an array of `transforms`.
  - **`route-transforms/index.js`** - export an array of `transforms`.
  - **`route-transforms/transform-name.js`** - export `transforms`.  The `transform.name` will be assigned `'transform-name'` from the filename if it isn't already specified.

#### Transformable routes (for [loveboat](https://github.com/devinivy/loveboat))
> [`server.loveboat(routes)`](https://github.com/devinivy/loveboat#serverloveboatroutes-transforms-onlyspecified)

  - **`routes-loveboat.js`** - export an array of `routes`.
  - **`routes-loveboat/index.js`** - export an array of `routes`.
  - **`routes-loveboat/[anything].js`** - export `routes`.

#### Model definitions (for [dogwater](https://github.com/devinivy/dogwater))
> [`server.dogwater(models)`](https://github.com/devinivy/dogwater#serverdogwaterconfig)

  - **`models.js`** - export an array of `models`.
  - **`models/index.js`** - export an array of `models`.
  - **`models/model-identity.js`** - export `models`.  If `models` is a single model definition, the model's `identity` will be assigned `'model-identity'` from the filename if it isn't already specified.  The filename could just as easily represent a group of models (rather than an identity) and the file could export an array of model configs.

#### Model definitions (for [schwifty](https://github.com/BigRoomStudios/schwifty))
  > [`server.schwifty(config)`](https://github.com/BigRoomStudios/schwifty/blob/master/API.md#serverschwiftyconfig)

  - **`schwifty-models/index.js`** - export an object containing `model` objects.
  - **`schwifty-models/model-name.js`** - export `model` object.

#### Routes
> [`server.route(options)`](https://github.com/hapijs/hapi/blob/master/API.md#serverrouteoptions)

  - **`routes.js`** - export an array of `options`.
  - **`routes/index.js`** - export an array of `options`.
  - **`routes/route-id.js`** - export `options`.  If `options` is a single route config object, the route's `config.id` will be assigned `'route-id'` from the filename if it isn't already specified.  The filename could just as easily represent a group of routes (rather than an id) and the file could export an array of route configs.

## API
### `HauteCouture([dirname], [manifestExtras])`

  - `dirname` - an absolute directory path in which to look for the files and directories described [above](#files-and-directories).  It defaults to the directory path of the caller.
  - `manifestExtras` - an array specifying additional items to append to the **[haute](https://github.com/devinivy/haute)** manifest that is used to map directory structure to hapi plugin API calls.

Returns a function with the signature `function(server, [options], [next])`, identical in meaning to the signature of a [hapi plugin](https://github.com/hapijs/hapi/blob/master/API.md#plugins).  Invoking the function makes hapi plugin API calls on `server` as described [above](#files-and-directories).  Typically `server` will be a server object passed to a plugin and `options` will be plugin options.  However, `server` could be any hapi server object (such as the root server) and `options` are not required.  If no `next` callback is provided, a `Promise` is returned.

### The hapi [haute](https://github.com/devinivy/haute) manifest
The base **haute** manifest for **hapi** is located at [`lib/manifest.js`](lib/manifest.js).  It is considered part of the public API, and therefore can safely be required in other projects as `require('haute-couture/lib/manifest')`.
