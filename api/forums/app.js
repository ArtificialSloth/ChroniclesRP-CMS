module.exports = (crp, callback) => {
	crp.app.post('/api/new-forum', (req, res) => {
		crp.forums.getCategoryData(req.body.category, (err, category) => {
			if (err) return res.send(err);
			if (!category) return res.send('noCategory');

			crp.chapters.get(category.chapter, (err, chapter) => {
				if (err) return res.send(err);

				crp.users.findById(req.user, (err, user) => {
					if (err) return res.send(err);
					if (!user) return res.send('noUser');

					var member = crp.chapters.getMember(chapter, user._id);
					if ((member && member.role >= 2) || user.role >= 3) {
						var forumData = {
							name: req.body.name,
							desc: req.body.desc,
							category: req.body.category
						};

						crp.forums.addForum(forumData, (err, result) => {
							if (err) return res.send(err);

							res.send(result);
						});
					} else {
						res.send('notAllowed');
					}
				});
			});
		});
	});

	crp.app.post('/api/new-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 1) return res.send('notAllowed');

			crp.forums.getForumData(req.body.parent, (err, forum) => {
				if (err) return res.send(err);
				if (!forum) return res.send('noForum');

				crp.forums.getCategoryData(forum.category, (err, category) => {
					if (err) return res.send(err);
					if (!category) return res.send('noCategory');
					if (category.role && user.role < category.role && user.role < 3) return res.send('notAllowed');

					crp.chapters.get(category.chapter, (err, chapter) => {
						if (err) return res.send(err);
						if (chapter && !crp.chapters.getMember(chapter, user._id) && user.role < 3) return res.send('notAllowed');

						var topicData = {
							author: req.user,
							title: req.body.title,
							content: req.body.body,
							type: req.body.type,
							parent: req.body.parent
						};

						crp.forums.addTopic(topicData, (err, result) => {
							if (err) return res.send(err);

							res.send(result);
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

			crp.forums.getTopicData(req.body.parent, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');

				crp.forums.getForumData(topic.parent, (err, forum) => {
					if (err) return res.send(err);
					if (!forum) return res.send('noForum');

					crp.forums.getCategoryData(forum.category, (err, category) => {
						if (err) return res.send(err);
						if (!category) return res.send('noCategory');
						if (category.role && user.role < category.role && user.role < 3) return res.send('notAllowed');

						crp.chapters.get(category.chapter, (err, chapter) => {
							if (err) return res.send(err);
							if (chapter && !crp.chapters.getMember(chapter, user._id) && user.role < 3) return res.send('notAllowed');

							var replyData = {
								author: req.user,
								content: req.body.reply,
								parent: req.body.parent
							};

							crp.forums.addReply(replyData, (err, result) => {
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
									res.send(result);
								});
							});
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/edit-topic', (req, res) => {
		crp.forums.getTopicData(req.body.topicid, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || (!topic.author.equals(user._id) && user.role < 3)) return res.send('notAllowed');

				var topicData = {
					title: req.body.title,
					content: req.body.body,
				};

				if (user.role >= 2) {
					topicData.type = req.body.type;
				}

				crp.forums.setTopicData(topic._id, topicData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/subscribe-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('notAllowed');

			crp.forums.getTopicData(req.body.topicid, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');
				if (topic.subs && crp.util.idInArray(topic.subs, user._id)) return res.send('alreadySubbed');

				var topicData = {subs: topic.subs ? topic.subs.concat([user._id]) : [user._id]};
				crp.forums.setTopicData(topic._id, topicData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/unsubscribe-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('notAllowed');

			crp.forums.getTopicData(req.body.topicid, (err, topic) => {
				if (err) return res.send(err);
				if (!topic) return res.send('noTopic');
				if (!topic.subs || !crp.util.idInArray(topic.subs, user._id)) return res.send('notSubbed');

				topic.subs.splice(crp.util.indexOfId(topic.subs, user._id), 1);
				var topicData = {subs: topic.subs};
				crp.forums.setTopicData(topic._id, topicData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/edit-reply', (req, res) => {
		crp.forums.getReplyData(req.body.replyid, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || (!reply.author.equals(user._id) && user.role < 3)) return res.send('notAllowed');

				var replyData = {
					content: req.body.reply,
				};

				crp.forums.setReplyData(reply._id, replyData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/remove-forum', (req, res) => {
		crp.forums.getForumData(req.body.forumid, (err, forum) => {
			if (err) return res.send(err);
			if (!forum) return res.send('noForum');

			crp.forums.getCategoryData(forum.category, (err, category) => {
				if (err) return res.send(err);
				if (!category) return res.send('noCategory');

				crp.chapters.get(category.chapter, (err, chapter) => {
					if (err) return res.send(err);

					crp.users.findById(req.user, (err, user) => {
						if (err) return res.send(err);
						if (!user) return res.send('noUser');

						var member = crp.chapters.getMember(chapter, user._id);
						if ((member && member.role >= 2) || user.role >= 3) {
							crp.forums.removeForum(forum._id, (err, result) => {
								if (err) return res.send(err);

								res.send(result);
							});
						} else {
							res.send('notAllowed');
						}
					});
				});
			});
		});
	});

	crp.app.post('/api/remove-topic', (req, res) => {
		crp.forums.getTopicData(req.body.topicid, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (topic.author.equals(user._id) || user.role >= 3) {
					crp.forums.removeTopic(topic._id, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				} else {
					res.send('notAllowed');
				}
			});
		});
	});

	crp.app.post('/api/remove-reply', (req, res) => {
		crp.forums.getReplyData(req.body.replyid, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (reply.author.equals(user._id) || user.role >= 3) {
					crp.forums.removeReply(reply._id, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				} else {
					res.send('notAllowed');
				}
			});
		});
	});

	crp.app.post('/api/admin/new-topic', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			var topicData = {
				author: req.body.author,
				title: req.body.title,
				content: req.body.body,
				date: req.body.date,
				parent: req.body.parent
			};

			crp.forums.addTopic(topicData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.app.post('/api/admin/edit-topic', (req, res) => {
		crp.forums.getTopicData(req.body.topic_id, (err, topic) => {
			if (err) return res.send(err);
			if (!topic) return res.send('noTopic');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || user.role < 3) return res.send('notAllowed');

				var topicData = {
					author: crp.db.objectID(req.body.topic_author),
					title: req.body.topic_title,
					content: req.body.topic_body,
					parent: crp.db.objectID(req.body.topic_parent)
				};

				crp.forums.setTopicData(topic._id, topicData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/admin/new-reply', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			var replyData = {
				author: req.body.author,
				content: req.body.body,
				date: req.body.date,
				parent: req.body.parent
			};

			crp.forums.addReply(replyData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.app.post('/api/admin/edit-reply', (req, res) => {
		crp.forums.getReplyData(req.body.reply_id, (err, reply) => {
			if (err) return res.send(err);
			if (!reply) return res.send('noReply');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || user.role < 3) return res.send('notAllowed');

				var replyData = {
					author: crp.db.objectID(req.body.reply_author),
					content: req.body.reply_body
				};

				crp.forums.setReplyData(reply._id, replyData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	callback()
};
