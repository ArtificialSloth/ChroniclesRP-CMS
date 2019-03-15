module.exports = (crp) => {
	crp.members = {};

	crp.members.validateEmail = (email) => {
		var domain = email.split('@')

		if (domain[0] != email && domain.length == 2 && domain[0].length >= 1) {
			var dot = domain[1].split('.');
			if (dot[0] != domain[1] && dot.length == 2 && dot[0].length >= 1) {
				return true;
			}
		}

		return false;
	};

	crp.members.emailConfirmCode = (userid) => {
		crp.util.wait(15 * 60 * 1000, () => {
			crp.members.removeData(userid, ['new_email', 'activation_code'], (err, newUser) => {
				if (err) console.error(err);
			});
		});

		return crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase();
	};

	crp.members.find = (filter, cb) => {
		crp.db.find('users', filter, {}, cb);
	};

	crp.members.get = (userid, cb) => {
		if (typeof userid != 'object') userid = crp.db.objectID(userid);
		crp.db.findOne('users', {_id: userid}, cb);
	};

	crp.members.newUserObject = (user) => {
		var newUser = {
			_id: user._id,
			login: user.login,
			pass: user.pass,
			email: user.email,
			register_date: user.register_date || Date.now(),
			display_name: user.display_name || user.login,
			nicename: user.nicename || crp.util.urlSafe(user.login),
			role: parseInt(user.role) || 0,
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

	crp.members.set = (userid, data, admin, cb) => {
		crp.members.get(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb(null, 'noUser');

			crp.members.find({login: (data.login ? data.login.toLowerCase() : null)}, (err, users) => {
				if (err) return cb(err);

				var newUser = user;

				newUser.display_name = data.display_name || user.display_name;
				newUser.tagline = data.tagline || user.tagline;
				newUser.about = data.about || user.about;

				if (admin) {
					newUser.role = data.role || user.role;
					newUser.locked = (data.locked == 'on') ? true : false;
				}

				if (data.login && data.login != user.login) {
					if (data.login < 4) return cb(null, 'loginLength');
					if (users.length > 0) return cb(null, 'loginTaken');

					newUser.login = data.login.toLowerCase();
					newUser.nicename = crp.util.urlSafe(newUser.login);
				}

				if (data.email && data.email != user.email) {
					if (!crp.members.validateEmail(data.email)) return cb(null, 'emailInvalid');

					if (admin) {
						newUser.email = data.email.toLowerCase();
					} else {
						newUser.new_email = data.email.toLowerCase();
						newUser.activation_code = crp.members.emailConfirmCode(newUser._id);

						var subject = 'Confirm your new email address';
						var msg = 'Please use the following code to confirm your new email address <div style="font-size:20px; text-align:center">' + newUser.activation_code + '</div>';
						crp.mail.send(newUser.new_email, subject, msg);
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
						if (admin) {
							if (!data.old_pass || !data.new_pass || !data.confirm_new_pass) return callback();
							if (data.new_pass.length < 6) return callback('passLength');

							crp.auth.bcrypt.hash(data.new_pass, 10, (err, hash) => {
								if (err) return callback(err);

								newUser.pass = hash;
								callback();
							});
						} else {
							if (!data.old_pass || !data.new_pass || !data.confirm_new_pass) return callback();

							crp.auth.bcrypt.compare(data.old_pass, user.pass, (err, isValid) => {
								if (err) return callback(err);
								if (!isValid) return callback('passMismatch');

								if (data.new_pass.length < 6) return callback('passLength');
								if (data.new_pass != data.confirm_new_pass) return callback('newPassMismatch');

								crp.auth.bcrypt.hash(data.new_pass, 10, (err, hash) => {
									if (err) return callback(err);

									newUser.pass = hash;
									callback();
								});
							});
						}
					}
				], (err) => {
					if (err) return cb(err);

					newUser = crp.members.newUserObject(newUser);
					newUser = crp.util.sanitizeObject(newUser);

					crp.db.replaceOne('users', {_id: user._id}, newUser, (err, result) => {
						cb(err, newUser);
					});
				});
			});
		});
	};

	crp.members.removeData = (userid, keys, cb) => {
		crp.members.get(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb(null, 'noUser');

			var newUser = {};
			for (var k in user) {
				if (keys.includes(k)) continue;
				newUser[k] = user[k];
			}

			newUser = crp.members.newUserObject(newUser);
			newUser = crp.util.sanitizeObject(newUser);

			crp.db.replaceOne('users', {_id: user._id}, newUser, (err, result) => {
				cb(err, newUser);
			});

		});
	};

	crp.members.add = (data, admin, cb) => {
		var user = {
			login: data.login.toLowerCase(),
			pass: data.pass,
			email: data.email.toLowerCase(),
			register_date: Date.parse(data.register_date) || Date.now()
		};

		if (admin) {
			user.role = data.role;
		} else {
			user.activation_code = crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase();
		}

		crp.members.find({login: user.login}, (err, users) => {
			if (err) return cb(err);
			if (users.length > 0) return cb('loginTaken');

			crp.members.find({email: user.email}, (err, users) => {
				if (err) return cb(err);
				if (users.length > 0) return cb('emailTaken');

				if (user.login.length < 4) return cb('loginLength');
				if (!crp.members.validateEmail(user.email)) return cb('emailInvalid');

				if (user.pass.length < 6) return cb('passLength');
				if (!data.encrypted) {
					crp.auth.bcrypt.hash(user.pass, 10, (err, hash) => {
						if (err) return cb(err);

						user.pass = hash;
						user = crp.members.newUserObject(user);
						user = crp.util.sanitizeObject(user);

						crp.db.insertOne('users', user, (err, result) => {
							if (err) return cb(err);

							cb(null, user);
						});

					});
				} else {
					user.pass = user.pass.replace('$2y$', '$2a$');
					user = crp.members.newUserObject(user);
					user = crp.util.sanitizeObject(user);

					crp.db.insertOne('users', user, (err, result) => {
						if (err) return cb(err);

						cb(null, user);
					});
				}
			});
		});
	};

	crp.members.remove = (userid, cb) => {
		crp.members.get(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb();

			crp.db.deleteOne('users', {_id: user._id}, (err, result) => {
				if (err) return cb(err);

				cb(null, user);
			});
		});
	};

	crp.members.parseRole = (role) => {
		switch (role) {
			case 0:
				return 'Pending';
				break;
			case 1:
				return 'Member';
				break;
			case 2:
				return 'Chapter Leader';
				break;
			case 3:
				return 'Administrator';
				break;
			default:
				return 'Guest';
		}
	};

	crp.members.getProfilePic = (user) => {
		if (!user) return;

		return crp.storage.getUrl(user.img.profile) || crp.storage.getUrl('img/members/profile.png');
	};

	crp.members.getCoverPic = (user) => {
		if (!user) return;

		return crp.storage.getUrl(user.img.cover) || crp.storage.getUrl('img/cover.png');
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
