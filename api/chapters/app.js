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
		/*crp.util.getUserData(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('noUser');

			crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');

				if (chapter.members.indexOf({_id: user._id, role: 'leader'}) != -1  || user.role == 'administrator') {
					var chapterData = {
						name: req.body.name,
						game: crp.db.objectID(req.body.game),
						tagline: req.body.tagline,
						desc: req.body.desc,
						discord: req.body.discord,
						img: {}
					};

					if (req.files) {
						if (req.files.profile_pic) chapterData.img.profile = req.files.profile_pic;
						if (req.files.cover_pic) chapterData.img.cover = req.files.cover_pic;
					}

					crp.util.setChapterData(chapter, chapterData, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				}
			});
		});*/
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
