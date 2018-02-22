module.exports = (crp, callback) => {
	crp.util.getForums = (filter, cb) => {
		crp.db.find('forums', filter, {}, cb);
	};

	crp.util.getTopics = (filter, cb) => {
		crp.db.find('topics', filter, {}, cb);
	};

	crp.util.getReplies = (filter, cb) => {
		crp.db.find('replies', filter, {}, cb);
	};

	crp.util.getForumData = (forumid, cb) => {
		if (typeof forumid != 'object') forumid = crp.db.objectID(forumid);
		crp.db.findOne('forums', {_id: forumid}, cb);
	};

	crp.util.getTopicData = (topicid, cb) => {
		if (typeof topicid != 'object') topicid = crp.db.objectID(topicid);
		crp.db.findOne('topics', {_id: topicid}, cb);
	};

	crp.util.getReplyData = (replyid, cb) => {
		if (typeof replyid != 'object') replyid = crp.db.objectID(replyid);
		crp.db.findOne('replies', {_id: replyid}, cb);
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

			if (!topic.title || topic.title.length < 4) return cb(null, 'titleShort');
			if (topic.title.length > 80) return cb(null, 'titleLong');
			if (!topic.content || topic.content.length < 4) return cb(null, 'bodyLength');

			crp.util.getForumData(topic.parent, (err, forum) => {
				if (err) return cb(err);
				if (!forum) return cb(null, 'generic');

				topic.parent = forum._id;

				topic = crp.util.sanitizeObject(topic);
				crp.db.insertOne('topics', topic, (err, result) => {
					if (err) return cb(err);

					crp.global.pages.push({
						slug: '/forums/' + forum.slug + '/' + result.insertedId.toString(),
						path: '/forums/topic/index.njk',
						context: {topicid: result.insertedId}
					});

					cb(null, topic);
				});
			});
		});
	};

	crp.util.addReply = (data, cb) => {
		var reply = {
			author: data.author,
			content: data.content,
			date: data.date || Date.now(),
			parent: data.parent
		};

		crp.util.getUserData(reply.author, (err, user) => {
			if (err) return cb(err);
			if (!user || user.role == 'pending') return cb(null, 'generic');;

			if (!reply.content || reply.content.length < 4) return cb(null, 'bodyLength');

			crp.util.getTopicData(reply.parent, (err, topic) => {
				if (err) return cb(err);
				if (!topic) return cb(null, 'generic');

				reply.parent = topic._id;

				reply = crp.util.sanitizeObject(reply);
				crp.db.insertOne('replies', reply, (err, result) => {
					cb(err, reply)
				});
			});
		});
	};

	crp.util.removeReply = (replyid, cb) => {
		crp.util.getReplyData(replyid, (err, reply) => {
			if (err) return cb(err);
			if (!reply) return cb(null, 'noReply');

			crp.db.deleteOne('replies', {_id: reply._id}, cb);
		});
	};

	callback();
};
