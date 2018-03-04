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

	crp.util.setTopicData = (topicid, data, cb) => {
		crp.util.getTopicData(topicid, (err, topic) => {
			if (err) return cb(err);
			if (!topic) return cb('noTopic');

			var newTopic = topic;

			if (data.title && data.title != newTopic.title) {
				if (data.title.length < 4) return cb('titleLength');

				newTopic.title = data.title;
			}

			if (data.author && data.author != newTopic.author) newTopic.author = data.author;

			if (data.content && data.content != newTopic.content) {
				if (data.content.length < 4) return cb('bodyLength');

				newTopic.content = data.content;
			}

			if (data.parent && data.parent != newTopic.parent) newTopic.parent = data.parent;
			if (data.likes !== undefined && data.likes != newTopic.likes) newTopic.likes = data.likes;
			if (data.dislikes !== undefined && data.dislikes != newTopic.dislikes) newTopic.dislikes = data.dislikes;

			newTopic = crp.util.sanitizeObject(newTopic);
			crp.db.replaceOne('topics', {_id: topic._id}, newTopic, (err, result) => {
				cb(err, newTopic);
			});
		});
	};

	crp.util.addTopic = (data, cb) => {
		var topic = {
			author: data.author,
			title: data.title,
			type: data.type || 'normal',
			content: data.content,
			date: data.date || Date.now(),
			parent: data.parent,
			likes: data.likes || 0,
			dislikes: data.dislikes || 0
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

					crp.pages.push({
						slug: '/forums/' + forum.slug + '/' + result.insertedId.toString(),
						path: '/forums/topic/index.njk',
						context: {topicid: result.insertedId}
					});

					cb(null, topic);
				});
			});
		});
	};

	crp.util.removeTopic = (topicid, cb) => {
		crp.util.getTopicData(topicid, (err, topic) => {
			if (err) return cb(err);
			if (!topic) return cb(null, 'noTopic');

			crp.db.deleteMany('replies', {parent: topic._id}, (err, result) => {
				if (err) return cb(err);

				crp.db.deleteOne('topics', {_id: topic._id}, (err, result) => {
					if (err) return cb(err);

					crp.pages.splice(crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'context', {topicid: topic._id})), 1);
					return cb(null, result);
				});
			});
		});
	};

	crp.util.setReplyData = (replyid, data, cb) => {
		crp.util.getReplyData(replyid, (err, reply) => {
			if (err) return cb(err);
			if (!reply) return cb('noReply');

			var newReply = reply;

			if (data.author && data.author != newReply.author) newReply.author = data.author;

			if (data.content && data.content != newReply.content) {
				if (data.content.length < 4) return cb('bodyLength');

				newReply.content = data.content;
			}

			if (data.likes !== undefined && data.likes != newReply.likes) newReply.likes = data.likes;
			if (data.dislikes !== undefined && data.dislikes != newReply.dislikes) newReply.dislikes = data.dislikes;

			newReply = crp.util.sanitizeObject(newReply);
			crp.db.replaceOne('replies', {_id: reply._id}, newReply, (err, result) => {
				cb(err, newReply);
			});
		});
	};

	crp.util.addReply = (data, cb) => {
		var reply = {
			author: data.author,
			content: data.content,
			date: data.date || Date.now(),
			parent: data.parent,
			likes: data.likes || 0,
			dislikes: data.dislikes || 0
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
