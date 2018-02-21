module.exports = (crp, callback) => {
	crp.pages = [
		{slug: '/', path: '/home/index.njk'},
		{
			slug: '/admin/settings',
			path: '/admin/index.njk',
			role: 'administrator',
			subPage: '/admin/settings/index.njk'
		}
	];

	callback();
}
