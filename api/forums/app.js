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

	callback()
};
