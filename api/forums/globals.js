module.exports = (crp, callback) => {
	crp.global.pages.push({
		slug: '/forums',
		path: '/forums/index.njk'
	});

	crp.util.getForums({}, (err, forums) => {
		if (err) return callback(err);

		for (var i in forums) {
			crp.global.pages.push({
				slug: '/forums/' + forums[i].slug,
				path: '/forums/forum/index.njk',
				context: {forumid: forums[i]._id}
			});
		}

		crp.util.getTopics({}, (err, topics) => {
			if (err) return callback(err);

			for (var i in topics) {
				crp.util.getForumData(topics[i].parent, (err, forum) => {
					if (err) return callback(err);

					crp.global.pages.push({
						slug: '/forums/' + forum.slug + '/' + topics[i]._id,
						path: '/forums/topic/index.njk',
						context: {topicid: topics[i]._id}
					});
				});
			}

			callback();
		});
	});
};
