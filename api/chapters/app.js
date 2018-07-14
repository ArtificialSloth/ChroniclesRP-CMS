module.exports = (crp, callback) => {
	crp.express.app.post('/api/add-chapter', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (user.role < 2) return res.send('notAllowed');
				crp.util.addChapter(req.body, user._id, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
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

		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
				crp.util.setChapterData(req.body.chapterid, req.body, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/remove-chapter', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
				crp.util.removeChapter(req.body.chapterid, req.user, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/join-chapter', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');
			if (!chapter.open) return res.send('closed');

			crp.util.addChapterMember(req.body.chapterid, {_id: req.user, role: 1}, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.express.app.post('/api/leave-chapter', (req, res) => {
		crp.util.removeChapterMember(req.body.chapterid, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.express.app.post('/api/accept-chapter-invite', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if (!member || member.role != 0) return cb('notAllowed');
				crp.util.setChapterMemberRole(req.body.chapterid, {userid: req.user, role: 1}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/promote-chapter-member', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.setChapterMemberRole(req.body.chapterid, {userid: req.body.userid, role: 2}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/demote-chapter-member', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.setChapterMemberRole(req.body.chapterid, {userid: req.body.userid, role: 1}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.express.app.post('/api/invite-chapter-member', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.addChapterMember(req.body.chapterid, {_id: req.body.userid}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});;
	});

	crp.express.app.post('/api/remove-chapter-member', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.removeChapterMember(req.body.chapterid, req.body.userid, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});;
	});

	crp.util.getChapters({}, (err, chapters) => {
		for (var i in chapters) {
			crp.proxy.register(chapters[i].slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');
		}

		callback();
	});
};
