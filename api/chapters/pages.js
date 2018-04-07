module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/chapters',
		path: '/chapters/index.njk',
		subPage: '/chapters/browse/index.njk'
	});

	crp.pages.push({
		slug: '/chapters/create',
		path: '/chapters/index.njk',
		role: 'chapter_leader',
		subPage: '/chapters/create/index.njk'
	});

	crp.db.find('games', {}, {}, (err, games) => {
		for (var i in games) {
			crp.pages.push({
				slug: '/chapters/' + games[i].slug,
				path: '/chapters/index.njk',
				subPage: '/chapters/browse/index.njk',
				context: {filter: games[i]._id}
			});
		}
	});

	callback();
};
