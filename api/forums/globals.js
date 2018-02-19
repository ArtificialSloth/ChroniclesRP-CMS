module.exports = (crp, callback) => {
	crp.global.pages.push({
		slug: '/forums',
		path: '/forums/index.njk'
	});

	crp.db.collection(crp.db.PREFIX + 'categories').find({}).toArray((err, result) => {
		if (err) return callback(err);

		crp.global.categories = result.sort((a, b) => {
			return a.order - b.order;
		});

		crp.db.collection(crp.db.PREFIX + 'forums').find({}).toArray((err, result) => {
			if (err) return callback(err);

			crp.global.forums = result;
			for (var i in crp.global.forums) {
				crp.global.pages.push({
					slug: '/forums/' + crp.global.forums[i].slug,
					path: '/forums/forum/index.njk',
					context: {forumid: crp.global.forums[i]._id}
				});
			}

			crp.db.collection(crp.db.PREFIX + 'topics').find({}).toArray((err, result) => {
				if (err) return callback(err);

				crp.global.topics = result.sort((a, b) => {
					return b.date - a.date;
				});
				for (var i in crp.global.topics) {
					var parent = crp.util.getForumData(crp.global.topics[i].parent);

					crp.global.pages.push({
						slug: '/forums/' + parent.slug + '/' + crp.global.topics[i]._id,
						path: '/forums/topic/index.njk',
						context: {topicid: crp.global.topics[i]._id}
					});
				}

				crp.db.collection(crp.db.PREFIX + 'replies').find({}).toArray((err, result) => {
					if (err) return callback(err);

					crp.global.replies = result;
					callback();
				});
			});
		});
	});
};
