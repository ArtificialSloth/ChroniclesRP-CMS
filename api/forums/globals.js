module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'categories').find({}).toArray((err, result) => {
		if (err) return console.error(err);
		
		result.sort((a, b) => {
			return a.order - b.order;
		});
		crp.global.categories = result;
	});
	
	crp.global.pages.push({
		slug: '/forums',
		path: '/forums/forum'
	});
}