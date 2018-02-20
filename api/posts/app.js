module.exports = (crp, callback) => {
	crp.express.app.post('/api/admin/add-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (user.role == 'administrator') {
				var postData = {
					author: user._id,
					title: req.body.post_title,
					slug: req.body.post_slug,
					img: req.body.post_img,
					content: req.body.post_content
				};

				crp.util.addPost(postData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			}
		});
	});

	crp.express.app.post('/api/admin/edit-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (user.role == 'administrator') {
				var postData = {
					title: req.body.post_title,
					slug: req.body.post_slug,
					img: req.body.post_img,
					content: req.body.post_content
				};

				crp.util.setPostData(req.body.postid, postData, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			}
		});
	});

	crp.express.app.post('/api/admin/remove-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (user.role == 'administrator') {
				crp.util.removePost(req.body.postid, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			}
		});
	});

	callback();
};
