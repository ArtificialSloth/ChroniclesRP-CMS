module.exports = (crp, callback) => {
	crp.util.getPosts = (filter, cb) => {
		crp.db.find('posts', filter, {}, cb);
	};

	crp.util.getPostData = (postid, cb) => {
		if (typeof postid != 'object') postid = crp.db.objectID(postid);
		crp.db.findOne('posts', {_id: postid}, cb);
	};

	crp.util.setPostData = (postid, data, cb) => {
		crp.util.getPostData(postid, (err, post) => {
			if (err) return cb(err);
			if (!post) return cb('noPost');

			var newPost = {
				_id: post._id,
				author: data.author || post.author,
				title: data.title || post.title,
				type: data.type || post.type,
				slug: data.slug || post.slug,
				img: data.img || '',
				content: data.content || post.content
			};

			postid = crp.db.sanitize(postid);
			newPost = crp.util.sanitizeObject(newPost);

			crp.db.replaceOne('posts', {_id: post._id}, newPost, (err, result) => {
				cb(err, newPost);
			});
		});
	};

	crp.util.addPost = (data, cb) => {
		var post = {
			author: data.author,
			title: data.title,
			type: data.type || 'page',
			slug: data.slug || '/posts/' + data.title.replace(' ', '-').toLowerCase(),
			img: data.img || '',
			content: data.content,
			date: data.date || Date.now()
		};

		if (!post.author || !post.title || !post.content) return cb('missingInfo');

		post = crp.util.sanitizeObject(post);

		crp.db.insertOne('posts', post, (err, result) => {
			cb(err, post);
		});
	};

	crp.util.removePost = (postid, cb) => {
		crp.util.getPostData(postid, (err, post) => {
			if (err) return cb(err);

			crp.db.deleteOne('posts', {_id: post._id}, cb);
		});
	};

	callback();
};
