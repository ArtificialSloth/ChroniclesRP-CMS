module.exports = (crp, callback) => {
	crp.express.app.post('/api/new-topic', (req, res) => {
		var topicData = {
			author: req.user,
			title: req.body.topic_title,
			content: req.body.topic_body,
			type: req.body.topic_type,
			parent: req.body.topic_parent
		};

		crp.util.addTopic(topicData, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/new-reply', (req, res) => {
		var replyData = {
			author: req.user,
			content: req.body.reply,
			parent: req.body.parent
		};

		crp.util.addReply(replyData, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/remove-topic', (req, res) => {
		crp.util.getTopicData(req.body.topicid, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (topic.author.equals(user._id) || user.role >= 3) {
					crp.util.removeTopic(topic._id, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				} else {
					res.send('notAllowed');
				}
			});
		});
	});

	crp.express.app.post('/api/remove-reply', (req, res) => {
		crp.util.getReplyData(req.body.replyid, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (reply.author.equals(user._id) || user.role >= 3) {
					crp.util.removeReply(reply._id, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				} else {
					res.send('notAllowed');
				}
			});
		});
	});

	crp.express.app.post('/api/admin/new-topic', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			var topicData = {
				author: crp.db.objectID(req.body.topic_author),
				title: req.body.topic_title,
				content: req.body.topic_body,
				date: Date.parse(req.body.topic_date),
				parent: crp.db.objectID(req.body.topic_parent),
				likes: parseInt(req.body.topic_likes),
				dislikes: parseInt(req.body.topic_dislikes)
			};

			crp.util.addTopic(topicData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.express.app.post('/api/admin/edit-topic', (req, res) => {
		crp.util.getTopicData(req.body.topic_id, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || user.role < 3) return res.send('notAllowed');

				var topicData = {
					author: crp.db.objectID(req.body.topic_author),
					title: req.body.topic_title,
					content: req.body.topic_body,
					parent: crp.db.objectID(req.body.topic_parent),
					likes: parseInt(req.body.topic_likes),
					dislikes: parseInt(req.body.topic_dislikes)
				};

				crp.util.setTopicData(topic._id, topicData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/admin/new-reply', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			var replyData = {
				author: crp.db.objectID(req.body.reply_author),
				content: req.body.reply_body,
				date: Date.parse(req.body.reply_date),
				parent: req.body.reply_parent,
				likes: parseInt(req.body.reply_likes),
				dislikes: parseInt(req.body.reply_dislikes)
			};

			crp.util.addReply(replyData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.express.app.post('/api/admin/edit-reply', (req, res) => {
		crp.util.getReplyData(req.body.reply_id, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || user.role < 3) return res.send('notAllowed');

				var replyData = {
					author: crp.db.objectID(req.body.reply_author),
					content: req.body.reply_body,
					likes: parseInt(req.body.reply_likes),
					dislikes: parseInt(req.body.reply_dislikes)
				};

				crp.util.setReplyData(reply._id, replyData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	callback()
};
