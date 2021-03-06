var assert = require('assert');
var http = require('http');
var request = require('request');
var path = require('path');
var cheerio = require('cheerio');
var fork = require('child_process').fork;

describe('application', function () {
	var app;
	var server;
	var host = 'http://localhost:9005';
	var child;

	beforeEach(function (done) {
		this.timeout(8000);
		var childEnv = {};
		childEnv.OFFLINE_MODE = true;
		childEnv.RABBITMQ_HOST = 'localdocker';
		childEnv.USER_DATA_PATH = path.join(__dirname, '../data/userSpecific');
		child = fork('./index.js', {
			env: childEnv,
			silent: false
		});
		child.on('message', function (msg) {
			try {
				if (JSON.parse(msg).status === 'ready') {
					console.log('recieved ready message from child process (SUT)');
					return done();
				}
			} catch (e) {
				console.warn('recieved non json msg from child', msg);
			}
		});
	});

	function assertIsRedirectTo(response, path) {
		assert.equal(response.statusCode, 302);
		assert.equal(response.headers['location'], '/events/recent')
	}

	afterEach(function (done) {
		setTimeout(function () {
			console.log('about to kill child after test...');

			child.once('exit', function (code) {
				console.log('child exited with code ' + code)
				done();
			});

			child.kill();
			console.log('sent kill, waiting for child to die');
		}, 100);
	});

	it('should start, allow an event to be submitted and list that event when queried for recent events', function (done) {
		request.post({
			url: host + '/events/text',
			form: {
				eventText: 'testing'
			}
		}, function (err, response, body) {
			assert.ifError(err);
			assertIsRedirectTo(response, '/events/recent');

			setTimeout(function () {
				request.get({
					url: host + '/events/recent'
				}, function (err, response, body) {
					assert.ifError(err);
					var $ = cheerio.load(body);
					console.log('li first = ' + $('li').eq(0).text());
					console.log('li second  = ' + $('li').eq(1).text());
					assert.equal($('li').eq(0).text(), 'type: text detail:testing');
					assert.equal($('li').eq(1).text(), 'type: stateChange.activated detail:testing');
					done();
				});
			}, 200);
		});
	});

	it('should allow querying of active states', function (done) {
		request.get({
			url: host + '/states/active'
		}, function (err, response, body) {
			assert.ifError(err);
			assert.equal(response.statusCode, 200);
			done();
		});
	});
});
