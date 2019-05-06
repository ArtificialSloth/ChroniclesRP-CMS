module.exports = (crp) => {
	var schema = new crp.db.Schema({
		login: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80,
			lowercase: true,
			validate: {
				msg: 'Login {VALUE} is already in use.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						crp.users.find({_id: {$not: {$eq: this._id}}, login: val}, (err, users) => {
							if (err) return reject(err);
							if (users && users.length > 0) return resolve(false);
							resolve(true);
						});
					});
				}
			},
			set: function(val) {
				this.set('nicename', crp.util.urlSafe(val));
				return val;
			}
		},
		pass: {
			type: String,
			required: true,
			minlength: 6
		},
		email: {
			type: String,
			required: true,
			lowercase: true,
			validate: [
				{
					msg: '{VALUE} is not a valid email address.',
					validator: function(val) {
						return (val.includes('@') && val.lastIndexOf('.') > val.lastIndexOf('@'));
					}
				},
				{
					msg: '{VALUE} is already in use.',
					validator: function(val) {
						return new Promise((resolve, reject) => {
							crp.users.find({_id: {$not: {$eq: this._id}}, email: val}, (err, users) => {
								if (err) return reject(err);
								if (users && users.length > 0) return resolve(false);
								resolve(true);
							});
						});
					}
				}
			]
		},
		register_date: {
			type: Date,
			default: Date.now()
		},
		display_name: {
			type: String,
			minlength: 4,
			maxlength: 80,
			default: function() {
				return this.login;
			}
		},
		nicename: {
			type: String,
			lowercase: true,
			default: function() {
				return crp.util.urlSafe(this.login);
			}
		},
		role: {
			type: Number,
			min: 0,
			default: 0
		},
		locked: {
			type: Boolean,
			default: false
		},
		timezone: {
			type: String,
			default: crp.moment.tz.guess()
		},
		date_of_birth: {
			type: String,
			validate: {
				msg: 'Invalid date format.',
				validator: function(val) {
					return val == '' ? true : crp.moment(new Date(val)).isValid();
				}
			},
			set: function(val) {
				return val == '' ? '' : crp.moment(new Date(val)).format('MM/DD/YYYY');
			}
		},
		gender: {
			type: String,
			enum: ['---', 'Male', 'Female', 'Bolian'],
			default: '---'
		},
		tagline: {
			type: String,
			maxlength: 140
		},
		img: {
			profile: {
				type: String,
				default: null
			},
			cover: {
				type: String,
				default: null
			}
		}
	});

	schema.methods.parseRole = function() {
		if (this.role == 0) {
			return 'Pending';
		} else if (this.role == 1) {
			return 'Member';
		} else if (this.role == 2) {
			return 'Chapter Leader';
		} else if (this.role == 3) {
			return 'Administrator';
		}

		return 'Guest';
	};

	schema.methods.getProfilePic = function() {
		return crp.storage.getUrl(this.img.profile) || crp.storage.getUrl('img/members/profile.png');
	};

	schema.methods.getCoverPic = function() {
		return crp.storage.getUrl(this.img.cover) || crp.storage.getUrl('img/cover.png');
	};

	schema.methods.getChapterInvites = function(chapters) {
		var result = [];
		for (var i in chapters) {
			var member = chapters[i].getMember(this._id);
			if (member && member.role == 0) {
				result.push(chapters[i]);
			}
		}
		return result;
	};

	crp.users = new crp.db.model('user', schema);

	crp.pages.add((slug, cb) => {
		if (slug == '/admin/users') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/members/admin/index.njk',
			role: 3
		});

		crp.users.find({}, (err, users) => {
			if (err) return cb(err);

			var pages = [
				{slug: 'chapters'},
				{slug: 'account', context: {timezones: crp.moment.tz.names()}}
			];

			for (var i in users) {
				if (slug == `/members/${users[i].nicename}`) return cb(null, {
					path: '/members/profile/index.njk',
					subPage: `/members/profile/activity/index.njk`,
					context: {
						profileid: users[i]._id
					}
				});

				for (var p in pages) {
					if (slug == `/members/${users[i].nicename}/${pages[p].slug}`) return cb(null, {
						path: '/members/profile/index.njk',
						subPage: `/members/profile/${pages[p].slug}/index.njk`,
						context: Object.assign({
							profileid: users[i]._id
						}, pages[p].context)
					});
				}
			}

			cb();
		});
	});
};
