shopifapi
=========
A thin wrapper around the [Shopify API](http://api.shopify.com/) for node.js. Shopifapi currently only supports basic authentication connections to the Shopify API.  
  
Note that shopifapi implements a [burst-queue](https://github.com/mmaelzer/burst-queue) to prevent hitting the [Shopify API call limit](http://wiki.shopify.com/Learning_to_Respect_the_API_calls_limit). This means that calls on a shopifapi object may call back immediately or may call back in many minutes, depending on the frequency of Shopify API calls.

Install
-------

```
npm install shopifapi
```

---------------------------------------------

Example
---------------
```javascript
var Shopifapi = require('shopifapi');
var shopify = new Shopifapi({
    auth: {
        username: 'somereallylongauthkey',
        password: 'somereallylongpassword'
    },
    url: 'https://mywebsite.myshopify.com'
});

shopify.create.product({
  "title": "Burton Custom Freestlye 151",
  "body_html": "<strong>Good snowboard!</strong>",
  "vendor": "Burton",
  "product_type": "Snowboard",
  "variants": [
    {
      "option1": "First",
      "price": "10.00",
      "sku": 123
    },
    {
      "option1": "Second",
      "price": "20.00",
      "sku": "123"
    }
  ]
}, function(err, result) {
  // ... result is product with id 1 and variants with ids 2 and 3
});

shopify.get.product.withId(1, function(err, result) {
  console.log(result);
  // { product: { id: 1, title: "Burton Custom Freestlye 151", ... } }
});

shopify.get.product.variant.withId([1, 2], function(err, result) {
  console.log(result);
  // { variant: { option1: "First", "price": "10.00", ... } }
});

shopify.update.product(1, { tags: "snowboard" }, function(err, result) {
  // Updated product response
});

shopify.get.products.list({ limit: 10, collection_id: 789 }, function(err, result) {
  console.log(result);
  // { products: [ product1, product2, product3, ..., product10 ]}
});
```

---------------------------------------------

Constructor Options
-------
### auth
The `auth` object takes two items:  
* username: A shopify dev key  
* password: A shopify dev password  

### url
This is the `url` of the shopify store to connect to.

#### Example
```javascript
var Shopifapi = require('shopifapi');
var shopify = new Shopifapi({
    auth: {
        username: 'somereallylongauthkey',
        password: 'somereallylongpassword'
    },
    url: 'https://mywebsite.myshopify.com'
});
```

--------------------------------------------

Objects
--------
Shopify objects can be referred to in either the singular or plural form. Whichever word you use will not impact the underlying shopify api call. In other words, using `shopify.get.product.list()` is the same as calling `shopify.get.products.list()`. The ability to use singular or plural is just syntactic sugar.

### Supported Shopify Objects
* blogs
* checkout(s)
* collects
* comment(s)
* countries
* customCollection(s)
* customer(s)
* order(s)
* page(s)
* product(s)
* shop
* smartCollection(s)
* variant(s)

#### Example
```javascript
var Shopifapi = require('shopifapi');
var shopify = new Shopifapi({ /* options here */ });

shopify.get.product.list(function(err, products) {
  console.log(products);
  // { products: [ p1, p2, ..., pn ]}
});

shopify.get.products.list(function(err, products) {
  console.log(products);
  // { products: [ p1, p2, ..., pn ]}
});

```


Subobjects
----------
Shopify subobjects can also be referred to in either the singular or plural form without affecting the underlying api call. Subobjects need to be called following a shopify object.

### Supported Shopify Subobjects Objects
* product(s).image(s)
* product(s).variant(s)
* order(s).transaction(s)

#### Example
```javascript
var Shopifapi = require('shopifapi');
var shopify = new Shopifapi({ /* options here */ });

// 123 is the product id to get variants for
shopify.get.product.variants.list(123, function(err, variants) {
  console.log(variants);
  // { variants: [ v1, v2, ..., vn ]}
});

// 123 is the product id and 456 is the image id
shopify.get.product.image.withId([123, 456], function(err, image) {
  console.log(image);
  // { image: { id: 456, product_id: 123, ... }}
});

```

Methods
-------

### get.object.withId(id, callback)
Get a shopify object (product, customCollection, etc) with `id` passed in as a `Number`.

#### Example
```javascript
shopify.get.product.withId(123, function(err, product) {
  console.log(product);
  // { product: { id: 123, ... }}
});
```


### get.object.subobject.withId([object_id, subobject_id], callback)
Get a shopify subobject (variant, image) with an array of ids. The order of the array is important and requires the object id to come before the subobject id.

#### Example
```javascript
shopify.get.product.variant.withId([123, 678], function(err, variant) {
  console.log(variant);
  // { variant: { id: 678, product_id: 123, ... }}
});

```


### get.object.count([options], callback)
Get the total count of a shopify object type like product or smartCollection. You can provide `options` in the form of an `Object`. The `options` argument can be given parameters to constrain the resulting list. For example, you could provide a `collection_id` to list all products from a specific collection. A more detailed list of available shopify parameters can be found in the [Shopify API Documentation](http://docs.shopify.com/api/) in the **Endpoints** section.

### Example
```javascript
shopify.get.products.count(function(err, response) {
  console.log(response);
  // { count: 94 }
});

// or

shopify.get.products.count({ collection_id: 9 }, function(err, response) {
  console.log(response);
  // { count: 23 }
});
```


### get.object.subobject.count(id, callback)
Get the total count of a shopify subobject type like product.variant or product.image.

### Example
```javascript
// Get the count of variants for product with id 123
shopify.get.product.variants.count(123, function(err, response) {
  console.log(response);
  // { count: 4 }
});
```


### get.object.list([options], callback)
Get a list of shopify objects. You can provide `options` in the form of an `Object`. The `options` argument can be given parameters to constrain the resulting list. For example, you could provide a `collection_id` to list all products from a specific collection. A more detailed list of available shopify parameters can be found in the [Shopify API Documentation](http://docs.shopify.com/api/) in the **Endpoints** section.

#### Example
```javascript
shopify.get.products.list({collection_id: 9, limit: 10}, function(err, products) {
  console.log(products);
  // { products: [p1, p2, ..., p10]}
});
```


### get.object.subobject.list(id, [options], callback)
Get a list of shopify subobjects like product.variants and product.images. You can provide `options` in the form of an `Object`. The `options` argument can be given parameters to constrain the resulting list. For example, you could provide a `limit` to cap the number of variants to return. A more detailed list of available shopify parameters can be found in the [Shopify API Documentation](http://docs.shopify.com/api/) in the **Endpoints** section.

#### Example
```javascript
shopify.get.product.variants.list(123, {limit: 3}, function(err, products) {
  console.log(products);
  // { variants: [v1, v2, v3]}
});
```


### update.object(id, options, callback)
Update a shopify object. The `id` is the id  of the object to update. The `options` contains updated properties of the object.

#### Example
```javascript
shopify.update.product(123, {title: 'New and Improved Product123'}, function(err, product) {
  console.log(product);
  // { product: { /* udpated product data */ }}
});
```


### create.object(options, callback) {
Create a shopify object. The `options` is an `Object` that contains the new shopify object's information.

#### Example
```javascript
shopify.create.product({
  title: "Super Snowboard Freestlye 151",
  body_html: "<strong>Good snowboard!</strong>",
  vendor: "SuperDuper",
  product_type: "Snowboard",
  variants: [
    {
      option1: "First",
      price: "10.00",
      sku: 123
    },
    {
      option1: "Second",
      price: "20.00",
      sku: 124
    }
  ]
}, function(err, product) {
  console.log(product);
  // { product: { /* new product data */ }}
});
```


### remove.object(id, callback) {
Remove a shopify object. The `id` is a `Number` that is the id of the shopify object you want to delete.

#### Example
```javascript
shopify.remove.product(123, function(err, product) {
  console.log(product);
  // {}
});
```


### queue()
Returns the number of API calls enqueued. Since requests are throttled to stay under the shopify api call limits, this can be useful to know how many requests are pending.

```javascript
var requestsRemaining = shopify.queue();
console.log(requestsRemaining);
// 32
```

The MIT License
===============

Copyright (c) 2014 Michael Maelzer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.