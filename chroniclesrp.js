var async = require('async');

async.waterfall([
	(callback) => {
		callback(null, {
			ROOT: __dirname,
			PUBLICDIR: __dirname + '/public',
			async: async,
			fs: require('fs'),
			cmd: require('child_process').exec,
			moment: require('moment-timezone'),
			ssl: (process.env.NODE_ENV == 'production'),
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
		require('./api/storage/storage.js')(crp, callback);
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

		crp.server = crp.express.app.listen(process.env.PORT || 3000, () => {
			if (process.send) process.send('online');

			process.on('SIGINT', () => {
				crp.server.close((err) => {
					if (err) console.error(err);

					crp.db.client.close(false, () => {
						crp.redis.quit();

						process.exit(err ? 1 : 0);
					});
				});

				setTimeout(() => {
					process.exit(1);
				}, 1000 * 10)
			});

			console.log('\nThe Chronicles RP is up and running!');
		});
	});
});
