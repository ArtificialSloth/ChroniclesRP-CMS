var async = require('async');

async.waterfall([
	(callback) => {
		callback(null, {
			ROOT: __dirname,
			PUBLICDIR: __dirname + '/public',
			async: async,
			fs: require('fs'),
			nunjucks: require('nunjucks'),
			moment: require('moment-timezone'),
			browserRefresh: process.env.BROWSER_REFRESH_URL,
			redis: require('redis').createClient(6379, process.env.REDIS_URL)
		});
	},
	(crp, callback) => {
		require('./api/utils.js')(crp);
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
	crp.express.app.listen(80, () => {
		if (process.send) process.send('online');

		console.log('The Chronicles RP is up and running!');
	});
});
