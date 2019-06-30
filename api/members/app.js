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

			req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;
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
			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send({findById: err});
				if (user) return res.send('user');
				if (req.body.pass && req.body.pass.length < 6) return res.send('passLength');

				crp.auth.bcrypt.hash(req.body.pass, 10, (err, hash) => {
					if (err) return res.send({hash: err});

					var userData = {
						login: req.body.login,
						pass: hash,
						email: req.body.email
					};

					new crp.users(userData).save((err, user) => {
						if (err) return res.send({save: err});

						req.login(user, (err) => {
							if (err) return res.send({login: err});

							crp.mail.sendConfirmCode(user._id, user.email);
							res.send(true);
						});
					});
				});
			});
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	crp.app.post('/api/activate', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send(false);

			var activation = crp.util.findObjectInArray(crp.mail.activations, '_id', user._id);
			if (!activation || activation.code != req.body.code) return res.send(false);

			if (user.role == 0) {
				user.set({email: activation.email, role: 1});
				user.save((err, user) => {
					if (err) return res.send(err);

					crp.mail.activations.splice(crp.mail.activations.indexOf(activation), 1);
					res.send(true);
				});
			} else {
				user.set({email: activation.email});
				user.save((err, user) => {
					if (err) return res.send(err);

					crp.mail.activations.splice(crp.mail.activations.indexOf(activation), 1);
					res.send(true);
				});
			}
		});
	});

	crp.app.post('/api/resend-activation', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send(false);

			var activation = crp.util.findObjectInArray(crp.mail.activations, '_id', user._id);
			if (activation) crp.mail.activations.splice(crp.mail.activations.indexOf(activation), 1);
			if (!activation && user.role > 0) return res.send(false);

			crp.mail.sendConfirmCode(user._id, activation ? activation.email : user.email);
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
			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				crp.users.findById(req.body.userid, (err, profile) => {
					if (err) return res.send(err);
					if (!profile) return res.send('noUser');
					if (!user._id.equals(profile._id) && user.role < 3) return res.send('notAllowed');

					var userData = {
						display_name: req.body.display_name,
						timezone: req.body.timezone,
						date_of_birth: req.body.date_of_birth,
						gender: req.body.gender,
						tagline: req.body.tagline,
						about: req.body.about,
						img: profile.img
					};

					crp.async.parallel([
						(callback) => {
							if (!req.body.old_pass || !req.body.new_pass || !req.body.new_pass_confirm) return callback();
							if (req.body.new_pass != req.body.new_pass_confirm) return callback('newPassMismatch');
							if (req.body.new_pass.length < 6) return res.send('passLength');

							crp.auth.bcrypt.compare(req.body.old_pass, user.pass, (err, isValid) => {
								if (err) return callback(err);
								if (!isValid) return callback('passMismatch');

								crp.auth.bcrypt.hash(req.body.new_pass, 10, (err, hash) => {
									if (err) return callback(err);

									userData.pass = hash;
									callback();
								});
							});
						},
						(callback) => {
							if (!req.body.email || req.body.email.toLowerCase() == profile.email) return callback();
							if (!crp.mail.validateEmail(req.body.email)) return callback('emailInvalid');

							crp.users.find({email: req.body.email}, (err, users) => {
								if (err) return callback(err);
								if (users && users.length > 0) return callback('emailTaken');

								crp.mail.sendConfirmCode(profile._id, req.body.email);
								callback();
							});
						},
						(callback) => {
							if (!req.files.profile_pic) return callback();

							crp.storage.delete(profile.img.profile, (err) => {
								if (err) return callback(err);

								crp.storage.upload(req.files.profile_pic[0].path, `img/members/${profile._id}/${req.files.profile_pic[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(req.files.profile_pic[0].path, (err) => {
										if (err) return callback(err);

										userData.img.profile = file.name;
										callback();
									});
								});
							});
						},
						(callback) => {
							if (!req.files.cover_pic) return callback();

							crp.storage.delete(profile.img.cover, (err) => {
								if (err) return callback(err);

								crp.storage.upload(req.files.cover_pic[0].path, `img/members/${profile._id}/${req.files.cover_pic[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(req.files.cover_pic[0].path, (err) => {
										if (err) return callback(err);

										userData.img.cover = file.name;
										callback();
									});
								});
							});
						}
					], (err) => {
						if (err) return res.send(err);

						crp.users.updateOne({_id: profile._id}, userData, {runValidators: true}, (err) => {
							if (err) return res.send(err);

							res.send(true);
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/admin/edit-user', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			crp.users.findById(req.body.userid, (err, profile) => {
				if (err) return res.send(err);
				if (!profile) return res.send('noUser');

				var userData = {
					role: req.body.role
				};

				crp.users.updateOne({_id: profile._id}, userData, {runValidators: true}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/admin/add-user', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			var userData = {
				login: req.body.login,
				pass: req.body.pass,
				email: req.body.email,
				register_date: req.body.register_date,
				role: 1
			};

			new crp.users(userData).save((err, user) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/admin/remove-user', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			crp.users.deleteOne({_id: req.body.userid}, (err, user) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	callback();
};
