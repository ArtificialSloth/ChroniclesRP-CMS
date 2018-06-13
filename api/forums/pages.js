module.exports = (crp, callback) => {
	crp.pages.push({
		slug: '/forums',
		path: '/forums/index.njk'
	});

	crp.pages.push({
		slug: '/admin/forums',
		path: '/admin/index.njk',
		role: 3,
		subPage: '/forums/admin/index.njk'
	});

	crp.util.getForums({}, (err, forums) => {
		if (err) return callback(err);

		for (var i in forums) {
			crp.pages.push({
				slug: '/forums/' + forums[i].slug,
				path: '/forums/forum/index.njk',
				context: {forumid: forums[i]._id}
			});
		}

		crp.util.getTopics({}, (err, topics) => {
			if (err) return callback(err);

			crp.async.each(topics, (topic, cb) => {
				crp.util.getForumData(topic.parent, (err, forum) => {
					if (err) return cb(err);

					crp.pages.push({
						slug: '/forums/' + forum.slug + '/' + topic._id,
						path: '/forums/topic/index.njk',
						context: {topicid: topic._id}
					});

					cb()
				});
			}, callback);
		});
	});
};
