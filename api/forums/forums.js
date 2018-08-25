module.exports = (crp) => {
	crp.forums = {};

	crp.forums.getCategories = (filter, cb) => {
		crp.db.find('categories', filter, {}, cb);
	};

	crp.forums.getCategoryData = (categoryid, cb) => {
		if (typeof categoryid != 'object') categoryid = crp.db.objectID(categoryid);
		crp.db.findOne('categories', {_id: categoryid}, cb);
	};

	crp.forums.getForums = (filter, cb) => {
		crp.db.find('forums', filter, {}, cb);
	};

	crp.forums.getForumData = (forumid, cb) => {
		if (typeof forumid != 'object') forumid = crp.db.objectID(forumid);
		crp.db.findOne('forums', {_id: forumid}, cb);
	};

	crp.forums.getTopics = (filter, cb) => {
		crp.db.find('topics', filter, {}, cb);
	};

	crp.forums.getTopicData = (topicid, cb) => {
		if (typeof topicid != 'object') topicid = crp.db.objectID(topicid);
		crp.db.findOne('topics', {_id: topicid}, cb);
	};

	crp.forums.getReplies = (filter, cb) => {
		crp.db.find('replies', filter, {}, cb);
	};

	crp.forums.getReplyData = (replyid, cb) => {
		if (typeof replyid != 'object') replyid = crp.db.objectID(replyid);
		crp.db.findOne('replies', {_id: replyid}, cb);
	};

	crp.forums.addCategory = (data, cb) => {
		crp.forums.getCategories({}, (err, categories) => {
			if (err) return cb(err);

			crp.chapters.get(data.chapter, (err, chapter) => {
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

	crp.forums.removeCategory = (categoryid, cb) => {
		crp.forums.getCategoryData(categoryid, (err, category) => {
			if (err) return cb(err);

			crp.forums.getForums({category: category._id}, (err, forums) => {
				if (err) return cb(err);

				crp.async.each(forums, (forum, callback) => {
					if (!forum) return callback();

					crp.forums.removeForum(forum._id, callback);
				}, (err) => {
					if (err) return cb(err);

					crp.db.deleteOne('categories', {_id: category._id}, cb);
				});
			});
		});
	};

	crp.forums.setForumData = (forumid, data, cb) => {
		crp.forums.getForumData(forumid, (err, forum) => {
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

			crp.forums.getForums({slug: newForum.slug}, (err, forums) => {
				if (err) return cb(err);
				if (forums && newForum.slug != forum.slug) return cb('slugTaken');

				crp.forums.getCategoryData(newForum.category, (err, category) => {
					if (err) return cb(err);
					if (!category) return cb('noCategory');

					newForum = crp.util.sanitizeObject(newForum);
					crp.db.replaceOne('forums', newForum, (err, result) => {
						if (err) return cb(err);

						crp.pages.setPageData({slug: `/forums/${forum.slug}`}, {
							slug: '/forums/' + newForum.slug,
							path: '/forums/forum/index.njk',
							context: {forumid: newForum._id}
						}, (err, result) => {
							if (err) return cb(err);

							cb(null, newForum);
						});
					});
				});
			});
		});
	};

	crp.forums.addForum = (data, cb) => {
		crp.forums.getForums({}, (err, forums) => {
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

			crp.forums.getCategoryData(forum.category, (err, category) => {
				if (err) return cb(err);
				if (!category) return cb('noCategory');

				forum = crp.util.sanitizeObject(forum);
				crp.db.insertOne('forums', forum, (err, result) => {
					if (err) return cb(err);

					crp.pages.addPage({
						slug: '/forums/' + forum.slug,
						path: '/forums/forum/index.njk',
						context: {forumid: result.insertedId}
					}, (err, page) => {
						if (err) return cb(err);

						cb(null, result);
					});
				});
			});
		});
	};

	crp.forums.removeForum = (forumid, cb) => {
		crp.forums.getForumData(forumid, (err, forum) => {
			if (err) return cb(err);
			if (!forum) return cb('noForum');

			crp.forums.getTopics({parent: forum._id}, (err, topics) => {
				if (err) return cb(err);

				crp.async.each(topics, (topic, callback) => {
					if (!topic) return callback();

					crp.forums.removeTopic(topic._id, callback);
				}, (err) => {
					if (err) return cb(err);

					crp.db.deleteOne('forums', {_id: forum._id}, (err, result) => {
						if (err) return cb(err);

						crp.pages.removePage({context: {forumid: forum._id}}, (err, result) => {
							if (err) return cb(err);

							cb(null, result);
						});
					});
				});
			});
		});
	};

	crp.forums.setTopicData = (topicid, data, cb) => {
		crp.forums.getTopicData(topicid, (err, topic) => {
			if (err) return cb(err);
			if (!topic) return cb('noTopic');

			var newTopic = {
				_id: topic._id,
				author: data.author || topic.author,
				title: data.title || topic.title,
				type: topic.type,
				content: data.content || topic.content,
				date: topic.date,
				parent: data.parent || topic.parent
			};

			if (newTopic.title.length < 4 || newTopic.title.length > 80) return cb('titleLength');
			if (newTopic.content.length < 4) return cb('bodyLength');

			newTopic = crp.util.sanitizeObject(newTopic);
			crp.db.replaceOne('topics', {_id: topic._id}, newTopic, (err, result) => {
				cb(err, newTopic);
			});
		});
	};

	crp.forums.addTopic = (data, cb) => {
		var topic = {
			author: data.author,
			title: data.title,
			type: data.type || 'normal',
			content: data.content,
			date: (data.date) ? Date.parse(data.date.replace('at ', '')) : Date.now(),
			parent: data.parent
		};

		crp.members.get(topic.author, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');

			topic.author = user._id;

			if (!topic.title || topic.title.length < 4) return cb('titleShort');
			if (topic.title.length > 80) return cb('titleLong');
			if (!topic.content || topic.content.length < 4) return cb('bodyLength');

			crp.forums.getForumData(topic.parent, (err, forum) => {
				if (err) return cb(err);
				if (!forum) return cb('noForum');

				topic.parent = forum._id;

				topic = crp.util.sanitizeObject(topic);
				crp.db.insertOne('topics', topic, (err, result) => {
					if (err) return cb(err);

					crp.pages.addPage({
						slug: `/forums/${forum.slug}/${result.insertedId}`,
						path: '/forums/topic/index.njk',
						context: {topicid: result.insertedId}
					}, (err, page) => {
						if (err) return cb(err);

						cb(null, topic);
					});
				});
			});
		});
	};

	crp.forums.removeTopic = (topicid, cb) => {
		crp.forums.getTopicData(topicid, (err, topic) => {
			if (err) return cb(err);
			if (!topic) return cb(null, 'noTopic');

			crp.db.deleteMany('replies', {parent: topic._id}, (err, result) => {
				if (err) return cb(err);

				crp.db.deleteOne('topics', {_id: topic._id}, (err, result) => {
					if (err) return cb(err);

					crp.pages.removePage({context: {topicid: topic._id}}, (err, result) => {
						if (err) return cb(err);

						cb(null, result);
					});
				});
			});
		});
	};

	crp.forums.setReplyData = (replyid, data, cb) => {
		crp.forums.getReplyData(replyid, (err, reply) => {
			if (err) return cb(err);
			if (!reply) return cb('noReply');

			var newReply = {
				_id: reply._id,
				author: data.author || reply.author,
				content: data.content || reply.content,
				date: reply.date,
				parent: reply.parent
			};

			if (data.content.length < 4) return cb('bodyLength');

			newReply = crp.util.sanitizeObject(newReply);
			crp.db.replaceOne('replies', {_id: reply._id}, newReply, (err, result) => {
				cb(err, newReply);
			});
		});
	};

	crp.forums.addReply = (data, cb) => {
		var reply = {
			author: data.author,
			content: data.content,
			date: (data.date) ? Date.parse(data.date.replace('at ', '')) : Date.now(),
			parent: data.parent
		};

		crp.members.get(reply.author, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');;

			reply.author = user._id;

			if (!reply.content || reply.content.length < 4) return cb('bodyLength');

			crp.forums.getTopicData(reply.parent, (err, topic) => {
				if (err) return cb(err);
				if (!topic) return cb('noTopic');

				reply.parent = topic._id;

				reply = crp.util.sanitizeObject(reply);
				crp.db.insertOne('replies', reply, (err, result) => {
					cb(err, reply)
				});
			});
		});
	};

	crp.forums.removeReply = (replyid, cb) => {
		crp.forums.getReplyData(replyid, (err, reply) => {
			if (err) return cb(err);
			if (!reply) return cb(null, 'noReply');

			crp.db.deleteOne('replies', {_id: reply._id}, cb);
		});
	};
};
