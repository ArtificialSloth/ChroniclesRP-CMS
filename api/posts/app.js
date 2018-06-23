module.exports = (crp, callback) => {
	crp.express.app.post('/api/admin/add-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (user.role < 3) return res.send('notAllowed');

			var postData = {
				author: user._id,
				title: req.body.title,
				type: req.body.type,
				slug: req.body.slug,
				img: req.body.img,
				content: req.body.content,
				date: req.body.date
			};

			crp.util.addPost(postData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.express.app.post('/api/admin/edit-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (user.role < 3) return res.send('notAllowed');

			var postData = {
				title: req.body.title,
				type: req.body.type,
				slug: req.body.slug,
				img: req.body.img,
				content: req.body.content,
				date: req.body.date
			};

			crp.util.setPostData(req.body.postid, postData, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.express.app.post('/api/admin/remove-post', (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (user.role < 3) return res.send('notAllowed');

			crp.util.removePost(req.body.postid, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	var imageUpload = crp.express.upload.fields([
		{name: 'img', maxCount: 1}
	]);
	crp.express.app.post('/api/admin/image-upload', imageUpload, (req, res) => {
		crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (user.role < 3) return res.send('notAllowed');

			var path = `/img/posts/${req.files.img[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
			crp.fs.rename(req.files.img[0].path, crp.PUBLICDIR + path, (err) => {
				if (err) return res.send(err);

				res.send(path);
			});
		});
	});

	callback();
};
