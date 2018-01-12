module.exports = (crp) => {
	crp.db.collection(crp.db.PREFIX + 'users').find({}).toArray((err, result) => {
		if (err) return console.error(err);
		
		crp.global.users = result;						
		for (var k in crp.global.users) {
			crp.util.addProfilePage(crp.global.users[k]);
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