module.exports = (crp, callback) => {
	crp.global = {};
	crp.global.pages = [
		{slug: '/', path: '/home/index.njk'},
		{
			slug: '/admin/settings',
			path: '/admin/index.njk',
			role: 'administrator',
			subPage: '/admin/settings/index.njk'
		}
	];

	crp.async.parallel([
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'site').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.site = result[0];
				cb();
			});
		},
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'games').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.games = result.sort((a, b) => {
					return a.name > b.name;
				});
				cb();
			});
		},
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'chapters').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.chapters = result;
				cb();
			});
		}
	], callback);
}
