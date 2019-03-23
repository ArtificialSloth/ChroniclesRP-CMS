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
			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (user) return res.send('user');

				var userData = {
					login: req.body.login,
					pass: req.body.pass,
					email: req.body.email
				};

				crp.members.add(userData, (err, result) => {
					if (err) return res.send(err);

					req.login(result, (err) => {
						if (err) return res.send(err);

						crp.members.emailConfirmCode(result._id, result.email);
						res.send(true);
					});
				});
			});
		}).catch((err) => {
			console.log('uwu' + err);
			res.send('noCaptcha');
		});
	});

	crp.app.post('/api/activate', (req, res) => {
		crp.members.get(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send(false);

			var activation = crp.util.findObjectInArray(crp.members.activations, '_id', user._id.toString());
			if (!activation || activation.code != req.body.code) return res.send(false);

			if (user.role == 0) {
				crp.members.set(user._id, {role: 1}, (err, result) => {
					if (err) return res.send(err);

					crp.members.activations.splice(crp.members.activations.indexOf(activation), 1);
					res.send(true);
				});
			} else {
				crp.members.set(user._id, {email: activation.email}, (err, result) => {
					if (err) return res.send(err);

					crp.members.activations.splice(crp.members.activations.indexOf(activation), 1);
					res.send(true);
				});
			}
		});
	});

	crp.app.post('/api/resend-activation', (req, res) => {
		crp.members.get(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send(false);

			var activation = crp.util.findObjectInArray(crp.members.activations, '_id', user._id.toString());
			if (activation) crp.members.activations.splice(crp.members.activations.indexOf(activation), 1);
			if (!activation && user.role > 0) return res.send(false);

			crp.members.emailConfirmCode(user._id, activation ? activation.email : user.email);
			res.send(true);
		});
	});

	crp.app.post('/api/edit-user', (req, res, next) => {
		var upload = crp.express.upload.fields([
			{name: 'profile_pic', maxCount: 1},
			{name: 'cover_pic', maxCount: 1}
		]);
		upload(req, res, (err) => {
			if (err) return res.send(err);
			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				crp.members.get(req.body.userid, (err, profile) => {
					if (err) return res.send(err);
					if (!profile) return res.send('noUser');

					if (user._id.equals(profile._id) || user.role >= 3) {
						var userData = {
							display_name: req.body.display_name,
							timezone: req.body.timezone,
							date_of_birth: req.body.date_of_birth,
							gender: req.body.gender,
							tagline: req.body.tagline,
							about: req.body.about,
							img: {}
						};

						if (req.files) {
							if (req.files.profile_pic) userData.img.profile = req.files.profile_pic;
							if (req.files.cover_pic) userData.img.cover = req.files.cover_pic;
						}

						crp.async.parallel([
							(callback) => {
								if (!req.body.old_pass || !req.body.new_pass || !req.body.new_pass_confirm) return callback();
								if (req.body.new_pass != req.body.new_pass_confirm) return callback('newPassMismatch');

								crp.auth.bcrypt.compare(req.body.old_pass, user.pass, (err, isValid) => {
									if (err) return callback(err);
									if (!isValid) return callback('passMismatch');

									userData.pass = req.body.new_pass;
									callback();
								});
							},
							(callback) => {
								if (!req.body.email || req.body.email.toLowerCase() == profile.email) return callback();
								if (!crp.members.validateEmail(req.body.email)) return callback('emailInvalid');

								crp.members.find({email: req.body.email}, (err, users) => {
									if (err) return callback(err);
									if (users && users.length > 0) return callback('emailTaken');

									crp.members.emailConfirmCode(profile._id, req.body.email);
									callback();
								});
							}
						], (err) => {
							if (err) return res.send(err);

							crp.members.set(profile._id, userData, (err, result) => {
								if (err) return res.send(err);

								res.send(true);
							});
						});
					}
				});
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
