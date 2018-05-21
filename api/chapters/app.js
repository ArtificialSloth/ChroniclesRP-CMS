module.exports = (crp, callback) => {
	crp.express.app.post('/api/add-chapter', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			crp.util.addChapter(req.body, req.user, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	var editChapter = crp.express.upload.fields([
		{name: 'profile_pic', maxCount: 1},
		{name: 'cover_pic', maxCount: 1}
	]);
	crp.express.app.post('/api/edit-chapter', editChapter, (req, res) => {
		if (req.files) {
			req.body.img = {};
			if (req.files.profile_pic) req.body.img.profile = req.files.profile_pic;
			if (req.files.cover_pic) req.body.img.cover = req.files.cover_pic;
		}

		crp.util.setChapterData(req.body.chapterid, req.body, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/remove-chapter', (req, res) => {
		crp.util.removeChapter(req.body.chapterid, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/join-chapter', (req, res) => {
		crp.util.joinChapter(req.body.chapterid, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/leave-chapter', (req, res) => {
		crp.util.leaveChapter(req.body.chapterid, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.util.getChapters({}, (err, chapters) => {
		for (var i in chapters) {
			crp.proxy.register(chapters[i].slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');
		}

		callback();
	});
};
