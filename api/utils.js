module.exports = (crp, callback) => {
	crp.util = {};

	crp.util.filterObjectArray = (array, filter) => {
		var result = [];
		if (Object.keys(filter).length == 0) return array;

		for (var i in array) {
			for (var k in array[i]) {
				if (filter[k] && filter[k] == array[i][k]) result.push(array[i]);
			}
		}

		return result;
	};

	crp.util.findObjectInArray = (array, key, val) => {
		for (var i in array) {
			if (array[i][key] == val) {
				return array[i];
			}
		}
	};

	crp.util.sortObjectArray = (array, key, order) => {
		var result = array.sort((a, b) => {
			return a[key] - b[key];
		});

		if (order == -1) result = result.reverse();
		return result;
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

	crp.util.urlSafe = (str) => {
		return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	};

	crp.util.dateToStr = (date, tz) => {
		return crp.moment(date).tz(tz || 'America/New_York').format('LLL');
	};

	crp.util.wait = (time, cb) => {
		setTimeout(() => {
			cb();
		}, time);
	};

	crp.util.requireFiles = (file, cb) => {
		crp.fs.readdir(crp.ROOT + '/api/', (err, files) => {
			if (err) return cb(err);

			crp.async.each(files, (dir, callback) => {
				try {
					require(crp.ROOT + '/api/' + dir + file)(crp, callback);
				} catch(err) {
					if (err.code != 'MODULE_NOT_FOUND') return callback(err);
					callback();
				}
			}, (err) => {
				cb(err);
			});
		});
	};

	crp.util.processPage = (path, req, cb) => {
		var context = {
			crp: crp,
			userid: req.user,
			css: {
				colors: {
					font: '#EDEDED',
					link: '#3bc492',
					bg: '#141414',
					bodyBg: '#1D1D1D',
					header: '#323232',
					primary: '#242424',
					secondary: '#0c9060'
				},
				img: {
					bg: '/img/bg.jpg'
				}
			}
		};
		var page = crp.util.findObjectInArray(crp.pages, 'slug', path);

		if (page) {
			crp.util.getUserData(req.user, (err, user) => {
				if (err) return cb(err);

				var canView = true;
				if (page.role && user.role != page.role) canView = false;

				if (canView || user.role == 'administrator') {
					path = page.path;
					if (page.subPage) context.subPage = page.subPage;
					if (page.context) context = Object.assign(context, page.context);
				} else {
					path = '/404/index.njk';
				}

				context.path = path;
				cb(null, {path: path, context: context});
			});
		} else {
			crp.util.getPosts({slug: path}, (err, posts) => {
				if (err) return cb(err);

				if (posts[0] && posts[0].type == 'page') {
					path = '/posts/index.njk';
					context.postid = posts[0]._id;
				} else {
					path = '/404/index.njk';
				}

				context.path = path;
				cb(null, {path: path, context: context});
			});
		}
	};

	crp.util.replaceFile = (oldFile, newFile, newPath, cb) => {
		crp.fs.unlink(oldFile, (err) => {
			if (err) return console.error(err);

			crp.fs.rename(newFile, newPath, console.error);
		});
	};

	crp.util.editSite = (data, cb) => {
		crp.db.findOne('site', {}, (err, site) => {
			if (err) return cb(err);

			var newSite = {
				name: data.name || site.name,
				tagline: data.tagline || site.tagline,
				mail_template: data.mail_template || site.mail_template
			};

			newSite = crp.util.sanitizeObject(newSite);
			crp.db.replaceOne('site', {}, newSite, (err, result) => {
				cb(err, site)
			});

		});
	};

	crp.util.requireFiles('/utils.js', (err) => {
		callback(err, crp);
	});
};
