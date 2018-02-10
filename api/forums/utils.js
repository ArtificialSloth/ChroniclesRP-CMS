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
		return crp.util.getForums(['_id', forumid.toString()])[0];
	};

	crp.util.getForumsByCategory = (category) => {
		return crp.util.getForums(['category', category]);
	};

	crp.util.getTopicsByForum = (forumid) => {
		return crp.util.getTopics(['parent', forumid.toString()]);
	};

	crp.util.addTopic = (data) => {
		var topic = {
			author: data.author,
			title: data.title,
			type: data.type || 'normal',
			content: data.content,
			post_date: Date.now(),
			parent: data.parent,
			likes: 0,
			dislikes: 0
		};

		var user = crp.util.getUserData(topic.author);
		if (!user || user.role == 'pending') return 'generic';

		if (!topic.title || topic.title.length < 4) return 'titleShort';
		if (topic.title.length > 80) return 'titleLong';
		if (!topic.content || topic.content.length < 4) return 'bodyLength';

		var parent = crp.util.getForumData(topic.parent);
		if (!parent) return 'generic';

		topic = crp.util.sanitizeObject(topic);

		var newTopic = crp.db.collection(crp.db.PREFIX + 'topics').insertOne(topic);
		crp.global.topics.push(topic);
		crp.global.pages.push({
			slug: '/forums/' + parent.slug + '/' + newTopic.insertedId.toString(),
			path: '/forums/topic/index.njk',
			context: {topic: topic}
		});

		return topic;
	};

	callback();
};
