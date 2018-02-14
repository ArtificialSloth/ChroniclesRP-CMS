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
			return b.date - a.date;
		});
	};

	crp.util.getReplies = (filter) => {
		var replies = crp.global.replies;

		if (filter) {
			replies = crp.util.filterObject(replies, filter[0], filter[1]);
		}

		return replies.sort((a, b) => {
			return a.date - b.date;
		});
	};

	crp.util.getForumData = (forumid) => {
		if (!forumid) return false;

		return crp.util.getForums(['_id', forumid.toString()])[0];
	};

	crp.util.getTopicData = (topicid) => {
		if (!topicid) return false;

		return crp.util.getTopics(['_id', topicid.toString()])[0];
	};

	crp.util.getReplyData = (replyid) => {
		if (!replyid) return false;

		return crp.util.getReplies(['_id', replyid.toString()])[0];
	};

	crp.util.getForumsByCategory = (category) => {
		return crp.util.getForums(['category', category]);
	};

	crp.util.getTopicsByForum = (forumid) => {
		return crp.util.getTopics(['parent', forumid.toString()]);
	};

	crp.util.getRepliesByTopic = (topicid) => {
		return crp.util.getReplies(['parent', topicid.toString()]);
	};

	crp.util.addTopic = (data) => {
		var topic = {
			author: data.author,
			title: data.title,
			type: data.type || 'normal',
			content: data.content,
			date: data.date || Date.now(),
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

	crp.util.addReply = (data) => {
		var reply = {
			author: data.author,
			content: data.content,
			date: data.date || Date.now(),
			parent: data.parent
		};

		var user = crp.util.getUserData(reply.author);
		if (!user || user.role == 'pending') return 'generic';

		if (!reply.content || reply.content.length < 4) return 'bodyLength';

		var parent = crp.util.getTopicData(reply.parent);
		if (!parent) return 'generic';

		reply = crp.util.sanitizeObject(reply);

		crp.db.collection(crp.db.PREFIX + 'replies').insertOne(reply);
		crp.global.replies.push(reply);

		return reply;
	};

	crp.util.removeReply = (replyid) => {
		var reply = crp.util.getReplyData(replyid);

		if (reply) {
			crp.db.collection(crp.db.PREFIX + 'replies').deleteOne({_id: reply._id});
			crp.global.replies.splice(crp.global.replies.indexOf(reply), 1);

			return true;
		}
	};

	callback();
};
