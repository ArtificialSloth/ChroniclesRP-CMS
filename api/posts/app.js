module.exports = (crp, callback) => {
	crp.express.app.post('/api/admin/add-post', (req, res) => {
		if (crp.util.isUserAdmin(req.user)) {
			var postData = {
				author: req.user,
				title: req.body.post_title,
				slug: req.body.post_slug,
				img: req.body.post_img,
				content: req.body.post_content
			};
			res.send(crp.util.addPost(postData));
		}
	});

	crp.express.app.post('/api/admin/edit-post', (req, res) => {
		if (crp.util.isUserAdmin(req.user)) {
			var newPost = crp.util.setPostData(req.body.post_id, req.body);
			res.send(newPost);
		}
	});

	crp.express.app.post('/api/admin/remove-post', (req, res) => {
		if (crp.util.isUserAdmin(req.user)) {
			res.send(crp.util.removePost(req.body.postid));
		}
	});

	callback();
};
