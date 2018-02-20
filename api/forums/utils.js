module.exports = (crp, callback) => {
	crp.util.getForums = (filter, cb) => {
		crp.db.collection(crp.db.PREFIX + 'forums').find(filter).toArray(cb);
	};

	crp.util.getTopics = (filter, cb) => {
		crp.db.collection(crp.db.PREFIX + 'topics').find(filter).toArray(cb);
	};

	crp.util.getReplies = (filter, cb) => {
		crp.db.collection(crp.db.PREFIX + 'replies').find(filter).toArray(cb);
	};

	crp.util.getForumData = (forumid, cb) => {
		if (typeof forumid != 'object') forumid = crp.db.objectID(forumid);
		crp.db.collection(crp.db.PREFIX + 'forums').findOne({_id: forumid}, cb);
	};

	crp.util.getTopicData = (topicid, cb) => {
		if (typeof topicid != 'object') topicid = crp.db.objectID(topicid);
		crp.db.collection(crp.db.PREFIX + 'topics').findOne({_id: topicid}, cb);
	};

	crp.util.getReplyData = (replyid, cb) => {
		if (typeof replyid != 'object') replyid = crp.db.objectID(replyid);
		crp.db.collection(crp.db.PREFIX + 'replies').findOne({_id: replyid}, cb);
	};

	crp.util.addTopic = (data, cb) => {
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

		crp.util.getUserData(topic.author, (err, user) => {
			if (err) return cb(err);
			if (!user || user.role == 'pending') return cb(null, 'generic');

			if (!topic.title || topic.title.length < 4) return 'titleShort';
			if (topic.title.length > 80) return 'titleLong';
			if (!topic.content || topic.content.length < 4) return 'bodyLength';

			crp.util.getForumData(topic.parent, (err, forum) => {
				if (err) return cb(err);
				if (!parent) return 'generic';

				topic = crp.util.sanitizeObject(topic);

				crp.db.collection(crp.db.PREFIX + 'topics').insertOne(topic, (err, result) => {
					if (err) return cb(err);	

					crp.global.pages.push({
						slug: '/forums/' + forum.slug + '/' + result.insertedId.toString(),
						path: '/forums/topic/index.njk',
						context: {topic: topic}
					});

					cb(err, topic);
				});

			});



		});
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
