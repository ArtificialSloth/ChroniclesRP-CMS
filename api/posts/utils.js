module.exports = (crp) => {
	crp.util.getPosts = (args) => {
		if (!args) args = {};
		args = {
			filter: args.filter,
			sortBy: args.sortBy || 'date',
			sortOrder: args.sortOrder
		};
		
		var posts = crp.global.posts;
		if (args.filter) {
			posts = crp.util.filterObject(posts, args.filter[0], args.filter[1].toString());
		}
		
		if (args.sortBy) {
			posts = posts.sort((a, b) => {
				return a[args.sortBy] > b[args.sortBy];
			});
		}
		
		if (args.sortOrder == 'ASC') posts.reverse();
		
		return posts;
	};
	
	crp.util.getPostData = (postid) => {
		if (!postid) return;
		return crp.util.getPosts({filter: ['_id', postid]})[0];
	};
	
	crp.util.setPostData = (postid, data) => {
		var post = crp.util.getPostData(postid);
		
		if (post) {
			var newPost = post;
			
			newPost.author = data.post_author || post.author;
			newPost.title = data.post_title || post.title;
			newPost.slug = data.post_slug || post.slug;
			newPost.img = data.post_img || '';
			newPost.content = data.post_content || post.content;
			
			postid = crp.db.sanitize(postid);
			newPost = crp.util.sanitizeObject(newPost);
			
			crp.db.collection(crp.db.PREFIX + 'posts').replaceOne({_id: crp.db.objectID(postid)}, newPost);
			
			return crp.global.posts[crp.global.posts.indexOf(post)] = newPost;
		}
	};
	
	crp.util.addPost = (data) => {
		var post = {
			author: data.author,
			title: data.title,
			slug: data.slug || 'posts/' + data.title.replace(' ', '-').toLowerCase(),
			img: data.img || '',
			content: data.content,
			date: data.date || Date.now()
		};
		console.log(post.content)
		if (!post.author || !post.title || !post.content) return;
		
		post = crp.util.sanitizeObject(post);
		
		crp.db.collection(crp.db.PREFIX + 'posts').insertOne(post);
		crp.global.posts.push(post);
		
		return post;
	};
	
	crp.util.removePost = (postid) => {
		var post = crp.util.getPostData(postid);
		
		if (post) {
			postid = crp.db.sanitize(postid);
			
			crp.db.collection(crp.db.PREFIX + 'posts').deleteOne({_id: post._id});
			crp.global.posts.splice(crp.global.posts.indexOf(post), 1);
			
			return true;
		}
	};
};