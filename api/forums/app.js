module.exports = (crp, callback) => {
	crp.app.post('/api/new-forum', (req, res) => {
		crp.categories.findById(req.body.category, (err, category) => {
			if (err) return res.send(err);
			if (!category) return res.send('noCategory');

			crp.chapters.findById(category.chapter, (err, chapter) => {
				if (err) return res.send(err);

				crp.users.findById(req.user, (err, user) => {
					if (err) return res.send(err);
					if (!user) return res.send('noUser');

					var member = chapter.getMember(user._id);
					if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');

					var forumData = {
						name: req.body.name,
						desc: req.body.desc,
						category: req.body.category
					};

					new crp.forums(forumData).save((err, forum) => {
						if (err) return res.send(err);

						res.send(true);
					});
				});
			});
		});
	});

	crp.app.post('/api/new-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 1) return res.send('notAllowed');

			crp.forums.findById(req.body.parent, (err, forum) => {
				if (err) return res.send(err);
				if (!forum) return res.send('noForum');

				crp.categories.findById(forum.category, (err, category) => {
					if (err) return res.send(err);
					if (!category) return res.send('noCategory');
					if (category.role && user.role < category.role && user.role < 3) return res.send('notAllowed');

					crp.chapters.findById(category.chapter, (err, chapter) => {
						if (err) return res.send(err);
						if (chapter && !chapter.getMember(user._id) && user.role < 3) return res.send('notAllowed');

						var topicData = {
							author: req.user,
							title: req.body.title,
							content: req.body.body,
							type: req.body.type,
							parent: req.body.parent
						};

						new crp.topics(topicData).save((err, topic) => {
							if (err) return res.send(err);

							res.send(topic);
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/new-reply', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 1) return res.send('notAllowed');

			crp.topics.findById(req.body.parent, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');

				crp.forums.findById(topic.parent, (err, forum) => {
					if (err) return res.send(err);
					if (!forum) return res.send('noForum');

					crp.categories.findById(forum.category, (err, category) => {
						if (err) return res.send(err);
						if (!category) return res.send('noCategory');
						if (category.role && user.role < category.role && user.role < 3) return res.send('notAllowed');

						crp.chapters.findById(category.chapter, (err, chapter) => {
							if (err) return res.send(err);
							if (chapter && !chapter.getMember(user._id) && user.role < 3) return res.send('notAllowed');

							var replyData = {
								author: req.user,
								content: req.body.reply,
								parent: req.body.parent
							};

							new crp.replies(replyData).save((err, reply) => {
								if (err) return res.send(err);

								crp.async.each(topic.subs, (subid, cb) => {
									if (subid.equals(user._id)) return cb();

									crp.users.findById(subid, (err, sub) => {
										if (err) return cb(err);

										crp.mail.send(sub.email, `New Reply to ${topic.title}`, `<a href="https://chroniclesrp.com/members/${user.slug}">${user.display_name}</a> replied to <a href="https://chroniclesrp.com/forums/${forum.slug}/${topic._id}">${topic.title}</a>`);
										cb();
									});
								}, (err) => {
									if (err) res.send(err);
									res.send(reply);
								});
							});
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/edit-topic', (req, res) => {
		crp.topics.findById(req.body.topicid, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || (!topic.author.equals(user._id) && user.role < 3)) return res.send('notAllowed');

				var topicData = {
					title: req.body.title,
					content: req.body.body,
				};
				if (user.role >= 2) topicData.type = req.body.type;

				crp.topics.updateOne({_id: topic._id}, topicData, {runValidators: true}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/subscribe-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('notAllowed');

			crp.topics.findById(req.body.topicid, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');
				if (topic.subs && crp.util.idInArray(topic.subs, user._id)) return res.send('alreadySubbed');

				var topicData = {subs: topic.subs ? topic.subs.concat([user._id]) : [user._id]};
				crp.topics.updateOne({_id: topic._id}, topicData, {runValidators: true}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/unsubscribe-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('notAllowed');

			crp.topics.findById(req.body.topicid, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');
				if (!topic.subs || !crp.util.idInArray(topic.subs, user._id)) return res.send('notSubbed');

				topic.subs.splice(crp.util.indexOfId(topic.subs, user._id), 1);
				var topicData = {subs: topic.subs};
				crp.topics.updateOne({_id: topic._id}, topicData, {runValidators: true}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/edit-reply', (req, res) => {
		crp.replies.findById(req.body.replyid, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || (!reply.author.equals(user._id) && user.role < 3)) return res.send('notAllowed');

				var replyData = {content: req.body.reply};
				crp.replies.updateOne({_id: reply._id}, replyData, {runValidators: true}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/remove-forum', (req, res) => {
		crp.forums.findById(req.body.forumid, (err, forum) => {
			if (err) return res.send(err);
			if (!forum) return res.send('noForum');

			crp.categories.findById(forum.category, (err, category) => {
				if (err) return res.send(err);
				if (!category) return res.send('noCategory');

				crp.chapters.findById(category.chapter, (err, chapter) => {
					if (err) return res.send(err);

					crp.users.findById(req.user, (err, user) => {
						if (err) return res.send(err);
						if (!user) return res.send('noUser');

						var member = chapter.getMember(user._id);
						if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
						crp.forums.deleteOne({_id: forum._id}, (err) => {
							if (err) return res.send(err);

							res.send(true);
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/remove-topic', (req, res) => {
		crp.topics.findById(req.body.topicid, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');
				if (!user._id.equals(topic.author) && user.role < 3) return res.send('notAllowed');

				crp.topics.deleteOne({_id: topic._id}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/remove-reply', (req, res) => {
		crp.replies.findById(req.body.replyid, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');
				if (!user._id.equals(reply.author) && user.role < 3) return res.send('notAllowed');

				crp.replies.deleteOne({_id: reply._id}, (err) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	callback()
};
