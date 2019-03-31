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
						crp.users.find({login: val}, (err, users) => {
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
							crp.users.find({email: val}, (err, users) => {
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
				return this.login;
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
					return crp.moment(new Date(val)).isValid();
				}
			},
			set: function(val) {
				return crp.moment(new Date(val)).format('MM/DD/YYYY');
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
			default: {},
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

	crp.users = new crp.db.model('user', schema);

	crp.members = {};
	crp.members.set = (userid, data, cb) => {
		crp.members.get(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');

			crp.members.find({login: (data.login ? data.login.toLowerCase() : null)}, (err, users) => {
				if (err) return cb(err);
				if (users && users.length > 0 && data.login.toLowerCase() != user.login) return cb('loginTaken');

				crp.members.find({email: (data.email ? data.email.toLowerCase() : null)}, (err, users) => {
					if (err) return cb(err);
					if (users && users.length > 0 && data.email.toLowerCase() != user.email) return cb('emailTaken');

					var newUser = {
						_id: user._id,
						login: data.login ? data.login.toLowerCase() : user.login,
						pass: data.pass || user.pass,
						email: data.email ? data.email.toLowerCase() : user.email,
						register_date: user.register_date,
						display_name: data.display_name || user.display_name || user.login,
						nicename: crp.util.urlSafe(data.login) || user.nicename,
						role: parseInt(data.role) || user.role,
						locked: data.locked ? !!+data.locked : user.locked,
						timezone: data.timezone || user.timezone || crp.moment.tz.guess(),
						date_of_birth: (typeof data.date_of_birth != 'undefined') ? data.date_of_birth : user.date_of_birth,
						gender: data.gender || user.gender,
						tagline: (typeof data.tagline != 'undefined') ? data.tagline : user.tagline,
						about: (typeof data.about != 'undefined') ? data.about : user.about,
						img: user.img || {},
					};

					if (newUser.login.length < 4 || newUser.login.length > 80) return cb('loginLength');
					if (!crp.members.validateEmail(newUser.email)) return cb('emailInvalid');
					if (newUser.display_name.length < 4 || newUser.display_name.length > 80) return cb('displayNameLength');

					if (newUser.date_of_birth && !crp.moment(new Date(newUser.date_of_birth)).isValid()) return cb('dobInvalid');
					if (newUser.date_of_birth) crp.moment(new Date(newUser.date_of_birth)).format('MM/DD/YYYY');

					if (!crp.moment.tz.names().includes(newUser.timezone)) return cb('tzInvalid');
					if (!['---', 'Bolian', 'Female', 'Male'].includes(newUser.gender)) return cb('genderInvalid');

					crp.async.parallel([
						(callback) => {
							if (!data.img || !data.img.profile) return callback();

							crp.storage.delete(user.img.profile, (err) => {
								if (err) return callback(err);

								crp.storage.upload(data.img.profile[0].path, `img/members/${newUser._id}/${data.img.profile[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(data.img.profile[0].path, (err) => {
										if (err) return callback(err);

										newUser.img.profile = file.name;
										callback();
									});
								});
							});
						},
						(callback) => {
							if (!data.img || !data.img.cover) return callback();

							crp.storage.delete(user.img.cover, (err) => {
								if (err) return callback(err);

								crp.storage.upload(data.img.cover[0].path, `img/members/${newUser._id}/${data.img.cover[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(data.img.cover[0].path, (err) => {
										if (err) return callback(err);

										newUser.img.cover = file.name;
										callback();
									});
								});
							});
						},
						(callback) => {
							if (newUser.pass == user.pass) return callback();
							if (newUser.pass.length < 6) return callback('passLength');

							crp.auth.bcrypt.hash(newUser.pass, 10, (err, hash) => {
								if (err) return callback(err);

								newUser.pass = hash;
								callback();
							});
						}
					], (err) => {
						if (err) return cb(err);

						newUser = crp.util.sanitizeObject(newUser);
						crp.db.replaceOne('users', {_id: user._id}, newUser, cb);
					});
				});
			});
		});
	};

	crp.members.add = (data, cb) => {
		var user = {
			login: data.login.toLowerCase(),
			pass: data.pass,
			email: data.email.toLowerCase(),
			register_date: Date.parse(data.register_date) || Date.now(),
			display_name: data.login,
			nicename: crp.util.urlSafe(data.login),
			role: parseInt(data.role) || 0,
			locked: false,
			timezone: crp.moment.tz.guess(),
			date_of_birth: null,
			gender: '---',
			tagline: '',
			about: '',
			img: {}
		};

		crp.members.find({login: user.login}, (err, users) => {
			if (err) return cb(err);
			if (users && users.length > 0) return cb('loginTaken');

			crp.members.find({email: user.email}, (err, users) => {
				if (err) return cb(err);
				if (users && users.length > 0) return cb('emailTaken');

				if (!user.login || user.login.length < 4 || user.login.length > 80) return cb('loginLength');
				if (!crp.members.validateEmail(user.email)) return cb('emailInvalid');
				if (!user.pass || user.pass.length < 6) return cb('passLength');

				crp.async.parallel([
					(callback) => {
						if (!data.encrypted) {
							crp.auth.bcrypt.hash(user.pass, 10, (err, hash) => {
								if (err) return callback(err);

								user.pass = hash;
								callback();
							});
						} else {
							user.pass = user.pass.replace('$2y$', '$2a$');
							callback();
						}
					}
				], (err) => {
					if (err) return cb(err);

					user = crp.util.sanitizeObject(user);
					crp.db.insertOne('users', user, (err, result) => {
						if (err) return cb(err);

						user._id = result.insertedId;
						cb(null, user);
					});
				});
			});
		});
	};

	crp.pages.add((slug, cb) => {
		if (slug == '/admin/users') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/members/admin/index.njk',
			role: 3
		});

		crp.members.find({}, (err, users) => {
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
