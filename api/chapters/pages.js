module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/chapters',
		path: '/chapters/index.njk'
	});

	callback();
};
