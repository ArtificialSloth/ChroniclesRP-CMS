module.exports = (crp, callback) => {
	crp.app.post('/api/admin/add-post', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			new crp.posts(req.body).save((err) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/admin/edit-post', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			crp.posts.updateOne({_id: req.body.postid}, req.body, {runValidators: true}, (err) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/admin/remove-post', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user || user.role < 3) return res.send('notAllowed');

			crp.posts.deleteOne({_id: req.body.postid}, (err) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/admin/image-upload', (req, res) => {
		var upload = crp.express.upload.single('img');
		upload(req, res, (err) => {
			if (err) return res.send(err);

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user || user.role < 3) return res.send('notAllowed');

				crp.storage.upload(req.file.path, `img/posts/${req.file.originalname}`, (err, file) => {
					if (err) res.send(err);

					crp.fs.unlink(req.file.path, (err) => {
						if (err) res.send(err);

						res.send(crp.storage.getUrl(file));
					});
				});
			});
		});
	});

	callback();
};
