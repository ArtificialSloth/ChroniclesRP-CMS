module.exports = (crp) => {
	var category = new crp.db.Schema({
		name: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80
		},
		chapter: crp.db.Schema.Types.ObjectId,
		role: Number,
		order: {
			type: Number,
			required: true
		}
	});

	var forum = new crp.db.Schema({
		name: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80
		},
		slug: {
			type: String,
			lowercase: true,
			default: function() {
				return crp.util.urlSafe(this.name);
			}
		},
		desc: {
			type: String,
			maxlength: 200
		},
		category: crp.db.Schema.Types.ObjectId,
		order: {
			type: Number,
			required: true
		}
	});

	var topic = new crp.db.Schema({
		parent: crp.db.Schema.Types.ObjectId,
		author: crp.db.Schema.Types.ObjectId,
		title: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80
		},
		type: {
			type: String,
			enum: ['normal', 'sticky'],
			default: 'normal'
		},
		content: {
			type: String,
			required: true,
			minlength: 4
		},
		date: {
			type: Date,
			default: Date.now()
		},
		subs: [crp.db.Schema.Types.ObjectId]
	});

	var reply = new crp.db.Schema({
		parent: crp.db.Schema.Types.ObjectId,
		author: crp.db.Schema.Types.ObjectId,
		content: {
			type: String,
			required: true,
			minlength: 4
		},
		date: {
			type: Date,
			default: Date.now()
		}
	});

	category.pre(/^delete/, function(next) {
		crp.forums.find({category: this.getQuery()._id}, (err, forums) => {
			if (err) return next(err);

			crp.async.each(forums, (forum, cb) => {
				crp.forums.deleteOne({_id: forum._id}, cb);
			}, next);
		});
	});

	forum.pre(/^delete/, function(next) {
		crp.topics.find({parent: this.getQuery()._id}, (err, topics) => {
			if (err) return next(err);

			crp.async.each(topics, (topic, cb) => {
				crp.topics.deleteOne({_id: topic._id}, cb);
			}, next);
		});
	});

	topic.pre(/^delete/, function(next) {
		crp.replies.find({parent: this.getQuery()._id}, (err, replies) => {
			if (err) return next(err);

			crp.async.each(replies, (reply, cb) => {
				crp.replies.deleteOne({_id: reply._id}, cb);
			}, next);
		});
	});

	category.pre('validate', function(next) {
		if (this.order != null) return next();

		crp.categories.find({}, {}, {sort: [[['order', 1]]]}, (err, categories) => {
			if (err) return next(err);

			this.order = categories[categories.length - 1].order + 1;
			next();
		});
	});

	forum.pre('validate', function(next) {
		if (this.order != null) return next();

		crp.forums.find({category: this.category}, {}, {sort: [[['order', 1]]]}, (err, forums) => {
			if (err) return next(err);

			this.order = forums[forums.length - 1] ? forums[forums.length - 1].order + 1 : 0;
			next();
		});
	});

	crp.categories = new crp.db.model('category', category);
	crp.forums = new crp.db.model('forum', forum);
	crp.topics = new crp.db.model('topic', topic);
	crp.replies = new crp.db.model('reply', reply);

	crp.topics.sortTopics = (filter, type, cb) => {
		crp.topics.find(filter, (err, topics) => {
			if (err) return cb(err);

			crp.replies.find({}, (err, replies) => {
				if (err) return cb(err);

				for (var i in topics) {
					topics[i].sortDate = topics[i].date;
					for (var j in replies) {
						if (replies[j].parent.equals(topics[i]._id) && replies[j].date > topics[i].sortDate) {
							topics[i].sortAuthor = replies[j].author;
							topics[i].sortDate = replies[j].date;
						}
					}
				}

				var result = crp.util.sortObjectArray(topics, 'sortDate', -1);
				if (type) {
					result.sort((a, b) => {
						if (a.type == 'sticky') return -1;
						if (b.type == 'sticky') return 1;
					});
				}

				return cb(null, result);
			});
		});
	};

	crp.nunjucks.addExtension('getTopics', new function() {
		this.tags = ['getTopics'];

		this.parse = (parser, nodes, lexer) => {
			var tok = parser.nextToken();

			var args = parser.parseSignature(null, true);
			parser.advanceAfterBlockEnd(tok.value);

			return new nodes.CallExtensionAsync(this, 'run', args);
		};

		this.run = (context, filter, type, key, cb) => {
			crp.topics.sortTopics(filter, type, (err, result) => {
				context.ctx[key] = result;
				cb(err);
			});
		};
	})

	crp.pages.add((slug, cb) => {
		if (slug == '/forums') return cb(null, {path: '/forums/index.njk'});
		if (slug == '/admin/forums') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/forums/admin/index.njk',
			role: 3
		});

		crp.forums.find({}, (err, forums) => {
			if (err) return cb(err);

			for (var i in forums) {
				if (slug == `/forums/${forums[i].slug}`) return cb(null, {
					path: '/forums/forum/index.njk',
					context: {forumid: forums[i]._id}
				});
			}

			crp.topics.find({}, (err, topics) => {
				if (err) return cb(err);

				for (var i in topics) {
					var parent = crp.util.findObjectInArray(forums, '_id', topics[i].parent);
					if (slug == `/forums/${parent.slug}/${topics[i]._id}`) return cb(null, {
						path: '/forums/topic/index.njk',
						context: {topicid: topics[i]._id}
					});
				}

				cb();
			});
		});
	});
};
