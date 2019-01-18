module.exports = (crp, callback) => {
	crp.app.post('/api/add-chapter', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (user.role < 2) return res.send('notAllowed');
				crp.chapters.add(req.body, user._id, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	crp.app.post('/api/edit-chapter', (req, res) => {
		var upload = crp.express.upload.fields([
			{name: 'profile_pic', maxCount: 1},
			{name: 'cover_pic', maxCount: 1}
		]);
		upload(req, res, (err) => {
			if (err) return res.send(err);
			if (req.files) {
				req.body.img = {};
				if (req.files.profile_pic) req.body.img.profile = req.files.profile_pic;
				if (req.files.cover_pic) req.body.img.cover = req.files.cover_pic;
			}

			crp.chapters.get(req.body.chapterid, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');

				crp.members.get(req.user, (err, user) => {
					if (err) return res.send(err);
					if (!user) return res.send('noUser');

					var member = crp.chapters.getMember(chapter, user._id);
					if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
					crp.chapters.set(req.body.chapterid, req.body, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				});
			});
		});
	});

	crp.app.post('/api/remove-chapter', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
				crp.chapters.remove(req.body.chapterid, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/join-chapter', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');
			if (!chapter.open) return res.send('closed');

			crp.chapters.addMember(req.body.chapterid, {_id: req.user, role: 1}, (err, result) => {
				if (err) return res.send(err);

				res.send(result);
			});
		});
	});

	crp.app.post('/api/leave-chapter', (req, res) => {
		crp.chapters.removeMember(req.body.chapterid, req.user, (err, result) => {
			if (err) return res.send(err);

			res.send(result);
		});
	});

	crp.app.post('/api/accept-chapter-invite', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if (!member || member.role != 0) return res.send('notAllowed');
				crp.chapters.setMemberRole(req.body.chapterid, {userid: req.user, role: 1}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/promote-chapter-member', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.chapters.setMemberRole(req.body.chapterid, {userid: req.body.userid, role: 2}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/demote-chapter-member', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.chapters.setMemberRole(req.body.chapterid, {userid: req.body.userid, role: 1}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});
	});

	crp.app.post('/api/invite-chapter-member', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.chapters.addMember(req.body.chapterid, {_id: req.body.userid}, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});;
	});

	crp.app.post('/api/get-chapter-invites', (req, res) => {
		crp.chapters.find({}, (err, chapters) => {
			if (err) return res.send(err);

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				res.send(crp.chapters.getInvites(chapters, user._id));
			});
		});;
	});

	crp.app.post('/api/remove-chapter-member', (req, res) => {
		crp.chapters.get(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.members.get(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.chapters.removeMember(req.body.chapterid, req.body.userid, (err, result) => {
					if (err) return res.send(err);

					res.send(result);
				});
			});
		});;
	});

	callback();
};
