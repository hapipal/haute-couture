# API Reference

### `HauteCouture.using([dirname], [amendments])`

Returns a function with the signature `function(server, [options], [next])`, identical in meaning to the signature of a [hapi plugin](https://github.com/hapijs/hapi/blob/master/API.md#plugins).  Invoking the function makes hapi plugin API calls on `server` as described [below](#files-and-directories).  Typically `server` will be a server object passed to a plugin and `options` will be plugin options.  However, `server` could be any hapi server object (such as the root server) and `options` are not required.  If no `next` callback is provided, a `Promise` is returned.  It takes the following options,

  - `dirname` - an absolute directory path in which to look for the files and directories described [below](#files-and-directories).  It defaults to the directory path of the caller.
  - `amendments` - specifies additions and/or removals of items in the **[haute](https://github.com/devinivy/haute)** manifest that is used to map directory structure to hapi plugin API calls.  May be either of,
    - An object,
      - `add` - a single or array of items to add to the hapi haute manifest.  Also may be a nested array of items (e.g. `[{}, [{}, {}]]`).  If any items have `place` equal to an item in the default manifest, the default manifest item will be replaced.  Supports the following additional keys per [haute manifest item](#structure-of-a-haute-manifest-item),
        - `before` - a single or array of `place` values for which the given item should be positioned prior to other items in the manifest.
        - `after` - a single or array of `place` values for which the given item should be positioned subsequent to other items in the manifest.
      - `remove` - a single or array of `place` values of items that should be removed from the manifest.  This would be utilized to opt a file/directory out of usage by haute-couture.
    - An array of items used identically to the `add` option above.

### `HauteCouture.manifest.create([amendments])`

Returns the hapi **[haute](https://github.com/devinivy/haute)** manifest, incorporating optional `amendments` to the manifest as described in [`HauteCouture.using([dirname], [amendments])`](#hautecoutureusingdirname-amendments).

### `HauteCouture.manifest.dogwater`

An amendment to use [dogwater](https://github.com/devinivy/dogwater) rather than [schwifty](https://github.com/BigRoomStudios/schwifty) at `models.js` or `models/`.  See entry in the the [files and directories section](#model-definitions-for-dogwater) for details.

For example,
```js
module.exports = HauteCouture.using({
  add: HauteCouture.manifest.dogwater
});

module.exports.attributes = {
  name: 'my-app-plugin'
};
```

### `HauteCouture.manifest.loveboat`

An amendment to use [loveboat](https://github.com/devinivy/loveboat) to define routes at `routes.js` or `routes/` rather than the default calls to `server.route()`.  Also includes an amendment for declaring loveboat transforms at `route-transforms.js` or `route-transforms/`.  See entries in the the [files and directories section](#route-transforms-for-loveboat) for details.

For example,
```js
module.exports = HauteCouture.using({
  add: HauteCouture.manifest.loveboat
});

module.exports.attributes = {
  name: 'my-app-plugin'
};
```

### Files and directories
**haute-couture** is quite astute in mapping files and directories to hapi API calls.  And as seen in the comments of the [usage example](README.md#routespingerjs), it also infers configuration from filenames where applicable.

Files will always export an array of values (representing multiple API calls) or a single value (one API call).  When a hapi method takes more than one argument (not including a callback), a single value consists of an object whose keys are the names of the arguments and whose values are the intended argument values.  The format of the argument values come from the [hapi API](https://github.com/hapijs/hapi/blob/master/API.md) unless otherwise specified.

For example, a file defining a new handler type (representing a call to `server.handler(name, method)`) would export an object of the format `{ name, method }`.

Lastly, files can always export a function with signature `function(server, options)` that returns the intended value or array of values.

Here's the complete rundown of how files and directories are mapped to API calls.  The order here reflects the order in which the calls would be made.

> **But first, an important note.**
>
> Below you'll find that this library can be used in conjunction with several hapi plugins.  There is no way to properly express an "optional peer dependency" using npm, so here I am to tell you which versions of those plugins work with haute-couture.
>  - chairo - ≥1 and <3
>  - schwifty - ≥1 and <3
>  - dogwater - 2.x.x
>  - loveboat - 1.x.x
>  - vision - ≥2 and <5

#### Path prefix
> [`server.path(relativeTo)`](https://github.com/hapijs/hapi/blob/master/API.md#serverpathrelativeto)

  - **`path.js`** - export `relativeTo`.
  - **`path/index.js`** - export `relativeTo`.

#### Globally bound context
> [`server.bind(context)`](https://github.com/hapijs/hapi/blob/master/API.md#serverbindcontext)

  - **`bind.js`** - export `context`.
  - **`bind/index.js`** - export `context`.


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

#### Model definitions (for [schwifty](https://github.com/BigRoomStudios/schwifty))
> [`server.schwifty(models)`](https://github.com/BigRoomStudios/schwifty/blob/master/API.md#serverschwiftyconfig)
>
> Note, while `models` will typically be a single Objection model class, you may also specify any configuration accepted by `server.schwifty()`, per the docs linked above.

  - **`models.js`** - export an array of `models`.
  - **`models/index.js`** - export an array of `models`.
  - **`models/model-name.js`** - export `models`.

#### Model definitions (for [dogwater](https://github.com/devinivy/dogwater))
> [`server.dogwater(models)`](https://github.com/devinivy/dogwater#serverdogwaterconfig)
>
> Note, requires being enabled with a manifest amendment.  See [`HauteCouture.manifest.dogwater`](#hautecouturemanifestdogwater).

  - **`models.js`** - export an array of `models`.
  - **`models/index.js`** - export an array of `models`.
  - **`models/model-identity.js`** - export `models`.  If `models` is a single model definition, the model's `identity` will be assigned `'model-identity'` from the filename if it isn't already specified.  The filename could just as easily represent a group of models (rather than an identity) and the file could export an array of model configs.

#### Routes
> [`server.route(options)`](https://github.com/hapijs/hapi/blob/master/API.md#serverrouteoptions)

  - **`routes.js`** - export an array of `options`.
  - **`routes/index.js`** - export an array of `options`.
  - **`routes/route-id.js`** - export `options`.  If `options` is a single route config object, the route's `config.id` will be assigned `'route-id'` from the filename if it isn't already specified.  The filename could just as easily represent a group of routes (rather than an id) and the file could export an array of route configs.

#### Route transforms (for [loveboat](https://github.com/devinivy/loveboat))
> [`server.routeTransforms(transforms)`](https://github.com/devinivy/loveboat#serverroutetransformstransforms)
>
> Note, requires being enabled with a manifest amendment.  See [`HauteCouture.manifest.loveboat`](#hautecouturemanifestloveboat).

  - **`route-transforms.js`** - export an array of `transforms`.
  - **`route-transforms/index.js`** - export an array of `transforms`.
  - **`route-transforms/transform-name.js`** - export `transforms`.  The `transform.name` will be assigned `'transform-name'` from the filename if it isn't already specified.

#### Transformable routes (for [loveboat](https://github.com/devinivy/loveboat))
> [`server.loveboat(routes)`](https://github.com/devinivy/loveboat#serverloveboatroutes-transforms-onlyspecified)
>
> Note, requires being enabled with a manifest amendment.  See [`HauteCouture.manifest.loveboat`](#hautecouturemanifestloveboat).

  - **`routes.js`** - export an array of `routes`.
  - **`routes/index.js`** - export an array of `routes`.
  - **`routes/[anything].js`** - export `routes`.

### Extras
#### Structure of a [haute](https://github.com/devinivy/haute) manifest item

A haute manifest item describes the mapping of a file/directory's place and contents to a call to the hapi plugin (`server`) API.  In short, the place is mapped to a hapi plugin method, and the file contents are mapped to arguments for that method.  It is an object of the form,
  - `place` - a relative path to the file or directory, typically excluding any file extensions.  E.g. `'auth/strategies'` or `'plugins'`.
  - `method` - the name of the method in the hapi plugin API.  May be a deep method.  E.g. `'auth.strategy'` or `'register'`.
  - `signature` - (optional) an array of argument names taken by the hapi plugin's method.  When omitted the entire file contents are passed as the sole argument.  An argument may be marked as optional by surrounding it in brackets `[]`.  E.g. `['name', '[options]']` would map file contents of the form `{ name, options }` to a call `server.someMethod(name, options)`, and `{ name }` to a call `server.someMethod(name)`.
  - `async` - (optional) when `true`, indicates that the hapi plugin's method takes an error-first callback as a final argument.
  - `list` - (optional) when `true`, indicates to call the hapi plugin method on either,
    - each item in an array exported at `place`, when `place` represents a single file (e.g. `plugins.js`) or a directory with an index file (e.g. `plugins/index.js`) or,
    - each value exported by the files within `place` when `place` is a directory without an index file (e.g. `plugins/vision.js`, `plugins/inert.js`).
  - `useFilename` - (optional) when `list` is `true` and `place` is a directory without an index file, then this option allows one to use the name of the each file within `place` to modify its contents.  Should be a function with signature `function(filename, value)` that receives the file's `filename` (without file extension) and its contents at `value`, returning a new value to be used as arguments for hapi plugin API call.
