module.exports = (crp, callback) => {
	crp.pages = {};

	crp.pages.getPages = (filter, cb) => {
		crp.db.find('pages', filter, {}, cb);
	};

	crp.pages.getPage = (filter, cb) => {
		crp.db.findOne('pages', filter, cb);
	};

	crp.pages.setPageData = (filter, data, cb) => {
		crp.pages.getPage(filter, (err, page) => {
			if (!page) return cb('noPage');

			var newPage = {
				slug: data.slug || page.slug,
				path: data.path || page.slug,
				role: data.role || page.role || null,
				subPage: data.subPage || page.subPage || null,
				context: data.context || page.context || null
			}

			crp.db.replaceOne('pages', {_id: page._id}, newPage, cb);
		});
	};

	crp.pages.addPage = (data, cb) => {
		var page = {
			slug: data.slug,
			path: data.path,
			role: data.role || null,
			subPage: data.subPage || null,
			context: data.context || null
		};

		if (!page.slug) return cb('noSlug');
		if (!page.path) return cb('noPath');

		crp.db.insertOne('pages', page, (err, result) => {
			if (err) return cb(err);

			cb(null, page);
		});
	};

	crp.pages.removePage = (filter, cb) => {
		crp.pages.getPage(filter, (err, page) => {
			if (!page) return cb('noPage');

			crp.db.deleteOne('pages', {_id: page._id}, cb);
		});
	};

	callback(null, crp);
};
