module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/',
		path: '/home/index.njk'
	});

	crp.pages.push({
		slug: '/admin/settings',
		path: '/admin/index.njk',
		role: 3,
		subPage: '/admin/settings/index.njk'
	});

	callback();
};
