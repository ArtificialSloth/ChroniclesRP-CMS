module.exports = (crp, callback) => {
	crp.app.post('/login', (req, res, next) => {
		crp.auth.passport.authenticate('local', (err, user) => {
			if (err) return next(err);
			if (!crp.auth.failedLogins[req.ip]) crp.auth.failedLogins[req.ip] = {count: 0, timeout: null};
			if (crp.auth.failedLogins[req.ip].count >= 5) {
				return res.send('tooMany');
			}

			if (!user) {
				if (crp.auth.failedLogins[req.ip].timeout) clearTimeout(crp.auth.failedLogins[req.ip].timeout);

				crp.auth.failedLogins[req.ip].count += 1;
				crp.auth.failedLogins[req.ip].timeout = setTimeout(() => {
					crp.auth.failedLogins[req.ip] = {count: 0, timeout: null};
				}, 5 * 60 * 1000);

				return res.send('invalid');
			}
			crp.auth.failedLogins[req.ip].count = 0;

			req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
			if (req.body.remember_me) {
				req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;
			}

			req.login(user, (err) => {
				if (err) return next(err);
				if (user.locked) return res.send('locked');

				res.send('valid');
			});
		})(req, res, next);
	});

	crp.app.get('/logout', (req, res) => {
		req.logout();
		res.redirect('/');
	});

	crp.app.post('/api/register', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			var userData = {
				login: req.body.user_login,
				pass: req.body.user_pass,
				email: req.body.user_email
			};

			crp.members.add(userData, false, (err, result) => {
				if (err) return res.send(err);
				if (!result._id) return res.send(result);

				req.login(result, (err) => {
					if (err) return res.send(err);

					var subject = 'Welcome to the Chronicles ' + result.login + '!';
					var msg = 'You\'re almost done, all you have left to do is activate your account using the following code. <div style="font-size:20px; text-align:center">' + result.activation_code + '</div>';
					crp.mail.send(result.email, subject, msg);
					crp.mail.adminNotify('New User: ' + result.display_name, 'Username: ' + result.login + '<br>Email: ' + result.email);

					result.pass = null;
					res.send(result);
				});
			});
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	crp.app.post('/api/activate', (req, res) => {
		crp.members.get(req.user, (err, user) => {
			if (err) return res.send(err);

			if (user && user.activation_code == req.body.code) {
				if (user.role == 0) {
					crp.members.set(user._id, {role: 1}, true, (err, result) => {
						if (err) return res.send(err);
						crp.members.removeData(user._id, ['activation_code'], (err, result) => {
							if (err) return res.send(err);

							result.pass = null;
							res.send(result);
						});
					});
				} else {
					crp.members.set(user._id, {email: user.new_email}, true, (err, result) => {
						if (err) return res.send(err);
						crp.members.removeData(user._id, ['new_email', 'activation_code'], (err, result) => {
							if (err) return res.send(err);

							result.pass = null;
							res.send(result);
						});
					});
				}
			} else {
				res.send('invalid');
			}
		});
	});

	crp.app.post('/api/admin/edit-user', (req, res, next) => {
		var upload = crp.express.upload.fields([
			{name: 'profile_pic', maxCount: 1},
			{name: 'cover_pic', maxCount: 1}
		]);
		upload(req, res, (err) => {
			if (err) return res.send(err);
			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);

				if (req.body.user_id == user._id || user.role >= 3) {
					var userData = {
						login: req.body.user_login,
						old_pass: req.body.old_pass,
						new_pass: req.body.new_pass,
						confirm_new_pass: req.body.confirm_new_pass,
						email: req.body.user_email,
						display_name: req.body.display_name,
						role: req.body.user_role,
						locked: req.body.user_locked,
						timezone: req.body.user_timezone,
						date_of_birth: req.body.user_dob,
						gender: req.body.user_gender,
						tagline: req.body.user_tagline,
						about: req.body.user_about,
						img: {}
					};

					if (req.files) {
						if (req.files.profile_pic) userData.img.profile = req.files.profile_pic;
						if (req.files.cover_pic) userData.img.cover = req.files.cover_pic;
					}

					crp.members.set(req.body.user_id, userData, (user.role >= 3), (err, result) => {
						if (err) return res.send(err);

						result.pass = null;
						res.send(result);
					});
				}
			});
		});
	});

	crp.app.post('/api/admin/add-user', (req, res) => {
		crp.members.get(req.user, (err, user) => {
			if (err) return res.send(err);

			if (user.role >= 3) {
				var userData = {
					login: req.body.user_login,
					pass: req.body.user_pass,
					encrypted: req.body.encrypted,
					email: req.body.user_email,
					register_date: req.body.register_date,
					role: 1
				};

				crp.members.add(userData, true, (err, result) => {
					if (err) return res.send(err);

					result.pass = null;
					res.send(result);
				});
			}
		});
	});

	crp.app.post('/api/admin/remove-user', (req, res) => {
		crp.members.get(req.user, (err, user) => {
			if (err) return res.send(err);
			if (user.role < 3) return res.send('notAllowed');

			crp.members.remove(req.body.userid, (err, result) => {
				if (err) return res.send(err);

				result.pass = null;
				res.send(result);
			});
		});
	});

	callback();
};
