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

	crp.util.sortObjectArrayAlphabetical = (array, key, order) => {
		var result = array.sort((a, b) => {
			return a[key].toUpperCase().localeCompare(b[key].toUpperCase());
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
		if (!str) return;
		return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '');
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
		crp.fs.readdir(crp.root + '/api/', (err, files) => {
			if (err) return cb(err);

			crp.async.each(files, (dir, callback) => {
				try {
					require(crp.root + '/api/' + dir + file)(crp, callback);
				} catch(err) {
					if (err.code != 'MODULE_NOT_FOUND') return callback(err);
					callback();
				}
			}, (err) => {
				cb(err);
			});
		});
	};

	crp.util.editSite = (data, cb) => {
		crp.db.findOne('site', {}, (err, site) => {
			if (err) return cb(err);

			var newSite = {
				name: data.name || site.name,
				tagline: data.tagline || site.tagline,
				mail_template: data.mail_template || site.mail_template,
				css: site.css
			};

			newSite = crp.util.sanitizeObject(newSite);
			crp.db.replaceOne('site', {}, newSite, (err, result) => {
				cb(err, site)
			});

		});
	};

	callback(null, crp);
};
