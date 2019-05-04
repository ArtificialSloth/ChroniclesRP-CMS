module.exports = (crp, callback) => {
	crp.app.post('/api/add-chapter', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				if (user.role < 2) return res.send('notAllowed');
				new crp.chapters(req.body).save((err, chapter) => {
					if (err) return res.send(err);

					if (chapter.type == 'group') {
						new crp.categories({name: chapter.name, chapter: chapter._id}).save((err, category) => {
							if (err) return res.send(err);

							new crp.forums({name: chapter.name, desc: chapter.tagline, category: category._id}).save((err, forum) => {
								if (err) return res.send(err);

								res.send(chapter);
							});
						});
					} else {
						res.send(chapter);
					}
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

			crp.chapters.findById(req.body.chapterid, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');
				req.body.img = chapter.img;

				crp.users.findById(req.user, (err, user) => {
					if (err) return res.send(err);
					if (!user) return res.send('noUser');

					var member = chapter.getMember(user._id);
					if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');
					crp.async.parallel([
						(callback) => {
							if (!req.files.profile_pic) return callback();

							crp.storage.delete(chapter.img.profile, (err) => {
								if (err) return callback(err);

								crp.storage.upload(req.files.profile_pic[0].path, `img/chapters/${chapter._id}/${req.files.profile_pic[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(req.files.profile_pic[0].path, (err) => {
										if (err) return callback(err);

										req.body.img.profile = file.name;
										callback();
									});
								});
							});
						},
						(callback) => {
							if (!req.files.cover_pic) return callback();

							crp.storage.delete(chapter.img.cover, (err) => {
								if (err) return callback(err);

								crp.storage.upload(req.files.cover_pic[0].path, `img/chapters/${chapter._id}/${req.files.cover_pic[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(req.files.cover_pic[0].path, (err) => {
										if (err) return callback(err);

										req.body.img.cover = file.name;
										callback();
									});
								});
							});
						}
					], (err) => {
						if (err) return res.send(err);

						crp.chapters.updateOne({_id: chapter._id}, req.body, {runValidators: true}, (err) => {
							if (err) return res.send(err);

							res.send(true);
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/remove-chapter', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');

				if (chapter.type == 'group') {
					crp.categories.findOne({chapter: chapter._id}, (err, category) => {
						if (err) return res.send(err);
						if (!category) return res.send('noCategories');

						crp.categories.deleteOne({_id: category._id}, (err) => {
							if (err) return res.send(err);

							crp.chapters.deleteOne({_id: chapter._id}, (err) => {
								if (err) return res.send(err);

								res.send(true);
							});
						});
					});
				} else {
					crp.chapters.deleteOne({_id: chapter._id}, (err) => {
						if (err) return res.send(err);

						res.send(true);
					});
				}
			});
		});
	});

	crp.app.post('/api/join-chapter', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');
			if (!chapter.open) return res.send('closed');

			chapter.addMember({_id: req.user, role: 1}, (err, chapter) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/leave-chapter', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			chapter.removeMember(req.user, (err, chapter) => {
				if (err) return res.send(err);

				res.send(true);
			});
		});
	});

	crp.app.post('/api/accept-chapter-invite', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if (!member || member.role != 0) return res.send('notAllowed');
				chapter.setMemberRole(req.user, 1, (err, chapter) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/promote-chapter-member', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				chapter.setMemberRole(req.body.userid, 2, (err, chapter) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/demote-chapter-member', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				chapter.setMemberRole(req.body.userid, 1, (err, chapter) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/invite-chapter-member', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				chapter.addMember({_id: req.body.userid}, (err, chapter) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});;
	});

	crp.app.post('/api/remove-chapter-member', (req, res) => {
		crp.chapters.findById(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.users.findById(req.user, (err, user) => {
				if (err) return res.send(err);
				if (!user) return res.send('noUser');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				chapter.removeMember(req.body.userid, (err, chapter) => {
					if (err) return res.send(err);

					res.send(true);
				});
			});
		});;
	});

	callback();
};
