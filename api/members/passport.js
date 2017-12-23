module.exports = (crp, callback) => {
	var authAPI = {};

	authAPI.bcrypt = require('bcrypt');
	authAPI.session = require('express-session');
	authAPI.mongoStore = require('connect-mongo')(authAPI.session);
	authAPI.passport = require('passport');
	authAPI.strategy = require('passport-local').Strategy;
	
	crp.express.app.use(authAPI.session({
		secret: 'Dominion1',
		resave: false,
		saveUninitialized: false,
		store: new authAPI.mongoStore({
			db: crp.db
		})
	}));
	crp.express.app.use(authAPI.passport.initialize());
	crp.express.app.use(authAPI.passport.session());
	
	authAPI.passport.serializeUser((user, done) => {
		done(null, user._id);
	});
	
	authAPI.passport.deserializeUser((id, done) => {
		id = crp.db.sanitize(id);
		crp.db.collection(crp.db.PREFIX + 'users').findOne({_id: crp.db.objectID(id)}, (err, user) => {
			if (err) return done(err);
			if (!user) return done(null, false);
			
			done(null, user._id);
		});
	});
	
	authAPI.passport.use(new authAPI.strategy({
			usernameField: 'user_login',
			passwordField: 'user_pass'
		},
		(username, password, done) => {
			username = crp.db.sanitize(username);
			crp.db.collection(crp.db.PREFIX + 'users').findOne({login: username}, (err, user) => {
				if (err) return done(err);
				if (!user) return done(null, false, {message: 'Incorrect username.'});
								
				authAPI.bcrypt.compare(password, user.pass, (err, isValid) => {
					if (err) throw err;
					if (!isValid) {
						return done(null, false, {message: 'Incorrect password.'});
					}
					
					return done(null, user);
				});
			});
		}
	));
	
	crp.auth = authAPI;
	crp.express.ready();
	callback(null, crp);
}