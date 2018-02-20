module.exports = (crp, callback) => {
	crp.global = {};
	crp.global.pages = [
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
