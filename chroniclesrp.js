var async = require('async');

async.waterfall([
	(callback) => {
		callback(null, {
			async: async,
			root: __dirname,
			fs: require('fs'),
			cron: require('cron').CronJob,
			request: require('request'),
			moment: require('moment-timezone'),
			cmd: require('child_process').exec,
			prod: (process.env.NODE_ENV == 'production'),
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
		require('./api/pages/pages.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/discord/discord.js')(crp, callback);
	},
	(crp, callback) => {
		require('./api/auth/auth.js')(crp);
		require('./api/mail/mail.js')(crp);
		require('./api/posts/posts.js')(crp);
		require('./api/events/events.js')(crp);
		require('./api/forums/forums.js')(crp);
		require('./api/members/members.js')(crp);
		require('./api/storage/storage.js')(crp);
		require('./api/chapters/chapters.js')(crp);

		callback(null, crp);
	}
], (err, crp) => {
	if (err) return console.error(err);

	crp.express.ready((err) => {
		if (err) return console.error(err);

		var httpServer = crp.http.createServer(crp.app);
		if (crp.prod && process.env.KEY && process.env.CERT) {
			crp.fs.readFile(process.env.KEY, (err, key) => {
				if (err) return console.error(err);

				crp.fs.readFile(process.env.CERT, (err, cert) => {
					if (err) return console.error(err);

					var httpsServer = crp.https.createServer({key: key, cert: cert}, crp.app);
					httpServer.listen((process.env.PORT || 80), () => {
						httpsServer.listen(443, () => {
							if (process.send) process.send('online');
							console.log('\nThe Chronicles RP is up and running!');
						});
					});
				});
			});
		} else {
			httpServer.listen((process.env.PORT || 80), () => {
				if (process.send) process.send('online');
				console.log('\nThe Chronicles RP is up and running!');
			});
		}
	});
});
