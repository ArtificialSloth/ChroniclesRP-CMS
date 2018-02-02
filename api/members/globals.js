module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'users').find({}).toArray((err, result) => {
		if (err) return console.error(err);

		crp.global.users = result;
		for (var k in crp.global.users) {
			crp.util.addProfilePage(crp.global.users[k]);
		}

		crp.global.pages.push({
			slug: '/admin/users',
			path: '/admin/index.njk',
			role: 'administrator',
			subPage: '/members/admin/index.njk'
		});

		crp.global.pages.push({
			slug: '/register',
			path: '/members/register/index.njk'
		});

		crp.global.pages.push({
			slug: '/registered',
			path: '/members/registered/index.njk'
		});
	});
};
