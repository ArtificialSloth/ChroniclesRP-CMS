module.exports = (crp, callback) => {
	crp.express.app.post('/api/new-topic', (req, res) => {
		var topicData = {
			author: req.user,
			title: req.body.topic_title,
			content: req.body.topic_body,
			type: req.body.topic_type,
			parent: req.body.topic_parent
		};

		res.send(crp.util.addTopic(topicData));
	});

	crp.express.app.post('/api/new-reply', (req, res) => {
		var replyData = {
			author: req.user,
			content: req.body.reply,
			parent: req.body.parent
		};

		res.send(crp.util.addReply(replyData));
	});

	crp.express.app.post('/api/remove-reply', (req, res) => {
		var reply = crp.util.getReplyData(req.body.replyid);

		if (reply && reply.author == req.user || reply && crp.util.isUserAdmin(req.user)) {
			res.send(crp.util.removeReply(reply._id));
		}
	});

	callback()
};
