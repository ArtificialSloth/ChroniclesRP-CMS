module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/admin/posts',
		path: '/admin/index.njk',
		role: 'administrator',
		subPage: '/posts/admin/index.njk'
	});

	callback();
};
