module.exports = (crp, callback) => {
	crp.util.getPosts = (filter, cb) => {
		crp.db.collection(crp.db.PREFIX + 'posts').find(filter).toArray(cb);
	};

	crp.util.getPostData = (postid, cb) => {
		if (typeof postid != 'object') postid = crp.db.objectID(postid);
		crp.db.collection(crp.db.PREFIX + 'posts').findOne({_id: postid}, cb);
	};

	crp.util.setPostData = (postid, data, cb) => {
		crp.util.getPostData(postid, (err, post) => {
			if (err) return cb(err);
			if (!post) return cb('noPost');

			var newPost = post;

			newPost.author = data.author || post.author;
			newPost.title = data.title || post.title;
			newPost.slug = data.slug || post.slug;
			newPost.img = data.img || '';
			newPost.content = data.content || post.content;

			postid = crp.db.sanitize(postid);
			newPost = crp.util.sanitizeObject(newPost);

			crp.db.collection(crp.db.PREFIX + 'posts').replaceOne({_id: post._id}, newPost, (err, result) => {
				if (err) return cb(err);

				cb(null, newPost);
			});
		});
	};

	crp.util.addPost = (data, cb) => {
		var post = {
			author: data.author,
			title: data.title,
			slug: data.slug || 'posts/' + data.title.replace(' ', '-').toLowerCase(),
			img: data.img || '',
			content: data.content,
			date: data.date || Date.now()
		};

		if (!post.author || !post.title || !post.content) return;

		post = crp.util.sanitizeObject(post);

		crp.db.collection(crp.db.PREFIX + 'posts').insertOne(post, (err, result) => {
			if (err) return cb(err);

			cb(null, post);
		});
	};

	crp.util.removePost = (postid, cb) => {
		crp.util.getPostData(postid, (err, post) => {
			if (err) return cb(err);

			crp.db.collection(crp.db.PREFIX + 'posts').deleteOne({_id: post._id}, cb);
		});
	};

	callback();
};
