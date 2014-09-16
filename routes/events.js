var getContextEventBusWriter = require('../core/contextEventBusWriter');

module.exports = function () {
	var eventsModule = {};

	eventsModule.capture = (function () {
		var capture = {};

		capture.text = (function () {
			var text = {};

			text.get = function (req, res) {
				res.render('text-event-capture-form', {
					title: 'Capture Event'
				});
			};

			text.post = function (req, res) {
				var event = {
					type: 'text',
					text: req.body.eventText
				};
				getContextEventBusWriter(req.user.id).registerNewEvent(event);
				setTimeout(function () {
					res.redirect('/events/recent');
				}, 100);
			}

			return text;
		})();


		return capture;
	})();

	eventsModule.listRecent = function (req, res) {
		req.user.getContextEngine().then(function (contextEngine) {
			contextEngine.getRecentEvents(function (err, recentEvents) {
				var eventsVm = recentEvents.map(function (event) {
					return {
						type: event.type,
						detail: (event.text || event.stateName)
					}
				})
				res.render('events-list', {
					title: 'Recent Events',
					events: eventsVm
				});
			});
		}).catch(res.send.bind(res, 500));
	}

	return eventsModule;
}
