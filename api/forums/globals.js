module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'categories').find({}).toArray((err, result) => {
		if (err) return console.error(err);

		result.sort((a, b) => {
			return a.order - b.order;
		});
		crp.global.categories = result;
	});

	crp.db.collection(crp.db.PREFIX + 'forums').find({}).toArray((err, result) => {
		if (err) return console.error(err);

		crp.global.forums = result;
		for (var i in crp.global.forums) {
			crp.global.pages.push({
				slug: '/forums/' + crp.global.forums[i].slug,
				path: '/forums/forum/index.njk',
				context: {forum: crp.global.forums[i]}
			});
		}
	});

	crp.global.pages.push({
		slug: '/forums',
		path: '/forums/index.njk'
	});
}
