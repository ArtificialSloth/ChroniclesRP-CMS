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
		crp.db.find('users', filter, {}, cb);
	};

	crp.util.getUserData = (userid, cb) => {
		if (typeof userid != 'object') userid = crp.db.objectID(userid);
		crp.db.findOne('users', {_id: userid}, cb);
	};

	crp.util.newUserObject = (user) => {
		var newUser = {
			_id: user._id,
			login: user.login,
			pass: user.pass,
			email: user.email,
			register_date: user.register_date || Date.now(),
			display_name: user.display_name || user.login,
			nicename: user.nicename || crp.util.urlSafe(user.login),
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

			crp.util.getUsers({login: data.login}, (err, users) => {
				if (err) return cb(err);

				var newUser = user;

				newUser.display_name = data.display_name || user.display_name;
				newUser.tagline = data.tagline || user.tagline;
				newUser.about = data.about || user.about;

				if (admin) {
					newUser.role = data.role || user.role;
					newUser.locked = data.locked || user.locked;
				}

				if (data.login && data.login != user.login) {
					if (data.login < 4) return cb(null, 'loginLength');
					if (users.length > 0) return cb(null, 'loginTaken');

					newUser.login = data.login;
					newUser.nicename = crp.util.urlSafe(newUser.login);
				}

				if (data.email && data.email != user.email) {
					if (!crp.util.validateEmail(data.email)) return cb(null, 'emailInvalid');

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
					if (!crp.moment(new Date(data.date_of_birth)).isValid()) return cb(null, 'dobInvalid');

					newUser.date_of_birth = crp.moment(new Date(data.date_of_birth)).format('MM/DD/YYYY');
				}

				if (data.timezone && data.timezone != user.timezone) {
					if (!crp.moment.tz.names().includes(data.timezone)) return cb(null, 'tzInvalid');

					newUser.timezone = data.timezone;
				}

				if (data.gender && data.gender != user.gender) {
					var genders = ['---', 'Bolian', 'Female', 'Male'];
					if (!genders.includes(data.gender)) return cb(null, 'genderInvalid');

					newUser.gender = data.gender;
				}

				if (data.img && data.img.profile) {
					var path = `${crp.PUBLICDIR}/img/members/${newUser._id}/${data.img.profile[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;

					crp.util.replaceFile(crp.PUBLICDIR + user.img.profile, data.img.profile[0].path, path);
					newUser.img.profile = path;
				}

				if (data.img && data.img.cover) {
					var path = `${crp.PUBLICDIR}/img/members/${newUser._id}/${data.img.cover[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;

					crp.util.replaceFile(crp.PUBLICDIR + user.img.cover, data.img.cover[0].path, path);
					newUser.img.cover = path;
				}

				if (data.old_pass && data.new_pass) {
					crp.auth.bcrypt.compare(data.old_pass, user.pass, (err, isValid) => {
						if (err) return cb(err);
						if (!isValid) return cb(null, 'passMismatch');
						if (data.new_pass.length < 6) return cb(null, 'passLength');
						if (data.new_pass != data.confirm_new_pass) return cb(null, 'newPassMismatch');

						crp.auth.bcrypt.hash(data.new_pass, 10, (err, hash) => {
							if (err) return cb(err);

							newUser.pass = hash;
							newUser = crp.util.newUserObject(newUser);
							newUser = crp.util.sanitizeObject(newUser);

							crp.db.replaceOne('users', {_id: user._id}, newUser, (err, result) => {
								cb(err, newUser);
							});
						});
					});
				} else {
					newUser = crp.util.newUserObject(newUser);
					newUser = crp.util.sanitizeObject(newUser);

					crp.db.replaceOne('users', {_id: user._id}, newUser, (err, result) => {
						cb(err, newUser);
					});
				}
			});
		});
	};

	crp.util.removeUserData = (userid, keys, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb(null, 'noUser');

			var newUser = {};
			for (var k in user) {
				if (keys.includes(k)) continue;
				newUser[k] = user[k];
			}

			newUser = crp.util.newUserObject(newUser);
			newUser = crp.util.sanitizeObject(newUser);

			crp.db.replaceOne('users', {_id: user._id}, newUser, (err, result) => {
				cb(err, newUser);
			});

		});
	};

	crp.util.addUser = (data, admin, cb) => {
		var user = {
			login: data.login,
			pass: data.pass,
			email: data.email,
			register_date: data.register_date
		};

		if (admin) {
			user.role = data.role;
		} else {
			user.activation_code = crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase();
		}

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

					crp.db.insertOne('users', user, (err, result) => {
						if (err) return cb(err);

						crp.fs.mkdir(`${crp.PUBLICDIR}/img/members/${result.insertedId}`, (err) => {
							if (err) return cb(err);

							crp.util.addProfilePage(user);
							cb(null, user);
						});
					});

				});
			} else {
				user.pass = user.pass.replace('$2y$', '$2a$');
				user = crp.util.newUserObject(user);
				user = crp.util.sanitizeObject(user);

				crp.db.insertOne('users', user, (err, result) => {
					if (err) return cb(err);

					crp.fs.mkdir(`${crp.PUBLICDIR}/img/members/${result.insertedId}`, (err) => {
						if (err) return cb(err);

						crp.util.addProfilePage(user);
						cb(null, user);
					});
				});
			}
		});
	};

	crp.util.removeUser = (userid, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb();

			crp.fs.rmdir(`${crp.PUBLICDIR}/img/members/${user._id}`, (err) => {
				if (err) return cb(err);

				crp.db.deleteOne('users', {_id: user._id}, cb);
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

		crp.pages.push({
			slug: '/members/' + user.nicename,
			path: '/members/profile/index.njk',
			subPage: '/members/profile/activity/index.njk',
			context: {
				profileid: user._id
			}
		});

		for (var i in profilePages) {
			crp.pages.push({
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

		var index = crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'slug', '/members/' + user.nicename));
		if (index > -1) crp.pages.splice(index, 1);

		for (var i in profilePages) {
			index = crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'slug', '/members/' + user.nicename + profilePages[i]));
			if (index > -1) crp.pages.splice(index, 1);
		}
	};

	callback();
};
