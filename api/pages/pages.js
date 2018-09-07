module.exports = (crp, callback) => {
	crp.pages = {};
	crp.pages.processors = [];

	crp.pages.add = (cb) => {
		crp.pages.processors.push(cb);
	};

	crp.pages.processPage = (slug, userid, cb) => {
		var page;
		var context = {crp: crp};

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
			if (!page) return cb(null, {path: '/404/index.njk', context: context});

			context.path = page.path;
			if (page.subPage) context.subPage = page.subPage;
			if (page.context) context = Object.assign(context, page.context);

			crp.db.findOne('site', {}, (err, site) => {
				if (err) return cb(err);
				if (!site) return cb(null, {path: '/404/index.njk', context: context});

				context.css = site.css;
				crp.members.get(userid, (err, user) => {
					if (err) return cb(err);
					if ((!user && page.role) || (user && page.role && user.role < page.role) || (user && page.role && user.role < 3)) return cb(null, {path: '/404/index.njk', context: context});

					context.userid = user ? user._id : null;
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
