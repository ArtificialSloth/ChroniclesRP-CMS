module.exports = (crp) => {
	crp.events = crp.db.model('event', new crp.db.Schema({
		creator: crp.db.Schema.Types.ObjectId,
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
					if (this.startDate <= val) return false;
					return true;
				}
			}
		},
		desc: {
			type: String,
			minlength: 4
		}
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

	crp.pages.add((slug, cb) => {
		if (slug == '/events') return cb(null, {
			path: '/events/index.njk'
		});
	});
};
