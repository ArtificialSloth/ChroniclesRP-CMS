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

				if (topic.author == user._id || user.role == 'administrator') {
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

				if (reply.author == user._id || user.role == 'administrator') {
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

	callback()
};
