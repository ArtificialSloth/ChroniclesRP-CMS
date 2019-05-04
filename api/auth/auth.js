module.exports = (crp) => {
	crp.auth = {};

	crp.auth.failedLogins = {};
	crp.auth.bcrypt = require('bcrypt');
	crp.auth.crypto = require('crypto');

	crp.auth.session = require('express-session');
	crp.auth.redisStore = require('connect-redis')(crp.auth.session);

	crp.auth.passport = require('passport');
	crp.auth.strategy = require('passport-local').Strategy;

	crp.auth.passport.serializeUser((user, done) => {
		done(null, user._id);
	});

	crp.auth.passport.deserializeUser((id, done) => {
		crp.users.findById(id, (err, user) => {
			if (err) return done(err);
			if (!user) return done(null, false);

			done(null, user._id);
		});
	});

	crp.auth.passport.use(new crp.auth.strategy({
			usernameField: 'login',
			passwordField: 'pass'
		},
		(username, password, done) => {
			crp.users.findOne({login: username.toLowerCase()}, (err, user) => {
				if (err) return done(err);
				if (!user) return done(null, false, {message: 'Incorrect username.'});

				crp.auth.bcrypt.compare(password, user.pass, (err, isValid) => {
					if (err) return done(err, false);
					if (!isValid) return done(null, false, {message: 'Incorrect password.'});

					return done(null, user);
				});
			});
		}
	));
};
