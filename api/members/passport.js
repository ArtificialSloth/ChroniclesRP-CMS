module.exports = (crp, callback) => {
	crp.auth = {};

	crp.auth.failedLogins = {};
	crp.auth.bcrypt = require('bcrypt');
	crp.auth.crypto = require('crypto');

	crp.auth.session = require('express-session');
	crp.auth.redisStore = require('connect-redis')(crp.auth.session);

	crp.auth.passport = require('passport');
	crp.auth.strategy = require('passport-local').Strategy;

	crp.express.app.use(crp.auth.session({
		name: 'crp.sid',
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		store: new crp.auth.redisStore({client: crp.redis})
	}));
	crp.express.app.use(crp.auth.passport.initialize());
	crp.express.app.use(crp.auth.passport.session());

	crp.auth.passport.serializeUser((user, done) => {
		done(null, user._id);
	});

	crp.auth.passport.deserializeUser((id, done) => {
		crp.util.getUserData(id, (err, user) => {
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
			crp.util.getUsers({login: username}, (err, users) => {
				if (err) return done(err);
				if (!users[0]) return done(null, false, {message: 'Incorrect username.'});

				crp.auth.bcrypt.compare(password, users[0].pass, (err, isValid) => {
					if (err) return done(err, false);
					if (!isValid) return done(null, false, {message: 'Incorrect password.'});

					return done(null, users[0]);
				});
			});
		}
	));

	callback(null, crp);
}
