module.exports = (crp, callback) => {
	crp.express.app.post('/api/add-chapter', (req, res) => {
		crp.express.recaptcha.validate(req.body['g-recaptcha-response']).then(() => {
			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);

				if (user.role != 'chapter_leader' || user.role != 'administrator') {
					var chapterData = {
						type: req.body.type,
						cms: req.body.cms,
						name: req.body.name,
						slug: req.body.slug,
						game: crp.db.objectID(req.body.game),
						desc: req.body.desc,
						discord: req.body.discord
					};

					crp.util.addChapter(chapterData, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				}
			});
		}).catch((err) => {
			res.send('noCaptcha');
		});
	});

	crp.express.app.post('/api/remove-chapter', (req, res) => {
		crp.util.getChapterData(req.body.chapterid, (err, chapter) => {
			if (err) return res.send(err);
			if (!chapter) return res.send('noChapter');

			crp.util.getUserData(req.user, (err, user) => {
				if (err) return res.send(err);

				if (crp.util.findObjectInArray(chapter.members, '_id', user._id.toString()) || user.role == 'administrator') {
					crp.util.removeChapter(chapter._id, (err, result) => {
						if (err) return res.send(err);

						res.send(result);
					});
				}
			});
		});
	});

	crp.util.getChapters({}, (err, chapters) => {
		for (var i in chapters) {
			crp.proxy.register(chapters[i].slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');
		}

		callback();
	});
};
