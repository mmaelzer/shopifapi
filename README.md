shopifapi
=========
  
A thin wrapper around the [Shopify API](http://api.shopify.com/) for node.js. Shopifapi currently only supports basic authentication connections to the Shopify API.

Note that shopifapi implements a [burst-queue](https://github.com/mmaelzer/burst-queue) to prevent hitting the [Shopify API call limit](http://wiki.shopify.com/Learning_to_Respect_the_API_calls_limit). This means that calls on a shopifapi object may call back immediately or may call back in many minutes, depending on the frequency of Shopify API calls.

Install
-------

    npm install shopifapi

---------------------------------------------

Usage
---------------
```javascript
var Shopifapi = require('shopifapi');
var shopify = new Shopifapi({
    auth: {
        key: 'somereallylongauthkey',
        pwd: 'somereallylongpassword'
    },
    url: 'https://mywebsite.myshopify.com'
});
shopify.getBaseObj('products', 'collections_id=12345', function(products) {
	console.log('adding "blue" tag to all products from collection 12345:');
	products.forEach(function(product) {
		shopify.put('products', product.id, { tags: 'blue' }, function(response) {
			console.log('shopify responded with:');
			console.log(response);
		});
	});
});
```

---------------------------------------------

Options
-------
**auth**  
The `auth` object takes two items:  
* key: A shopify dev key  
* pwd: A shopify dev password  

**url**  
This is the `url` of the shopify store to connect to.
  
**verbose**  
Default: `false`. Set this to `true` if you want to watch console.log messages fly by.
  
--------------------------------------------

Methods
-------
**getBaseObj(objectName, args, callback)**  
Used for getting all objects with the given arguments. If `null` is passed for the `args` parameter, all instances of the specified object type will be returned.  
```javascript
shopifapi.getBaseObj('custom_collections', null, function(collections) {
	console.log('Here's a list of all custom_collections!');
	console.log(collections);
});
shopifapi.getBaseObj('products', 'custom_collection=54321', function(products) {
	console.log('Here's all the products from collection 54321!');
	console.log(products);
});
```  
  
**getSubObj(objectName, subObjectName, id, callback)**  
Used for getting subobjects of a base object. For example, variants of products are subobjects as are provinces of countries. `id` is the id of the base object.  
```javascript
shopifapi.getSubObj('products', 'variants', 12345, function(variants) {
	console.log("Here's all the variants for product 12345!");
	console.log(variants);
});

```  
  
**put(objectName, id, data, callback)**  
Used to update a Shopify object. If the callback returns `null`, the update was unsuccessful, otherwise the updated object's JSON is returned. Turn on `verbose` logging to see error details if issues arise.
```javascript
shopifapi.put('products', 12345, { tags: 'blue' }, function(updatedProduct) {
	console.log('I just tried to set the tags for product 12345 to "blue"');
	console.log(updatedProduct);
});
```  
  
**post(objectName, data, callback)**
Used to create a new Shopify object. If the callback returns `null`, the creation was unsuccessful, otherwise the updated object's JSON is returned. Turn on `verbose` logging to see error details if issues arise. **NOTE**: this method does not currently support the creation of subobjects.
```javascript
shopifapi.post('products', someProductData, function(newProduct) {
	console.log('I just tried to create ' + someProductData.title);
	console.log(newProduct);
});
```  
  
**queue()**  
The number of API calls enqueued. Useful for when you've hit the Shopify API call limit and the `burst-queue` is waiting until it can continue.
