module.exports = (crp, callback) => {
	crp.util.getUsers({}, (err, users) => {
		if (err) return callback(err);

		for (var k in users) {
			crp.util.addProfilePage(users[k]);
		}

		crp.pages.push({
			slug: '/admin/users',
			path: '/admin/index.njk',
			role: 3,
			subPage: '/members/admin/index.njk'
		});

		crp.pages.push({
			slug: '/register',
			path: '/members/register/index.njk'
		});

		crp.pages.push({
			slug: '/registered',
			path: '/members/registered/index.njk'
		});

		callback();
	});
};
