module.exports = (crp, callback) => {
	crp.util.getUsers({}, (err, users) => {
		if (err) return callback(err);

		for (var k in users) {
			crp.util.addProfilePage(users[k]);
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

		callback();
	});
};
