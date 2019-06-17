module.exports = (crp) => {
	crp.events = crp.db.model('event', new crp.db.Schema({
		creator: {
			type: crp.db.Schema.Types.ObjectId,
			required: true
		},
		chapter: {
			type: crp.db.Schema.Types.ObjectId,
			required: true
		},
		name: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80,
		},
		startDate: {
			type: Date,
			required: true
		},
		endDate: {
			type: Date,
			required: true,
			validate: {
				msg: 'endDate is earlier than startDate.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						if (this.constructor.name === 'Query') {
							crp.events.findById({_id: this._conditions._id}, (err, event) => {
								if (err) return reject(err);
								if (!event) return reject('noEvent');

								if (crp.moment(val).isBefore(event.startDate)) return resolve(false);
								resolve(true);
							});
						} else {
							if (crp.moment(val).isBefore(this.startDate)) return resolve(false);
							resolve(true);
						}
					});
				}
			}
		},
		desc: String
	}));

	crp.calendar = (offset = 0) => {
		var calendar = [];
		var startDay = crp.moment().add(offset, 'months').startOf('month').startOf('week');
		var endDay = crp.moment().add(offset, 'months').endOf('month').endOf('week');

		var index = startDay.subtract(1, 'days');
		while (index.isBefore(endDay, 'day')) {
			calendar.push(Array(7).fill(0).map(() => {
				return index.add(1, 'days').valueOf();
			}));
		}

		return calendar;
	};

	crp.events.jobs = {};
	crp.events.cronJob = function() {
		crp.events.findById(this.eventid, (err, event) => {
			if (err) return console.error(err);
			if (!event) return console.error('noEvent');

			crp.chapters.findById(event.chapter, (err, chapter) => {
				if (err) return console.error(err);
				if (!chapter) return console.error('noChapter');

				crp.discord.send(this.msg, process.env.DISCORD_ANNOUNCEMENTS, (err, result) => {
					if (err) console.error(err);
				});
			});
		});
	};

	crp.events.addJobs = (event) => {
		var beforeStartDate = crp.moment(event.startDate).subtract(30, 'minutes');
		var startDate = crp.moment(event.startDate);
		var endDate = crp.moment(event.endDate);

		if (startDate.isAfter(crp.moment())) {
			crp.chapters.findById(event.chapter, (err, chapter) => {
				if (err) return console.error(err);
				if (!chapter) return console.error('noChapter');

				try {
					crp.events.jobs[event._id] = [];

					var msg = `**${chapter.name}** event: *${event.name}*, is starting (${startDate.tz('America/New_York').format('h:mma')} to ${endDate.tz('America/New_York').format('h:mma z')}).\nSee event details here: https://chroniclesrp.com/events/${event._id}`;
					crp.events.jobs[event._id].push(new crp.cron(startDate, crp.events.cronJob, null, true, null, {eventid: event._id, msg: msg}));

					if (beforeStartDate.isAfter(crp.moment())) {
						msg = `**${chapter.name}** event: *${event.name}*, starts in 30 minutes (${startDate.tz('America/New_York').format('h:mma')} to ${endDate.tz('America/New_York').format('h:mma z')}).\nSee event details here: https://chroniclesrp.com/events/${event._id}`;
						crp.events.jobs[event._id].push(new crp.cron(beforeStartDate, crp.events.cronJob, null, true, null, {eventid: event._id, msg: msg}));
					}
				} catch (e) {
					console.error(e);
				}
			});
		}
	};

	crp.events.find({}, (err, events) => {
		if (err) return console.error(err);

		for (var i in events) {
			crp.events.addJobs(events[i]);
		}
	});

	crp.pages.add((slug, cb) => {
		if (slug == '/events') return cb(null, {
			path: '/events/index.njk',
			subPage: '/events/calendar/index.njk'
		});

		crp.events.find({}, (err, events) => {
			if (err) return cb(err);

			for (var i in events) {
				if (slug == `/events/${events[i]._id}`) return cb(null, {
					path: '/events/event/index.njk',
					context: {eventid: events[i]._id}
				});
			}

			cb();
		});
	});
};
