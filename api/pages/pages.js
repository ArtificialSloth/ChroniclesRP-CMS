module.exports = (crp, callback) => {
	crp.pages = {};
	crp.pages.processors = [];

	crp.pages.add = (cb) => {
		crp.pages.processors.push(cb);
	};

	crp.pages.processPage = (slug, userid, cb) => {
		slug = slug.split('?')[0];
		crp.sites.findOne({}, (err, site) => {
			if (err) return cb(err);
			if (!site) return cb('noSite');

			var page;
			var context = {crp: crp, css: site.css};
			crp.async.each(crp.pages.processors, (processor, callback) => {
				if (page) return callback();
				processor(slug, (err, result) => {
					if (err) return callback(err);
					if (!result) return callback();

					page = result;
					callback();
				});
			}, (err) => {
				if (err) return cb(err);
				if (!page) page = {path: '/404/index.njk'};

				if (page.subPage) context.subPage = page.subPage;
				if (page.context) context = Object.assign(context, page.context);

				crp.users.findById(userid, (err, user) => {
					if (err) return cb(err);
					if ((!user && page.role) || (user && page.role && user.role < page.role) || (user && page.role && user.role < 3)) page = {path: '/404/index.njk'};

					context.user = user;
					context.path = page.path;
					cb(null, {path: page.path, context: context});
				});
			});
		});
	};

	crp.pages.add((slug, cb) => {
		if (slug == '/') return cb(null, {path: '/home/index.njk'});
		if (slug == '/admin/settings') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/admin/settings/index.njk',
			role: 3
		});

		cb();
	});

	callback(null, crp);
};
