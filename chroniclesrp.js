var async = require('async');

async.waterfall([
	(callback) => {
		callback(null, {
			ROOT: __dirname,
			PUBLICDIR: __dirname + '/public',
			async: async,
			fs: require('fs'),
			cmd: require('node-cmd'),
			moment: require('moment-timezone'),
			browserRefresh: process.env.BROWSER_REFRESH_URL,
			redis: require('redis').createClient(process.env.REDIS_URL)
		});
	},
	(crp, callback) => {
		require('./api/utils.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/app.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/database/db.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/mail/mail.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/members/passport.js')(crp, callback);
	}
], (err, crp) => {
	if (err) return console.error(err);

	crp.express.ready((err) => {
		if (err) return console.error(err);

		crp.express.app.listen(process.env.PORT || 3000, () => {
			if (process.send) process.send('online');

			crp.proxy.register('chroniclesrp.com', '127.0.0.1:' + (process.env.PORT || 3000));
			crp.proxy.register('127.0.0.1', '127.0.0.1:' + (process.env.PORT || 3000));
			console.log('\nThe Chronicles RP is up and running!');
		});
	});
});
