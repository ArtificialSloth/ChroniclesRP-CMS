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

	callback();
};
