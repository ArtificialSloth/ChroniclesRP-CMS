module.exports = (crp, callback) => {
	crp.global = {};
	crp.global.pages = [
		{slug: '/', path: '/home'}
	];
	
	crp.db.collection(crp.db.PREFIX + 'site').find({}).toArray((err, result) => {
		if (err) throw err;
		
		crp.global.site_name = result[0].name;
		crp.global.site_tagline = result[0].tagline;
	});
	
	crp.db.collection(crp.db.PREFIX + 'games').find({}).toArray((err, result) => {
		if (err) throw err;
		
		crp.global.games = result.sort((a, b) => {
			return a.name > b.name;
		});
	});
	
	crp.db.collection(crp.db.PREFIX + 'chapters').find({}).toArray((err, result) => {
		if (err) throw err;
		
		crp.global.chapters = result;
	});
}