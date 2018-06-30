module.exports = (crp, callback) => {
	crp.util.getCategories = (filter, cb) => {
		crp.db.find('categories', filter, {}, cb);
	};

	crp.util.getCategoryData = (categoryid, cb) => {
		if (typeof categoryid != 'object') categoryid = crp.db.objectID(categoryid);
		crp.db.findOne('categories', {_id: categoryid}, cb);
	};

	crp.util.getForums = (filter, cb) => {
		crp.db.find('forums', filter, {}, cb);
	};

	crp.util.getForumData = (forumid, cb) => {
		if (typeof forumid != 'object') forumid = crp.db.objectID(forumid);
		crp.db.findOne('forums', {_id: forumid}, cb);
	};

	crp.util.getTopics = (filter, cb) => {
		crp.db.find('topics', filter, {}, cb);
	};

	crp.util.getTopicData = (topicid, cb) => {
		if (typeof topicid != 'object') topicid = crp.db.objectID(topicid);
		crp.db.findOne('topics', {_id: topicid}, cb);
	};

	crp.util.getReplies = (filter, cb) => {
		crp.db.find('replies', filter, {}, cb);
	};

	crp.util.getReplyData = (replyid, cb) => {
		if (typeof replyid != 'object') replyid = crp.db.objectID(replyid);
		crp.db.findOne('replies', {_id: replyid}, cb);
	};

	crp.util.addCategory = (data, cb) => {
		crp.util.getCategories({}, (err, categories) => {
			if (err) return cb(err);

			crp.util.getChapterData(data.chapter, (err, chapter) => {
				if (err) return cb(err);

				var category = {
					name: data.name,
					chapter: crp.db.objectID(data.chapter) || null,
					role: data.role || null,
					order: data.order
				};

				if (!category.name) return cb('noName');
				if (category.name.length > 80) return cb('nameLength');
				if (category.chapter && !chapter) return cb('noChapter');

				var sorted = crp.util.sortObjectArray(categories, 'order');
				if (!category.order) category.order = sorted[sorted.length - 1].order + 1;

				crp.db.insertOne('categories', category, cb);
			});
		});
	};

	crp.util.removeCategory = (categoryid, cb) => {
		crp.util.getCategoryData(categoryid, (err, category) => {
			if (err) return cb(err);

			crp.util.getForums({category: category._id}, (err, forums) => {
				if (err) return cb(err);

				crp.async.each(forums, (forum, callback) => {
					if (!forum) return callback();

					crp.util.removeForum(forum._id, callback);
				}, (err) => {
					if (err) return cb(err);

					crp.db.deleteOne('categories', {_id: category._id}, cb);
				});
			});
		});
	};

	crp.util.setForumData = (forumid, data, cb) => {
		crp.util.getForumData(forumid, (err, forum) => {
			if (err) return cb(err);
			if (!forum) return cb('noForum');

			var newForum = {
				_id: forum._id,
				name: data.name || forum.name,
				slug: crp.util.urlSafe(data.name) || forum.slug,
				desc: (data.desc != forum.desc) ? data.desc : forum.desc,
				category: crp.db.objectID(data.category) || forum.chapter,
				order: data.order || forum.order
			};

			if (forum.name.length < 4 || forum.name.length > 80) return cb('nameLength');
			if (forum.desc.length > 140) return cb('descLength');

			crp.util.getForums({slug: newForum.slug}, (err, forums) => {
				if (err) return cb(err);
				if (forums && newForum.slug != forum.slug) return cb('slugTaken');

				crp.util.getCategoryData(newForum.category, (err, category) => {
					if (err) return cb(err);
					if (!category) return cb('noCategory');

					newForum = crp.util.sanitizeObject(newForum);
					crp.db.replaceOne('forums', newForum, (err, result) => {
						if (err) return cb(err);

						var index = crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'slug', '/forums/' + forum.slug));
						if (index > -1) crp.pages.splice(index, 1);

						crp.pages.push({
							slug: '/forums/' + newForum.slug,
							path: '/forums/forum/index.njk',
							context: {forumid: newForum._id}
						});

						cb(null, newForum);
					});
				});
			});
		});
	};

	crp.util.addForum = (data, cb) => {
		crp.util.getForums({}, (err, forums) => {
			if (err) return cb(err);

			var forum = {
				name: data.name,
				slug: crp.util.urlSafe(data.name),
				desc: data.desc || '',
				category: crp.db.objectID(data.category),
				order: data.order || 0
			};

			if (forum.name.length < 4 || forum.name.length > 80) return cb('nameLength');
			if (crp.util.findObjectInArray(forums, 'slug', forum.slug)) return cb('slugTaken');
			if (forum.desc.length > 140) return cb('descLength');

			crp.util.getCategoryData(forum.category, (err, category) => {
				if (err) return cb(err);
				if (!category) return cb('noCategory');

				forum = crp.util.sanitizeObject(forum);
				crp.db.insertOne('forums', forum, (err, result) => {
					if (err) return cb(err);

					crp.pages.push({
						slug: '/forums/' + forum.slug,
						path: '/forums/forum/index.njk',
						context: {forumid: result.insertedId}
					});

					cb(null, result);
				});
			});
		});
	};

	crp.util.removeForum = (forumid, cb) => {
		crp.util.getForumData(forumid, (err, forum) => {
			if (err) return cb(err);
			if (!forum) return cb('noForum');

			crp.util.getTopics({parent: forum._id}, (err, topics) => {
				if (err) return cb(err);

				crp.async.each(topics, (topic, callback) => {
					if (!topic) return callback();

					crp.util.removeTopic(topic._id, callback);
				}, (err) => {
					if (err) return cb(err);

					crp.db.deleteOne('forums', {_id: forum._id}, (err, result) => {
						if (err) return cb(err);

						crp.pages.splice(crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'context', {forumid: forum._id})), 1);
						cb(null, result);
					});
				});
			});
		});
	};

	crp.util.setTopicData = (topicid, data, cb) => {
		crp.util.getTopicData(topicid, (err, topic) => {
			if (err) return cb(err);
			if (!topic) return cb('noTopic');

			var newTopic = {
				_id: topic._id,
				author: data.author || topic.author,
				title: data.title || topic.title,
				type: topic.type,
				content: data.content || topic.content,
				date: topic.date,
				parent: data.parent || topic.parent,
				likes: (typeof data.likes == 'number') ? data.likes : topic.likes,
				dislikes: (typeof data.dislikes == 'number') ? data.dislikes : topic.dislikes
			};

			if (newTopic.title.length < 4 || newTopic.title.length > 80) return cb('titleLength');
			if (newTopic.content.length < 4) return cb('bodyLength');

			newTopic = crp.util.sanitizeObject(newTopic);
			crp.db.replaceOne('topics', {_id: topic._id}, newTopic, (err, result) => {
				cb(err, newTopic);
			});
		});
	};

	crp.util.addTopic = (data, admin, cb) => {
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
			if (!user || user.role <= 0) return cb('generic');

			if (!topic.title || topic.title.length < 4) return cb('titleShort');
			if (topic.title.length > 80) return cb(null, 'titleLong');
			if (!topic.content || topic.content.length < 4) return cb('bodyLength');

			crp.util.getForumData(topic.parent, (err, forum) => {
				if (err) return cb(err);
				if (!forum) return cb('generic');

				crp.util.getCategoryData(forum.category, (err, category) => {
					if (err) return cb(err);
					if (!category) return cb('generic');
					if (category.role && !admin && user.role < category.role) return cb('notAllowed');

					crp.util.getChapterData(category.chapter, (err, chapter) => {
						if (err) return cb(err);
						if (chapter && !admin && !crp.util.getChapterMember(chapter, user._id) && user.role < 3) return cb('notAllowed');

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

			var newReply = {
				_id: reply._id,
				author: data.author || reply.author,
				content: data.content || reply.content,
				date: reply.date,
				parent: reply.parent,
				likes: (typeof data.likes == 'number') ? data.likes : reply.likes,
				dislikes: (typeof data.dislikes == 'number') ? data.dislikes : reply.dislikes
			};

			if (data.content.length < 4) return cb('bodyLength');

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
			parent: crp.db.objectID(data.parent),
			likes: data.likes || 0,
			dislikes: data.dislikes || 0
		};

		crp.util.getUserData(reply.author, (err, user) => {
			if (err) return cb(err);
			if (!user || user.role <= 0) return cb('generic');;

			if (!reply.content || reply.content.length < 4) return cb('bodyLength');

			crp.util.getTopicData(reply.parent, (err, topic) => {
				if (err) return cb(err);
				if (!topic) return cb('generic');

				crp.util.getForumData(topic.parent, (err, forum) => {
					if (err) return cb(err);
					if (!forum) return cb('generic');

					crp.util.getCategoryData(forum.category, (err, category) => {
						if (err) return cb(err);
						if (!category) return cb('generic');
						if (category.role && user.role < category.role) return cb('notAllowed');

						crp.util.getChapterData(category.chapter, (err, chapter) => {
							if (err) return cb(err);
							if (chapter && !crp.util.getChapterMember(chapter, user._id) && user.role < 3) return cb('notAllowed');

							reply = crp.util.sanitizeObject(reply);
							crp.db.insertOne('replies', reply, (err, result) => {
								cb(err, reply)
							});
						});
					});
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
