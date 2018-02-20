module.exports = (crp, callback) => {
	crp.global.pages.push({
		slug: '/admin/posts',
		path: '/admin/index.njk',
		role: 'administrator',
		subPage: '/posts/admin/index.njk'
	});

	callback();
};
