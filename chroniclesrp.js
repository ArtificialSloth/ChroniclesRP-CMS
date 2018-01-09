var async = require('async');

async.waterfall([
	(callback) => {		
		callback(null, {
			ROOT: __dirname,
			PUBLICDIR: __dirname + '/public',
			PAGESDIR: __dirname + '/views/partials/pages',
			async: async,
			fs: require('fs'),
			handlebars: require('handlebars'),
			moment: require('moment-timezone'),
			redis: require('redis').createClient()
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
	},
	(crp, callback) => {
		require('./api/helpers.js')(crp);
		callback(null, crp);
	},
], (err, crp) => {
	crp.express.app.listen(80, () => {
		console.log('The Chronicles RP is up and running!');
	});
});