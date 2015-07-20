'use strict';

import Launchpad from '../../src/api/Launchpad';
import Transport from '../../src/api/Transport';

describe('Launchpad', function() {

	beforeEach(function() {
		this.xhr = sinon.useFakeXMLHttpRequest();

		var requests = this.requests = [];

		this.xhr.onCreate = function(xhr) {
			requests.push(xhr);
		};
	});

	afterEach(function() {
		this.xhr.restore();
	});

	it('should throws exception when socket.io is not loaded', function() {
		assert.throws(function() {
			Launchpad.url('/url').connect();
		}, Error);
	});

	it('should socket.io use path from client url', function(done) {
		window.io = function(url, opts) {
			assert.strictEqual('domain:8080', url);
			assert.deepEqual({
				path: '/path/'
			}, opts);
			done();
		};
		Launchpad.url('http://domain:8080/path').connect();
		delete window.io;
	});

	it('should socket.io use path from client url and ignore from options', function(done) {
		window.io = function(url, opts) {
			assert.strictEqual('domain:8080', url);
			assert.deepEqual({
				path: '/path/'
			}, opts);
			done();
		};
		Launchpad.url('http://domain:8080/path').connect({
			path: '/ignore'
		});
		delete window.io;
	});

	it('should use different transport', function() {
		var transport = new Transport();
		var client = Launchpad.url().use(transport);
		assert.strictEqual(transport, client.customTransport_);
		assert.ok(client instanceof Launchpad);
	});

	it('should change full url', function() {
		var transport = new Transport();
		var parent = Launchpad.url('http://other:123').use(transport);
		assert.strictEqual('http://other:123/', parent.url());
	});

	it('should inherit parent transport', function() {
		var transport = new Transport();
		var parent = Launchpad.url().use(transport);
		var child = parent.path('/path');
		assert.strictEqual(parent.customTransport_, child.customTransport_);
	});

	it('should send DELETE request', function(done) {
		Launchpad.url('/url').delete().then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			assert.strictEqual('DELETE', response.request().method());
			assert.ok(!response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send GET request', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			assert.strictEqual('GET', response.request().method());
			assert.ok(!response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send POST request with body', function(done) {
		Launchpad.url('/url').post('body').then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			assert.strictEqual('POST', response.request().method());
			assert.strictEqual('"body"', response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send PUT request with body', function(done) {
		Launchpad.url('/url').put('body').then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			assert.strictEqual('PUT', response.request().method());
			assert.strictEqual('"body"', response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send PATCH request with body', function(done) {
		Launchpad.url('/url').patch('body').then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			assert.strictEqual('PATCH', response.request().method());
			assert.strictEqual('"body"', response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should create new client instance based on parent client', function() {
		var books = Launchpad.url('/books');
		var book1 = books.path('/1');
		assert.notStrictEqual(book1, books);
		assert.strictEqual('/books/', books.url());
		assert.strictEqual('/books/1', book1.url());
	});

	it('should send request to url without path', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.strictEqual('/url/', response.request().url());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send request to url with path', function(done) {
		Launchpad.url('/url/a').get().then(function(response) {
			assert.strictEqual('/url/a/', response.request().url());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should send request with query string', function(done) {
		Launchpad.url('/url/a')
			.param('query', 1)
			.get()
			.then(function(response) {
				assert.strictEqual('{"query":[1]}', response.request().params().toString());
				done();
			});
		this.requests[0].respond(200);
	});

	it('should send request with header string', function(done) {
		Launchpad.url('/url/a')
			.header('header', 1)
			.get()
			.then(function(response) {
				assert.strictEqual('{"content-type":["application/json"],"x-pjax":["true"],"x-requested-with":["XMLHttpRequest"],"header":[1]}', response.request().headers().toString());
				done();
			});
		this.requests[0].respond(200);
	});

	it('should send request with multiple header of same name', function(done) {
		Launchpad.url('/url/a')
			.header('header', 1)
			.header('header', 2)
			.get()
			.then(function(response) {
				assert.strictEqual('{"content-type":["application/json"],"x-pjax":["true"],"x-requested-with":["XMLHttpRequest"],"header":[2]}', response.request().headers().toString());
				done();
			});
		this.requests[0].respond(200);
	});

	it('should serialize body of json requests', function(done) {
		Launchpad.url('/url').header('content-type', 'application/json').post({
			foo: 1
		}).then(function(response) {
			assert.strictEqual('{"foo":1}', response.request().body());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should deserialize body of json responses', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.deepEqual({
				foo: 1
			}, response.body());
			done();
		});
		this.requests[0].respond(200, {
			'content-type': 'application/json'
		}, '{"foo": 1}');
	});

	it('should support FormData as request body', function(done) {
		var formData = new FormData();
		Launchpad.url('/url').post(formData).then(function(response) {
			assert.strictEqual(formData, response.request().body());
			assert.strictEqual(undefined, response.request().headers().get('content-type'));
			done();
		});
		this.requests[0].respond(200);
	});

	it('should wrap dom element request body as form data', function(done) {
		var form = document.createElement('form');
		Launchpad.url('/url').post(form).then(function(response) {
			assert.ok(response.request().body() instanceof FormData);
			done();
		});
		this.requests[0].respond(200);
	});

	it('should response succeeded for status codes 2xx', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.ok(response.succeeded());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should response succeeded for status codes 3xx', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.ok(response.succeeded());
			done();
		});
		this.requests[0].respond(200);
	});

	it('should response not succeeded for status codes 4xx', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.ok(!response.succeeded());
			done();
		});
		this.requests[0].respond(400);
	});

	it('should response not succeeded for status codes 5xx', function(done) {
		Launchpad.url('/url').get().then(function(response) {
			assert.ok(!response.succeeded());
			done();
		});
		this.requests[0].respond(500);
	});

	it('should throws exception for invalid constructor', function() {
		assert.throws(function() {
			new Launchpad();
		}, Error);
	});

	it('should throws exception for invalid query arguments', function() {
		assert.throws(function() {
			Launchpad.url('/url').param();
		}, Error);

		assert.throws(function() {
			Launchpad.url('/url').param('name');
		}, Error);
	});

	it('should throws exception for invalid header arguments', function() {
		assert.throws(function() {
			Launchpad.url('/url').header();
		}, Error);

		assert.throws(function() {
			Launchpad.url('/url').header('name');
		}, Error);
	});

	it('should throws exception for invalid header arguments', function() {
		assert.throws(function() {
			Launchpad.url('/url').header();
		}, Error);

		assert.throws(function() {
			Launchpad.url('/url').header('name');
		}, Error);
	});
});