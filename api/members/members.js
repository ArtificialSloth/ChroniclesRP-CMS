module.exports = (crp) => {
	crp.members = {};
	crp.members.activations = [];

	crp.members.validateEmail = (email) => {
		if (email && email.includes('@') && email.lastIndexOf('.') > email.lastIndexOf('@')) {
			return true;
		}

		return false;
	};

	crp.members.emailConfirmCode = (userid, email) => {
		var activation = {
			_id: userid,
			email: email,
			code: crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase()
		};
		crp.members.activations.push(activation);

		crp.util.wait(15 * 60 * 1000, () => {
			crp.members.activations.splice(crp.members.activations.indexOf(activation), 1);
		});

		var subject = 'Confirm your email address';
		var msg = 'Please use the following code to confirm your email address <div style="font-size:20px; text-align:center">' + activation.code + '</div>';
		crp.mail.send(activation.email, subject, msg);
	};

	crp.members.find = (filter, cb) => {
		crp.db.find('users', filter, {}, cb);
	};

	crp.members.get = (userid, cb) => {
		if (typeof userid != 'object') userid = crp.db.objectID(userid);
		crp.db.findOne('users', {_id: userid}, cb);
	};

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
		if (role == 0) {
			return 'Pending';
		} else if (role == 1) {
			return 'Member';
		} else if (role == 2) {
			return 'Chapter Leader';
		} else if (role == 3) {
			return 'Administrator';
		}

		return 'Guest';
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
