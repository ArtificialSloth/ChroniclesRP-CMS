module.exports = (crp, callback) => {
	crp.util = {};

	crp.util.filterObject = (object, key, filter) => {
		var result = [];

		for (var k in object) {
			if (object[k][key] == filter) {
				result.push(object[k]);
			}
		}

		return result;
	};

	crp.util.findObjectInArray = (array, key, val) => {
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] == val) {
				return array[i];
			}
		}
	};

	crp.util.sanitizeObject = (object) => {
		for (var k in object) {
			if (typeof object[k] == 'object') {
				object[k] = crp.util.sanitizeObject(object[k]);
			} else {
				object[k] = crp.db.sanitize(object[k]);
			}
		}

		return object;
	};

	crp.util.parseString = (str, keys) => {
		for (var i in keys) {
			str = str.replace(new RegExp(keys[i][0], 'g'), keys[i][1]);
		}

		return str;
	};

	crp.util.dateToStr = (date) => {
		return crp.moment(date).utcOffset('-05:00').format('LLL');
	};

	crp.util.requireFiles = (file) => {
		return new Promise((resolve, reject) => {
			crp.fs.readdir(crp.ROOT + '/api/', (err, files) => {
				if (err) return reject(err);

				crp.async.each(files, (dir, cb) => {
					try {
						require(crp.ROOT + '/api/' + dir + file)(crp, cb);
					} catch(err) {
						if (err.code != 'MODULE_NOT_FOUND') return cb(err);
						return cb();
					}
				}, (err) => {
					if (err) return reject(err);

					return resolve();
				});
			});
		});
	};

	crp.util.processPage = (path, req) => {
		var context = {
			crp: crp,
			user: crp.util.getUserData(req.user)
		};
		var page = crp.util.findObjectInArray(crp.global.pages, 'slug', path);
		var post = crp.util.findObjectInArray(crp.global.posts, 'slug', path);

		if (page) {
			var canView = true;
			if (page.role && !crp.util.userIsRole(req.user, page.role)) canView = false;

			if (canView || crp.util.isUserAdmin(req.user)) {
				path = page.path;
				if (page.subPage) context.subPage = page.subPage;
				if (page.context) context = Object.assign(context, page.context);
			} else {
				path = '/404/index.njk';
			}
		} else if (post) {
			path = '/posts/index.njk';
			context.post = post;
		} else {
			path = '/404/index.njk';
		}

		context.path = path;
		return {path: path, context: context};
	};

	crp.util.replaceFile = (oldFile, newFile, newPath) => {
		crp.fs.unlink(oldFile, (err) => {
			if (err) return console.error(err);
		});

		crp.fs.rename(newFile, newPath, (err) => {
			if (err) return console.error(err);
		});
	};

	crp.util.editSite = (site) => {
		var newSite = {
			name: site.name || crp.global.site.name,
			tagline: site.tagline || crp.global.site.tagline,
			mail_template: site.mail_template || crp.global.site.mail_template
		};

		newSite = crp.util.sanitizeObject(newSite);
		crp.db.collection(crp.db.PREFIX + 'site').replaceOne({}, newSite);

		return crp.global.site = newSite;
	};

	crp.util.requireFiles('/utils.js').then(() => {
		callback(null, crp);
	}).catch((err) => {
		callback(err, crp);
	});
};
