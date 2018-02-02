module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'posts').find({}).toArray((err, result) => {
		if (err) return console.error(err);

		crp.global.posts = result;

		crp.global.pages.push({
			slug: '/admin/posts',
			path: '/admin/index.njk',
			role: 'administrator',
			subPage: '/posts/admin/index.njk'
		});
	});
};
