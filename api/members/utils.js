module.exports = (crp) => {
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
			filter: args.filter,
			sortBy: args.sortBy || 'login',
			sortOrder: args.sortOrder
		};
		
		var users = crp.global.users;
		if (args.filter) {
			users = crp.util.filterObject(crp.global.users, args.filter[0], args.filter[1].toString());
		}
		
		if (args.sortBy) {
			users = users.sort((a, b) => {
				return a[args.sortBy] > b[args.sortBy];
			});
		}
		
		if (args.sortOrder == 'ASC') users.reverse();
		
		return users;
	};

	crp.util.getUserData = (userid) => {
		if (!userid) return;
		return crp.util.getUsers({filter: ['_id', userid]})[0];
	};
	
	crp.util.setUserData = (userid, data, admin, cb) => {
		var user = crp.util.getUserData(userid);
		if (!user) return cb('noUser');
		
		crp.async.waterfall([
			(callback) => {
				var newUser = user;
				
				newUser.display_name = data.display_name || user.display_name;
				newUser.meta = user.meta || {};
				newUser.meta.tagline = data.user_tagline || user.meta.tagline;
				newUser.meta.about = data.user_about || user.meta.about;
				
				if (admin) {
					newUser.role = data.user_role || user.role;
					newUser.locked = data.user_locked || user.locked;
				}
				
				if (data.user_login && data.user_login != user.login) {
					if (data.user_login < 4) return callback('loginLength');
					if (crp.util.getUsers({filter: ['login', data.user_login]}).length > 0) {
						return callback('loginTaken');
					}
						
					newUser.login = data.user_login;
					newUser.nicename = newUser.login.toLowerCase().replace(/[^a-z0-9]+/g, '-');
				}
				
				if (data.user_email && data.user_email != user.email) {
					if (!crp.util.validateEmail(data.user_email)) return callback('emailInvalid');
					
					if (admin) {
						newUser.email = data.user_email;
					} else {
						newUser.new_email = data.user_email;
						newUser.activation_code = crp.util.emailConfirmCode(newUser._id);
							
						var subject = 'Confirm your new email address';
						var msg = 'Please use the following code to confirm your new email address <div style="font-size:20px; text-align:center">' + newUser.activation_code + '</div>';
						crp.util.mail(newUser.new_email, subject, msg);
					}
				}
				
				if (data.user_dob && data.user_dob != user.meta.date_of_birth) {
					if (!crp.moment(new Date(data.user_dob)).isValid()) return callback('dobInvalid');
					
					newUser.meta.date_of_birth = crp.moment(new Date(data.user_dob)).format('MM/DD/YYYY');
				}
				
				if (data.user_timezone && data.user_timezone != user.meta.timezone) {
					if (!crp.moment.tz.names().includes(data.user_timezone)) return callback('tzInvalid');

					newUser.meta.timezone = data.user_timezone;
				}
				
				if (data.user_gender && data.user_gender != user.meta.gender) {
					var genders = ['---', 'Bolian', 'Female', 'Male'];
					if (!genders.includes(data.user_gender)) return callback('genderInvalid');
					
					newUser.meta.gender = data.user_gender;
				}
				
				if (data.profile_pic) {
					var path = '/img/members/' + newUser.nicename + '/' + data.profile_pic[0].originalname;
					
					crp.util.replaceFile(crp.PUBLICDIR + user.meta.profile_pic, data.profile_pic[0].path, crp.PUBLICDIR + path);
					newUser.meta.profile_pic = path;
				}
				
				if (data.cover_pic) {
					var path = '/img/members/' + newUser.nicename + '/' + data.cover_pic[0].originalname;
					
					crp.util.replaceFile(crp.PUBLICDIR + user.meta.cover_pic, data.cover_pic[0].path, crp.PUBLICDIR + path);
					newUser.meta.cover_pic = path;
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
		
		return newUser;
	};
	
	crp.util.addUser = (data) => {
		var user = {
			login: data.login,
			pass: data.pass,
			email: data.email,
			register_date: data.register_date,
			display_name: data.display_name || data.login,
			nicename: data.nicename || data.login.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			role: data.role || 'pending',
			locked: data.locked || false,
			activation_code: crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase(),
			meta: data.meta || {
				timezone: crp.moment.tz.guess()
			}
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
		} else {
			user.register_date = Date.now();
		}
		
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
		return crp.util.getUsers({filter: ['role', role]});
	};
	
	crp.util.roleHasUsers = (role) => {
		return crp.util.getUsersByRole(role).length !== 0;
	};
	
	crp.util.addProfilePage = (user) => {
		var profilePages = [
			'/info',
			'/friends',
			'/groups',
			'/messages',
			'/account',
			'/settings'
		];
		
		crp.global.pages.push({
			slug: '/members/' + user.nicename,
			path: '/members/profile',
			subPage: crp.PAGESDIR + '/members/profile/activity',
			context: {
				key: 'user',
				val: user
			}
		});
		
		for (var i in profilePages) {
			crp.global.pages.push({
				slug: '/members/' + user.nicename + profilePages[i],
				path: '/members/profile',
				subPage: crp.PAGESDIR + '/members/profile' + profilePages[i],
				context: {
					key: 'user',
					val: user
				}
			});
		}
	};
};