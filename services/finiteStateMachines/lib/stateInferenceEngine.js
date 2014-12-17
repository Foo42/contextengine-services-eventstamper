var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var async = require('async');
var binaryState = require('./binaryState');
var finiteStateDirectQueryService = require('./finiteStateDirectQueryService');

var addStatesFromConfig = function (contextEventBusReader, listener, config, callback) {
	var stateQueryService = require('./stateQueryService')(listener);
	var expressionFactory = require('../../../core/ContextExpression')(contextEventBusReader, stateQueryService);

	async.map(
		config,
		function (stateConfig, done) {
			binaryState.createRule(stateConfig, expressionFactory, done);
		},
		function (err, states) {
			console.log('finished mapping state config to states: err: ' + err);
			states.forEach(function (state) {
				listener.add(state)
			});
			console.log('added ' + states.length + ' states');

			callback(null)
		}
	);
}

module.exports = (function () {
	var module = {};

	module.subscribeToContextEvents = function (user, contextEventBusReader, contextEventBusWriter, userConfig, done) {
		console.info('attatching state inference engine');

		async.waterfall(
			[
				userConfig.getStateConfig,
				function (stateConfig, done) {
					var taskScheduler = {
						setTimeout: setTimeout,
						clearTimeout: clearTimeout,
						createCronJob: function (spec, cb) {
							return new cron.CronJob(spec, cb);
						}
					};

					var listener = new module.StateInferenceEngine();

					userConfig.watchStateConfig(function (newConfig, delta) {
						console.log('state config changed for user ' + user.id + ' ' + delta.added.length + ' states added ' + delta.removed.length + ' states removed');
						var stateHasSha = function (sha) {
							return function (state) {
								return state.sha === sha
							}
						};
						var isRemovedState = function (state) {
							return _.find(delta.removed, stateHasSha(state.sha));
						};

						listener.removeStatesWhere(isRemovedState, function (err) {
							if (err) {
								return
							};
							addStatesFromConfig(contextEventBusReader, listener, delta.added, function () {});
						});
					});

					addStatesFromConfig(contextEventBusReader, listener, stateConfig.states, function () {
						listener.on('stateChange.activated', function (event) {
							contextEventBusWriter.registerNewEvent(event, function () {})
						});
						listener.on('stateChange.deactivated', function (event) {
							contextEventBusWriter.registerNewEvent(event, function () {})
						});

						finiteStateDirectQueryService.registerStateAccessFunction(user.id, listener.getAllStates.bind(listener));

						done();
					});
				}
			],
			done
		);
	}

	module.StateInferenceEngine = function (statesToAdd) {
		var self = this;
		var states = [];
		statesToAdd = statesToAdd || [];

		self.add = function (state) {
			states.push(state);

			state.on('activated', function () {
				var stateActivedEvent = {
					type: 'stateChange.activated',
					stateName: state.name
				};
				self.emit('stateChange.activated', stateActivedEvent);
			});

			state.on('deactivated', function () {
				var stateActivedEvent = {
					type: 'stateChange.deactivated',
					stateName: state.name
				};
				self.emit('stateChange.deactivated', stateActivedEvent);
			});
		};

		self.removeStatesWhere = function removeStatesWhere(predicate, callback) {
			var removed = _.remove(states, predicate);
			removed.forEach(function (state) {
				state.dispose()
			});
			console.log('removed ' + removed.length + ' states');
			callback(null, removed);
		}

		self.processEvent = function (event) {
			states.forEach(function (state) {
				state.processEvent(event)
			});
		};

		self.getActiveStates = function () {
			return states.filter(function (state) {
				return state.active
			}).map(function (state) {
				return state.name
			});
		};

		self.getAllStates = function () {
			return states.map(function (state) {
				return {
					name: state.name,
					isActive: state.active
				};
			});
		}

		self.forEachState = function forEachState(iterator, callback) {
			states.forEach(function (state) {
				iterator(state);
			});
			callback && callback(null);
		};

		self.isStateActive = function isStateActive(stateName, callback) {
			var state = _.find(states, function (state) {
				return state.name === stateName
			});
			var isActive = state && state.active;
			return callback(null, isActive);
		};

		statesToAdd.forEach(function (state) {
			self.add(state);
		});
	};

	util.inherits(module.StateInferenceEngine, EventEmitter);

	return module;
})();