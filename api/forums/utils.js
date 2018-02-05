module.exports = (crp, callback) => {
	crp.util.getForums = (filter) => {
		var forums = crp.global.forums;

		if (filter) {
			forums = crp.util.filterObject(forums, filter[0], filter[1]);
		}

		return forums.sort((a, b) => {
			return a.order - b.order;
		});
	};

	crp.util.getTopics = (filter) => {
		var topics = crp.global.topics;

		if (filter) {
			topics = crp.util.filterObject(topics, filter[0], filter[1]);
		}

		return topics.sort((a, b) => {
			return b.post_date - a.post_date;
		});
	};

	crp.util.getForumData = (forumid) => {
		return crp.util.getForums(['_id', forumid.toString()]);
	};

	crp.util.getForumsByCategory = (category) => {
		return crp.util.getForums(['category', category]);
	};

	crp.util.getTopicsByForum = (forumid) => {
		return crp.util.getTopics(['parent', forumid.toString()]);
	};

	crp.util.addTopic = (data) => {
		var topic = {
			post_date: Date.now(),
			likes: 0,
			dislikes: 0
		};
		topic = Object.assign(topic, data);
	};

	callback();
};
