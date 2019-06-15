module.exports = (crp) => {
	crp.posts = crp.db.model('post', new crp.db.Schema({
		author: crp.db.Schema.Types.ObjectId,
		title: {
			type: String,
			required: true,
			minlength: 4,
			maxlength: 80,
		},
		type: {
			type: String,
			default: 'page'
		},
		slug: {
			type: String,
			default: function() {
				return `/posts/${crp.util.urlSafe(this.title)}`;
			},
			validate: {
				msg: 'URL {VALUE} is already in use.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						if (this.constructor.name === 'Query') {
							crp.posts.find({_id: {$not: {$eq: this._conditions._id}}, slug: val}, (err, posts) => {
								if (err) return reject(err);
								if (posts && posts.length > 0) return resolve(false);
								resolve(true);
							});
						} else {
							crp.posts.find({slug: val}, (err, posts) => {
								if (err) return reject(err);
								if (posts && posts.length > 0) return resolve(false);
								resolve(true);
							});
						}
					});
				}
			}
		},
		img: String,
		content: {
			type: String,
			required: true,
			minlength: 4
		},
		date: {
			type: Date,
			default: Date.now()
		}
	}));

	crp.pages.add((slug, cb) => {
		if (slug == '/admin/posts') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/posts/admin/index.njk',
			context: {filter: {}},
			role: 3
		});

		var types = ['page', 'news', 'featured_content'];
		for (var i in types) {
			if (slug == `/admin/posts/${types[i]}`) return cb(null, {
				path: '/admin/index.njk',
				subPage: '/posts/admin/index.njk',
				context: {filter: {type: types[i]}},
				role: 3
			});
		}

		crp.posts.find({}, (err, posts) => {
			if (err) return cb(err);

			for (var i in posts) {
				if (slug == posts[i].slug) return cb(null, {
					path: '/posts/index.njk',
					context: {postid: posts[i]._id}
				});
			}

			cb();
		});
	});
};
