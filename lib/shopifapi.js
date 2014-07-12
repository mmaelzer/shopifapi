var _ = require('underscore');
var Queue = require('burst-queue');
var async = require('async');
var request = require('request');
var Log = require('./log');
var qs = require('querystring');

/**
 *  @param {...String} var_args
 *  @return {String}
 */
function join(var_args) {
  return _.compact(_.toArray(arguments)).join('/');
}

/**
 *  @param {String} base
 *  @param {String} path
 *  @return {String|Function(...String)}
 */
function route(base, path) {
  if (_.contains(path, '?')) {
    // If it the path has question marks
    // return a function that lets you pass in arguments
    // to replace the question marks
    return function() {
      var newPath = path;
      _.toArray(arguments).forEach(function(arg) {
        newPath = newPath.replace('?', arg);
      });
      return join(base, newPath);
    };
  }
  return join(base, path);
}

/**
 *  @param {...String} var_args
 *  @return {String}
 */
function getBase(var_args) {
  var args = _.toArray(arguments);
  return route.bind(null, join.apply(null, args));
}

var BASE_OBJECTS = {
  blogs: 'blogs',
  checkout: 'checkouts',
  checkouts: 'checkouts',
  collects: 'collections',
  comment: 'comments',
  comments: 'comments',
  countries: 'countries',
  customCollection: 'custom_collections',
  customCollections: 'custom_collections',
  customer: 'customers',
  customers: 'customers',
  order: 'orders',
  orders: 'orders',
  page: 'pages',
  pages: 'pages',
  product: 'products',
  products: 'products',
  shop: 'shop',
  smartCollection: 'smart_collections',
  smartCollections: 'smart_collections',
  variant: 'variants',
  variants: 'variants'
};

var SUB_OBJECTS = {
  product: {
    variant: 'variants',
    variants: 'variants',
    image: 'images',
    images: 'images'
  },
  products: {
    variant: 'variants',
    variants: 'variants',
    image: 'images',
    images: 'images'
  },
  order: {
    transaction: 'transactions',
    transactions: 'transactions',
    refund: 'refunds',
    refunds: 'refunds'
  },
  orders: {
    transaction: 'transactions',
    transactions: 'transactions',
    refund: 'refunds',
    refunds: 'refunds'
  }
};

var OBJECT_PATHS = {
  list: '.json',
  count: '/count.json',
  withId: '/?.json'
};

var METHOD_MAP = {
  GET: 'get',
  POST: 'create',
  PUT: 'update',
  DELETE: 'remove'
};

var queue = new Queue(1000, 2);

/**
 * @param {Object} options
 * @constructor
 */
function Shopifapi(options) {
  options = options || {};
  this.auth = {
    user: options.auth.username,
    pass: options.auth.password
  };
  this.url = options.url;
  this.log = new Log(options.verbose, options.logger);
  this.withResponse = !!options.withResponse;
  this._buildRoutes();
}

/**
 *  Build the Shopifapi instance with a dynamically generated set of methods around shopify objects
 *  @private
 */
Shopifapi.prototype._buildRoutes = function() {
  var admin = getBase(this.url, 'admin');
  var self = this;

  var mappedRequests = {};
  ['GET', 'PUT', 'POST', 'DELETE'].forEach(function(method) {
    mappedRequests[METHOD_MAP[method]] = this._requestBuilder(method, this.auth);
  }, this);

  _.forEach(BASE_OBJECTS, function(obj, objKey) {
    _.forEach(mappedRequests, function(method, methodKey) {
      if (methodKey !== METHOD_MAP.GET) {
        self[methodKey] = self[methodKey] || {};
        var path = methodKey === METHOD_MAP.POST ? OBJECT_PATHS.list : OBJECT_PATHS.withId;
        self[methodKey][objKey] = method(admin(obj + path), obj);
      } else {
        _.forEach(OBJECT_PATHS, function(path, pathKey) {
          self[methodKey] = self[methodKey] || {};
          self[methodKey][objKey] = self[methodKey][objKey] || {};
          self[methodKey][objKey][pathKey] = method(admin(obj + path));
          if (objKey in SUB_OBJECTS) {
            _.forEach(SUB_OBJECTS[objKey], function(subObj, subObjKey) {
              self[methodKey][objKey][subObjKey] = self[methodKey][objKey][subObjKey] || {};
              self[methodKey][objKey][subObjKey][pathKey] = method(admin(obj + '/?/' + subObj + path));
            });
          }
        });
      }
    });
  });
};

/**
 *  @param {String|Function} url
 *  @param {Number|Object|Array.<Number>} options
 *  @param {Number=} opt_id
 *  @return {String}
 *  @private
 */
function getUrlFromOptions(url, options, opt_id) {
  if (_.isNumber(opt_id)) {
    return url(opt_id);
  } else if (_.isNumber(options)) {
    return url(options);
  } else if (Array.isArray(options)) {
    return url.apply(null, options);
  } else if ('id' in options) {
    if (Array.isArray(options.id)) {
      return url.apply(null, options.id);
    } else {
      return url(options.id);
    }
  }
  return url;
}

/**
 *  @param {Function|undefined} callback
 *  @param {Object|Function} options
 *  @return {Function}
 *  @private
 */
function getCallbackFromOptions(callback, options) {
  return _.isFunction(options) ? options : callback;
}

/**
 *  @param {Object} options
 *  @param {String} object
 *  @param {Number=} opt_id
 *  @return {Object}
 *  @private
 */
function getBodyFromOptions(options, object, opt_id) {
  var body = {};
  var value = (function() {
    if (_.isObject(options) && !_.isEmpty(options)) {
      return _.extend({}, options, {id: opt_id || options.id});
    }
    return {};
  })();

  if (object) {
    body[object] = value
  } else {
    body = value;
  }
  return body;
}

/**
 *  Do things like 'products' -> 'product'
 *  @param {String} object
 *  @return {String}
 *  @private
 */
function convertObjectIntoKey(object) {
  if (!object) return;
  var objectParts = object.split('');
  return _.last(objectParts) === 's' ? _.initial(objectParts).join('') : object;
}

/**
 *  @param {String} method
 *  @param {Object} auth
 *  @return {Function(String, String)}
 *  @private
 */
Shopifapi.prototype._requestBuilder = function(method, auth) {
  var self = this;
  return function(url, object) {
    return function(id, options, callback) {
      var args = _.toArray(arguments);
      queue.add(function() {

        callback = args.length === 2 ? options : callback;
        options = args.length === 2 ? id : options;
        id = args.length === 2 ? undefined : id;

        callback = getCallbackFromOptions(callback, options);

        options = _.isObject(options) && !_.isFunction(options) ? options : {};
        options = _.extend({}, options, {
          qs: method.toLowerCase() === 'get' ? options : undefined,
          url: getUrlFromOptions(url, options, id),
          method: method,
          auth: auth,
          json: true,
          body: method.toLowerCase() !== 'get' ? getBodyFromOptions(options, convertObjectIntoKey(object), id) : {}
        });
        request(options, function(err, response, result) {
          callback(err, result, response);
        });
      });
    };
  };
};

/** @return {Number} **/
Shopifapi.prototype.queue = function() {
  return queue.enqueued();
};



/*** Depricated methods below ***/

/**
 *  @param {String} obj
 *  @param {String} url
 *  @param {Object} options
 *  @param {Function(Error|Object|Array.<Object>)} callback
 *  @depricated
 */
Shopifapi.prototype.makeRequest = function(obj, url, options, callback) {
  var self = this;
  callback = callback || function() {};
  queue.add(function() {
    self.log.may('[Url]', url);
    request(options, function(err, response, result) {
      if (err) self.log.may('[Error]', err);
      if (result) self.log.may('[Result]', result);
      callback(err ? err : result && obj in result ? result[obj] : result);
    });
  });
};

/**
 *  @param {String} url
 *  @param {String} method
 *  @param {Object} data
 *  @private
 *  @depricated
 */
Shopifapi.prototype._buildOptions = function(url, method, data) {
  return {
    url: url,
    method: method,
    json: true,
    auth: this.auth,
    body: data
  };
};


var CALLED = {};
function depricated(method) {
  if (!CALLED[method]) {
    console.warn(method + ' is depricated. Please refer to https://github.com/mmaelzer/shopifapi for the new API');
    CALLED[method] = true;
  }
}

Shopifapi.prototype.getBaseObjById = function(obj, id, callback) {
  depricated('getBaseObjById');
  var url = this.url + '/admin/' + obj + '/' + id + '.json';
  var options = this._buildOptions(url, 'GET');
  this.makeRequest(null, url, options, callback);
};

Shopifapi.prototype.getSubObj = function(obj, subobj, args, callback) {
  depricated('getSubObj');
  args = typeof args === 'string' ? args : qs.stringify(args);
  var url = this.url + '/admin/' + obj + '/' + args + '/' + subobj + '.json';
  var options = this._buildOptions(url, 'GET');
  this.makeRequest(subobj, url, options, callback);
};

Shopifapi.prototype.put = function(obj, id, data, callback) {
  depricated('put');
  var url = this.url + '/admin/' + obj + '/' + id + '.json';
  var options = this._buildOptions(url, 'PUT', data);
  this.makeRequest(obj, url, options, callback);
};

Shopifapi.prototype.post = function(obj, data, callback) {
  depricated('post');
  var url = this.url + '/admin/' + obj + '.json';
  var options = this._buildOptions(url, 'POST', data);
  this.makeRequest(obj, url, options, callback);
};

Shopifapi.prototype.count = function(obj, args, callback) {
  depricated('count');
  args = typeof args === 'string' ? args : qs.stringify(args);
  var url = this.url + '/admin/' + obj + '/count.json?' + args;
  var options = this._buildOptions(url, 'GET');
  queue.add(function() {
    this.makeRequest(obj, url, options, callback);
  }.bind(this));
};

Shopifapi.prototype.getBaseObj = function(obj, args, callback) {
  depricated('getBaseObj');
  args = typeof args === 'string' ? args : qs.stringify(args);
  var self = this;
  this.count(obj, args, function(err, result) {
    var pages = Math.ceil(result.count / 250);
    async.times(pages, function(n, done) {
      var url = self.url + '/admin/' + obj + '.json?limit=250&page=' + n + '&' + args;
      var options = self._buildOptions(url, 'GET');
      self.makeRequest(obj, url, options, done);
    }, function(err, results) {
      if (err) {
        callback(err);
      } else {
        callback(null, _.flatten(results));
      }
    });
  });
};

module.exports = Shopifapi;
