module.exports = (crp, callback) => {
	crp.util.validateEmail = (email) => {
		var domain = email.split('@')

		if (domain[0] != email && domain.length == 2 && domain[0].length >= 1) {
			var dot = domain[1].split('.');
			if (dot[0] != domain[1] && dot.length == 2 && dot[0].length >= 1) {
				return true;
			}
		}

		return false;
	};

	crp.util.emailConfirmCode = (userid) => {
		crp.util.wait(15 * 60 * 1000, () => {
			crp.util.removeUserData(userid, ['new_email', 'activation_code'], (err, newUser) => {
				if (err) console.error(err);
			});
		});

		return crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase();
	};

	crp.util.getUsers = (filter, cb) => {
		crp.db.collection(crp.db.PREFIX + 'users').find(filter).toArray(cb);
	};

	crp.util.getUserData = (userid, cb) => {
		crp.db.collection(crp.db.PREFIX + 'users').findOne({_id: userid}, cb);
	};

	crp.util.newUserObject = (user) => {
		var newUser = {
			_id: user._id,
			login: user.login,
			pass: user.pass,
			email: user.email,
			register_date: user.register_date || Date.now(),
			display_name: user.display_name || user.login,
			nicename: user.nicename || user.login.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			role: user.role || 'pending',
			locked: user.locked || false,
			timezone: user.timezone || crp.moment.tz.guess(),
			date_of_birth: user.date_of_birth,
			gender: user.gender || '---',
			tagline: user.tagline,
			about: user.about,
			img: user.img || {},
		};

		if (user.activation_code) newUser.activation_code = user.activation_code;
		if (user.new_email) newUser.new_email = user.new_email;

		return newUser;
	};

	crp.util.setUserData = (userid, data, admin, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb(null, 'noUser');

			crp.async.waterfall([
				(callback) => {
					var newUser = user;

					newUser.display_name = data.display_name || user.display_name;
					newUser.tagline = data.tagline || user.tagline;
					newUser.about = data.about || user.about;

					if (admin) {
						newUser.role = data.role || user.role;
						newUser.locked = data.locked || user.locked;
					}

					if (data.login && data.login != user.login) {
						if (data.login < 4) return callback('loginLength');
						if (crp.util.getUsers({filter: ['login', data.login]}).length > 0) {
							return callback('loginTaken');
						}

						newUser.login = data.login;
						newUser.nicename = newUser.login.toLowerCase().replace(/[^a-z0-9]+/g, '-');
					}

					if (data.email && data.email != user.email) {
						if (!crp.util.validateEmail(data.email)) return callback('emailInvalid');

						if (admin) {
							newUser.email = data.email;
						} else {
							newUser.new_email = data.email;
							newUser.activation_code = crp.util.emailConfirmCode(newUser._id);

							var subject = 'Confirm your new email address';
							var msg = 'Please use the following code to confirm your new email address <div style="font-size:20px; text-align:center">' + newUser.activation_code + '</div>';
							crp.util.mail(newUser.new_email, subject, msg);
						}
					}

					if (data.date_of_birth && data.date_of_birth != user.date_of_birth) {
						if (!crp.moment(new Date(data.date_of_birth)).isValid()) return callback('dobInvalid');

						newUser.date_of_birth = crp.moment(new Date(data.date_of_birth)).format('MM/DD/YYYY');
					}

					if (data.timezone && data.timezone != user.timezone) {
						if (!crp.moment.tz.names().includes(data.timezone)) return callback('tzInvalid');

						newUser.timezone = data.timezone;
					}

					if (data.gender && data.gender != user.gender) {
						var genders = ['---', 'Bolian', 'Female', 'Male'];
						if (!genders.includes(data.gender)) return callback('genderInvalid');

						newUser.gender = data.gender;
					}

					if (data.img && data.img.profile) {
						var path = '/img/members/' + newUser.nicename + '/' + data.img.profile[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');

						crp.util.replaceFile(crp.PUBLICDIR + user.img.profile, data.img.profile[0].path, crp.PUBLICDIR + path);
						newUser.img.profile = path;
					}

					if (data.img && data.img.cover) {
						var path = '/img/members/' + newUser.nicename + '/' + data.img.cover[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');

						crp.util.replaceFile(crp.PUBLICDIR + user.img.cover, data.img.cover[0].path, crp.PUBLICDIR + path);
						newUser.img.cover = path;
					}

					callback(null, newUser);
				},
				(newUser, callback) => {
					if (!data.old_pass || !data.new_pass) return callback(null, newUser);
					crp.auth.bcrypt.compare(data.old_pass, user.pass, (err, isValid) => {
						if (err || !isValid) return callback('passMismatch');
						if (data.new_pass.length < 6) return callback('passLength');
						if (data.new_pass != data.confirm_new_pass) return callback('newPassMismatch');

						crp.auth.bcrypt.hash(data.new_pass, 10, (err, hash) => {
							if (err) return callback('hashingError');

							newUser.pass = hash;
							callback(null, newUser);
						});
					});
				}
			], (err, newUser) => {
				if (err) return cb(err);

				newUser = crp.util.newUserObject(newUser);
				newUser = crp.util.sanitizeObject(newUser);

				crp.db.collection(crp.db.PREFIX + 'users').replaceOne({_id: user._id}, newUser);

				cb(newUser);
			});
		});
	};

	crp.util.removeUserData = (userid, keys, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb();

			var newUser = {};
			for (var k in user) {
				if (keys.includes(k)) continue;
				newUser[k] = user[k];
			}

			newUser = crp.util.newUserObject(newUser);
			newUser = crp.util.sanitizeObject(newUser);

			crp.db.collection(crp.db.PREFIX + 'users').replaceOne({_id: user._id}, newUser);

			cb(null, newUser);
		});
	};

	crp.util.addUser = (data, cb) => {
		var user = {
			login: data.login,
			pass: data.pass,
			email: data.email,
			register_date: data.register_date,
			activation_code: crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase()
		};

		crp.util.getUsers({login: user.login}, (err, result) => {
			if (err) return cb(err);

			if (user.login.length < 4) return cb(null, 'loginLength');
			if (result.length > 0) return cb(null, 'loginTaken');
			if (!crp.util.validateEmail(user.email)) return cb(null, 'emailInvalid');

			if (user.register_date) {
				user.register_date = Date.parse(user.register_date);
			}

			if (user.pass.length < 6) return cb(null, 'passLength');
			if (!data.encrypted) {
				crp.auth.bcrypt.hash(user.pass, 10, (err, hash) => {
					if (err) return cb(err);

					user.pass = hash;
					user = crp.util.newUserObject(user);
					user = crp.util.sanitizeObject(user);

					crp.db.collection(crp.db.PREFIX + 'users').insertOne(user);
					crp.util.addProfilePage(user);

					cb(null, user);
				});
			} else {
				user.pass = user.pass.replace('$2y$', '$2a$');
				user = crp.util.newUserObject(user);
				user = crp.util.sanitizeObject(user);

				crp.db.collection(crp.db.PREFIX + 'users').insertOne(user, (err, result) => {
					if (err) return cb(err);

					crp.util.addProfilePage(user);
					cb(null, user);
				});
			}
		});
	};

	crp.util.removeUser = (userid, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb();

			crp.db.collection(crp.db.PREFIX + 'users').deleteOne({_id: user._id}, (err, result) => {
				if (err) return cb(err);

				cb(result);
			});
		});
	};

	crp.util.addProfilePage = (user) => {
		var profilePages = [
			{page: '/info'},
			{page: '/friends'},
			{page: '/chapters'},
			{page: '/messages'},
			{page: '/account', context: {timezones: crp.moment.tz.names()}},
			{page: '/settings'}
		];

		crp.global.pages.push({
			slug: '/members/' + user.nicename,
			path: '/members/profile/index.njk',
			subPage: '/members/profile/activity/index.njk',
			context: {
				profileid: user._id
			}
		});

		for (var i in profilePages) {
			crp.global.pages.push({
				slug: '/members/' + user.nicename + profilePages[i].page,
				path: '/members/profile/index.njk',
				subPage: '/members/profile' + profilePages[i].page + '/index.njk',
				context: Object.assign({
					profileid: user._id
				}, profilePages[i].context)
			});
		}
	};

	crp.util.removeProfilePage = (user) => {
		var profilePages = [
			'/info',
			'/friends',
			'/chapters',
			'/messages',
			'/account',
			'/settings'
		];

		var index = crp.global.pages.indexOf(crp.util.findObjectInArray(crp.global.pages, 'slug', '/members/' + user.nicename));
		if (index > -1) crp.global.pages.splice(index, 1);

		for (var i in profilePages) {
			index = crp.global.pages.indexOf(crp.util.findObjectInArray(crp.global.pages, 'slug', '/members/' + user.nicename + profilePages[i]));
			if (index > -1) crp.global.pages.splice(index, 1);
		}
	};

	callback();
};
