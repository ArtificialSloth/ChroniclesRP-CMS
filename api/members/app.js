module.exports = (crp, callback) => {
	crp.express.app.post('/login', (req, res, next) => {
		crp.auth.passport.authenticate('local', (err, user) => {
			if (err) return next(err);
			if (!crp.auth.failedLogins[req.ip]) crp.auth.failedLogins[req.ip] = {count: 0, timeout: null};
			if (crp.auth.failedLogins[req.ip].count >= 5) {
				if (!crp.auth.failedLogins[req.ip].timeout) {
					crp.auth.failedLogins[req.ip].timeout = setTimeout(() => {
						crp.auth.failedLogins[req.ip] = {count: 0, timeout: null};
					}, 5 * 60 * 1000);
				}

				return res.send('tooMany');
			}

			if (!user) {
				crp.auth.failedLogins[req.ip].count += 1;
				return res.send('invalid');
			}
			if (req.body.remember_me) {
				req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;
			} else {
				req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
			}

			req.login(user, (err) => {
				if (err) return next(err);
				if (user.locked) return res.send('locked');

				return res.send('valid');
			});
		})(req, res, next);
	});

	crp.express.app.get('/logout', (req, res) => {
		req.logout();
		res.redirect('/');
	});

	crp.express.app.post('/api/register', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			var userData = {
				login: req.body.user_login,
				pass: req.body.user_pass,
				email: req.body.user_email
			};
			var newUser = crp.util.addUser(userData);

			if (newUser._id) {
				req.login(newUser, (err) => {
					if (err) {
						newUser = 'generic';
						console.log(err);
						return;
					}

					var subject = 'Welcome to the Chronicles ' + newUser.login + '!';
					var msg = 'You\'re almost done, all you have left to do is activate your account using the following code. <div style="font-size:20px; text-align:center">' + newUser.activation_code + '</div>';
					crp.util.mail(newUser.email, subject, msg);

					return newUser;
				});
			}

			res.send(newUser);
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	crp.express.app.post('/api/activate', (req, res) => {
		var user = crp.util.getUserData(req.user);

		if (user && user.activation_code == req.body.code) {
			if (user.role == 'pending') {
				crp.util.setUserData(user._id, {user_role: 'member'}, true, (newUser) => {
					res.send(newUser);
				});
			} else {
				crp.util.setUserData(user._id, {user_email: user.new_email}, true, (newUser) => {
					crp.util.removeUserData(newUser._id, ['new_email', 'activation_code']);
					res.send(newUser);
				});
			}
		} else {
			res.send('invalid');
		}
	});

	var editUser = crp.express.upload.fields([
		{name: 'profile_pic', maxCount: 1},
		{name: 'cover_pic', maxCount: 1}
	]);
	crp.express.app.post('/api/admin/edit-user', editUser, (req, res) => {
		if (req.body.user_id == req.user || crp.util.isUserAdmin(req.user)) {
			if (req.files) {
				if (req.files.profile_pic) req.body.profile_pic = req.files.profile_pic;
				if (req.files.cover_pic) req.body.cover_pic = req.files.cover_pic;
			}

			crp.util.setUserData(req.body.user_id, req.body, crp.util.isUserAdmin(req.user), (newUser) => {
				res.send(newUser);
			});
		}
	});

	crp.express.app.post('/api/admin/add-user', (req, res) => {
		if (crp.util.isUserAdmin(req.user)) {
			var userData = {
				login: req.body.user_login,
				pass: req.body.user_pass,
				encrypted: req.body.encrypted,
				email: req.body.user_email,
				register_date: req.body.register_date,
				role: 'member'
			};
			res.send(crp.util.addUser(userData));
		}
	});

	crp.express.app.post('/api/admin/remove-user', (req, res) => {
		if (crp.util.isUserAdmin(req.user)) {
			res.send(crp.util.removeUser(req.body.userid));
		}
	});

	callback();
};
