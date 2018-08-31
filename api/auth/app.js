module.exports = (crp, callback) => {
	crp.app.use(crp.auth.session({
		name: 'crp.sid',
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {secure: crp.env},
		store: new crp.auth.redisStore({client: crp.redis})
	}));
	crp.app.use(crp.auth.passport.initialize());
	crp.app.use(crp.auth.passport.session());

	callback();
};
