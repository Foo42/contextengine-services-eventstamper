var logger = require('../../core/logger');
var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var file = __dirname + '/../../data/users.json';
var users;

var loadUsersFromFile = function loadUsersFromFile() {
	if (users) {
		return Promise.resolve(users);
	}

	return fs.readFileAsync(file, 'utf8').then(function (data) {
		users = JSON.parse(data);
		logger.info(users.length + ' users loaded from file');
		return users;
	});
};

var userHasEmailAddressOf = function (user, address) {
	return user.emails.filter(function (email) {
		return email.value.toLowerCase() == address.toLowerCase()
	}).length > 0;
}

module.exports = {
	findUser: function (user, done) {
		loadUsersFromFile().then(function (users) {
			var foundUser = _.any(users, function (registeredUser) {
				return userHasEmailAddressOf(user, registeredUser.emailAddress);
			});

			if (!foundUser) {
				done("ERROR: user not found");
			} else {
				done(null, user);
			}
		}).catch(function (err) {
			logger.error('Promblem loading users from file', err);
		});
	},

	getAllRegisteredUsers: loadUsersFromFile,
	getAllRegisteredUsers_: loadUsersFromFile
}
