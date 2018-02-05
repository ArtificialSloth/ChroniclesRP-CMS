module.exports = (crp, callback) => {
	crp.global.pages.push({
		slug: '/forums',
		path: '/forums/index.njk'
	});

	crp.async.parallel([
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'categories').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.categories = result.sort((a, b) => {
					return a.order - b.order;
				});;
				cb();
			});
		},
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'forums').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.forums = result;
				for (var i in crp.global.forums) {
					crp.global.pages.push({
						slug: '/forums/' + crp.global.forums[i].slug,
						path: '/forums/forum/index.njk',
						context: {forum: crp.global.forums[i]}
					});
				}

				cb();
			});
		},
		(cb) => {
			crp.db.collection(crp.db.PREFIX + 'topics').find({}).toArray((err, result) => {
				if (err) return cb(err);

				crp.global.topics = result;
				for (var i in crp.global.topics) {
					var parent = crp.util.getForumData(crp.global.topics[i].parent);

					crp.global.pages.push({
						slug: '/forums/' + parent.slug + '/' + crp.global.topics[i]._id,
						path: '/forums/topic/index.njk',
						context: {topic: crp.global.topics[i]}
					});
				}

				cb();
			});
		}
	], (err, results) => {
		if (err) callback(err);

		callback();
	})
}
