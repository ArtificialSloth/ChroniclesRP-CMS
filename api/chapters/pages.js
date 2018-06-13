module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/chapters',
		path: '/chapters/index.njk',
		subPage: '/chapters/browse/index.njk'
	});

	crp.pages.push({
		slug: '/chapters/create',
		path: '/chapters/index.njk',
		role: 2,
		subPage: '/chapters/create/index.njk'
	});

	crp.db.find('chapters', {}, {}, (err, chapters) => {
		if (err) return console.error(err);

		for (var i in chapters) {
			crp.util.addChapterPage(chapters[i]);
		}
	});

	crp.db.find('games', {}, {}, (err, games) => {
		if (err) return console.error(err);

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
