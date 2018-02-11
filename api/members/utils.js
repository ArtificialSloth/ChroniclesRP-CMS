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
		setTimeout(() => {
			crp.util.removeUserData(userid, ['new_email', 'activation_code']);
		}, 15 * 60 * 1000);

		return crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase();
	};

	crp.util.getUsers = (args) => {
		if (!args) args = {};
		args = {
			filter: args.filter || [],
			sortBy: args.sortBy || 'login',
			sortOrder: args.sortOrder
		};

		var users = crp.global.users;
		if (args.filter) {
			users = crp.util.filterObject(users, args.filter[0], args.filter[1]);
		}

		users = users.sort((a, b) => {
			return a[args.sortBy].toLowerCase().localeCompare(b[args.sortBy].toLowerCase());
		});

		if (args.sortOrder == 'ASC') users.reverse();

		return users;
	};

	crp.util.getUserData = (userid) => {
		if (!userid) return;
		return crp.util.getUsers({filter: ['_id', userid.toString()]})[0];
	};

	crp.util.newUserObject = (user) => {
		return {
			_id: user._id,
			login: user.login,
			pass: user.pass,
			email: user.email,
			register_date: user.register_date || Date.now(),
			display_name: user.display_name || user.login,
			nicename: user.nicename || data.login.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			role: user.role || 'pending',
			locked: user.locked || false,
			timezone: user.timezone || crp.moment.tz.guess(),
			date_of_birth: user.date_of_birth,
			gender: user.gender || '---',
			tagline: user.tagline,
			about: user.about,
			img: user.img || {}
		};
	};

	crp.util.setUserData = (userid, data, admin, cb) => {
		var user = crp.util.getUserData(userid);
		if (!user) return cb('noUser');

		crp.async.waterfall([
			(callback) => {
				var newUser = crp.util.newUserObject(user);

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

			userid = crp.db.sanitize(userid);
			newUser = crp.util.sanitizeObject(newUser);

			crp.db.collection(crp.db.PREFIX + 'users').replaceOne({_id: crp.db.objectID(userid)}, newUser);
			crp.global.users[crp.global.users.indexOf(user)] = newUser;
			crp.util.resetProfilePage(user, newUser);

			return cb(newUser);
		});
	};

	crp.util.removeUserData = (userid, keys) => {
		var user = crp.util.getUserData(userid);
		if (!user) return;

		var newUser = {};
		for (var k in user) {
			if (keys.includes(k)) continue;

			newUser[k] = user[k];
		}

		userid = crp.db.sanitize(userid);
		newUser = crp.util.sanitizeObject(newUser);

		crp.db.collection(crp.db.PREFIX + 'users').replaceOne({_id: userid}, newUser);
		crp.global.users[crp.global.users.indexOf(user)] = newUser;
		crp.util.resetProfilePage(user, newUser);

		return newUser;
	};

	crp.util.addUser = (data) => {
		var user = {
			login: data.login,
			pass: data.pass,
			email: data.email,
			register_date: data.register_date,
			activation_code: crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase()
		};

		if (user.login.length < 4) return 'loginLength';
		if (crp.util.getUsers({filter: ['login', user.login]}).length > 0) {
			return 'loginTaken';
		}

		if (user.pass.length < 6) return 'passLength';
		if (!data.encrypted) {
			user.pass = crp.auth.bcrypt.hashSync(user.pass, 10);
		} else {
			user.pass = user.pass.replace('$2y$', '$2a$');
		}

		if (!crp.util.validateEmail(user.email)) return 'emailInvalid';

		if (user.register_date) {
			user.register_date = Date.parse(user.register_date);
		}

		user = crp.util.newUserObject(user);
		user = crp.util.sanitizeObject(user);

		crp.db.collection(crp.db.PREFIX + 'users').insertOne(user);
		crp.global.users.push(user);
		crp.util.addProfilePage(user);

		return user;
	};

	crp.util.removeUser = (userid) => {
		var user = crp.util.getUserData(userid);

		if (user) {
			userid = crp.db.sanitize(userid);

			crp.db.collection(crp.db.PREFIX + 'users').deleteOne({_id: user._id});
			crp.global.users.splice(crp.global.users.indexOf(user), 1);

			return true;
		}
	};

	crp.util.userIsRole = (userid, role) => {
		var user = crp.util.getUserData(userid);

		if (!user) return false;

		return user.role == role;
	};

	crp.util.isUserAdmin = (userid) => {
		return crp.util.userIsRole(userid, 'administrator');
	};

	crp.util.getUsersByRole = (role) => {
		if (role == '*' || role == 'all') return crp.util.getUsers();

		return crp.util.getUsers({filter: ['role', role]});
	};

	crp.util.roleHasUsers = (role) => {
		return crp.util.getUsersByRole(role).length !== 0;
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
				profile: {
					user: user
				}
			}
		});

		for (var i in profilePages) {
			crp.global.pages.push({
				slug: '/members/' + user.nicename + profilePages[i].page,
				path: '/members/profile/index.njk',
				subPage: '/members/profile' + profilePages[i].page + '/index.njk',
				context: Object.assign({
					profile: {
						user: user
					}
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

	crp.util.resetProfilePage = (oldUser, newUser) => {
		crp.util.removeProfilePage(oldUser);
		crp.util.addProfilePage(newUser);
	};

	callback();
};
