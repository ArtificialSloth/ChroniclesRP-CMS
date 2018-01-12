module.exports = (crp, callback) => {
	crp.global = {};
	crp.global.pages = [
		{slug: '/', path: '/home'},
		{
			slug: '/admin/settings',
			path: '/admin/admin',
			role: 'administrator',
			subPage: crp.PAGESDIR + '/admin/settings'
		}
	];
	
	crp.db.collection(crp.db.PREFIX + 'site').find({}).toArray((err, result) => {
		if (err) return console.error(err);
		
		crp.global.site = result[0];
	});
	
	crp.db.collection(crp.db.PREFIX + 'games').find({}).toArray((err, result) => {
		if (err) return console.error(err);
		
		crp.global.games = result.sort((a, b) => {
			return a.name > b.name;
		});
	});
	
	crp.db.collection(crp.db.PREFIX + 'chapters').find({}).toArray((err, result) => {
		if (err) return console.error(err);
		
		crp.global.chapters = result;
	});
}