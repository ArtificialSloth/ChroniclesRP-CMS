module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'posts').find({}).toArray((err, result) => {
		if (err) throw err;
		
		crp.global.posts = result;
		
		crp.global.pages.push({
			slug: '/admin/posts',
			path: '/admin/admin',
			role: 'administrator',
			subPage: crp.PAGESDIR + '/posts/admin'
		});
	});
};