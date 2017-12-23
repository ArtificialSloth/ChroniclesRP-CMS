module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'users').find({}).toArray((err, result) => {
		if (err) throw err;
		
		crp.global.users = result;						
		for (var k in crp.global.users) {		
			crp.global.pages.push({
				slug: '/members/' + crp.global.users[k].nicename,
				path: '/members/profile',
				subPage: crp.PAGESDIR + '/members/profile/activity',
				context: {
					key: 'user',
					val: crp.global.users[k]
				}
			});
			
			crp.global.pages.push({
				slug: '/members/' + crp.global.users[k].nicename + '/account',
				path: '/members/profile',
				subPage: crp.PAGESDIR + '/members/profile/account',
				context: {
					key: 'user',
					val: crp.global.users[k]
				}
			});
		}
			
		crp.global.pages.push({
			slug: '/admin/users',
			path: '/admin/admin',
			role: 'administrator',
			subPage: crp.PAGESDIR + '/members/admin'
		});
		
		crp.global.pages.push({
			slug: '/register',
			path: '/members/register'
		});
		
		crp.global.pages.push({
			slug: '/registered',
			path: '/members/registered'
		});
	});
};