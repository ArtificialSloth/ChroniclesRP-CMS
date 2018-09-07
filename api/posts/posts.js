module.exports = (crp) => {
	crp.posts = {};

	crp.posts.find = (filter, cb) => {
		crp.db.find('posts', filter, {}, cb);
	};

	crp.posts.get = (postid, cb) => {
		if (typeof postid != 'object') postid = crp.db.objectID(postid);
		crp.db.findOne('posts', {_id: postid}, cb);
	};

	crp.posts.set = (postid, data, cb) => {
		crp.posts.get(postid, (err, post) => {
			if (err) return cb(err);
			if (!post) return cb('noPost');

			var newPost = {
				_id: post._id,
				author: data.author || post.author,
				title: data.title || post.title,
				type: data.type || post.type,
				slug: (data.slug.length > 0) ? data.slug : '/posts/' + crp.util.urlSafe(data.title),
				img: data.img || '',
				content: data.content || post.content,
				date: Date.parse(data.date) || post.date
			};

			postid = crp.db.sanitize(postid);
			newPost = crp.util.sanitizeObject(newPost);

			crp.db.replaceOne('posts', {_id: post._id}, newPost, (err, result) => {
				if (err) return cb(err);

				cb(null, newPost);
			});
		});
	};

	crp.posts.add = (data, cb) => {
		var post = {
			author: data.author,
			title: data.title,
			type: data.type || 'page',
			slug: (data.slug.length > 0) ? data.slug : '/posts/' + crp.util.urlSafe(data.title),
			img: data.img || '',
			content: data.content,
			date: Date.parse(data.date) || Date.now()
		};

		if (!post.author || !post.title || !post.content) return cb('missingInfo');

		post = crp.util.sanitizeObject(post);

		crp.db.insertOne('posts', post, (err, result) => {
			if (err) return cb(err);

			cb(null, post);
		});
	};

	crp.posts.remove = (postid, cb) => {
		crp.posts.get(postid, (err, post) => {
			if (err) return cb(err);

			crp.db.deleteOne('posts', {_id: post._id}, cb);
		});
	};

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
