var async = require('async');

async.waterfall([
	(callback) => {
		callback(null, {
			ROOT: __dirname,
			async: async,
			fs: require('fs'),
			cmd: require('child_process').exec,
			prod: (process.env.NODE_ENV == 'production'),
			moment: require('moment-timezone'),
			request: require('request'),
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
		require('./api/database/pages.js')(crp, callback);
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

		crp.fs.readFile(process.env.KEY, (err, key) => {
			if (err) return console.error(err);

			crp.fs.readFile(process.env.CERT, (err, cert) => {
				if (err) return console.error(err);

				var httpServer = crp.http.createServer(crp.express.app);
				var httpsServer = crp.https.createServer({key: key, cert: cert}, crp.express.app);

				process.on('SIGINT', () => {
					httpServer.close((err) => {
						if (err) console.error(err);

						httpsServer.close((err) => {
							if (err) console.error(err);

							crp.db.client.close(false, () => {
								crp.redis.quit();

								process.exit(err ? 1 : 0);
							});
						});
					});

					setTimeout(() => {
						process.exit(1);
					}, 1000 * 10)
				});

				httpServer.listen((process.env.PORT || 80), () => {
					if (crp.prod) {
						httpsServer.listen(443, () => {
							if (process.send) process.send('online');
							console.log('\nThe Chronicles RP is up and running!');
						});
					} else {
						if (process.send) process.send('online');
						console.log('\nThe Chronicles RP is up and running!');
					}
				});
			});
		});
	});
});
