module.exports = (crp) => {
	var schema =
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
				msg: 'Slug cannot be taken.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						crp.posts.find({slug: val}, (err, posts) => {
							if (err) return reject(err);
							if (posts && posts.length > 0) return resolve(false);
							resolve(true)
						});
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

	new crp.posts({title: 'Test', content: 'test'}).save((err) => {
		if (err) console.error(err);
	});

	crp.pages.add((slug, cb) => {
		if (slug == '/admin/posts') return cb(null, {
			path: '/admin/index.njk',
			subPage: '/posts/admin/index.njk',
			role: 3
		});

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
