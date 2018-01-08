module.exports = (crp, callback) => {
	crp.auth = {};
	
	crp.auth.bcrypt = require('bcrypt');
	crp.auth.crypto = require('crypto');
	crp.auth.session = require('express-session');
	crp.auth.mongoStore = require('connect-mongo')(crp.auth.session);
	crp.auth.passport = require('passport');
	crp.auth.strategy = require('passport-local').Strategy;
		
	crp.express.app.use(crp.auth.session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		store: new crp.auth.mongoStore({
			db: crp.db
		})
	}));
	crp.express.app.use(crp.auth.passport.initialize());
	crp.express.app.use(crp.auth.passport.session());
	
	crp.auth.passport.serializeUser((user, done) => {
		done(null, user._id);
	});
	
	crp.auth.passport.deserializeUser((id, done) => {
		id = crp.db.sanitize(id);
		crp.db.collection(crp.db.PREFIX + 'users').findOne({_id: crp.db.objectID(id)}, (err, user) => {
			if (err) return done(err);
			if (!user) return done(null, false);
			
			done(null, user._id);
		});
	});
	
	crp.auth.passport.use(new crp.auth.strategy({
			usernameField: 'user_login',
			passwordField: 'user_pass'
		},
		(username, password, done) => {
			var user = crp.util.findObjectInArray(crp.global.users, 'login', username);
			if (!user) return done(null, false, {message: 'Incorrect username.'});
			
			crp.auth.bcrypt.compare(password, user.pass, (err, isValid) => {
				if (err) throw err;
				if (!isValid) {
					return done(null, false, {message: 'Incorrect password.'});
				}

				return done(null, user);
			});
		}
	));
	
	crp.express.ready();
	callback(null, crp);
}