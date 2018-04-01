module.exports = (crp, callback) => {
	crp.util.getChapters = (filter, cb) => {
		crp.db.find('chapters', filter, {}, cb);
	};

	crp.util.addChapter = (data, cb) => {
		crp.util.getChapters({name: data.name}, (err, chapters) => {
			if (err) return cb(err);
			if (chapters.length != 0) return cb(null, 'nameTaken');

			crp.db.findOne('games', {_id: data.game}, (err, game) => {
				if (err) return cb(err);
				if (!game) return cb(null, 'noGame');

				var chapter = {
					type: data.type,
					name: data.name,
					slug: crp.util.urlSafe(data.slug) || crp.util.urlSafe(data.name),
					game: game._id,
					desc: data.desc || '',
					discord: data.discord || ''
				};

				var types = ['hosted', 'group', 'page', 'url'];
				if (!types.includes(chapter.type)) return cb(null, 'noType');

				if (!chapter.name) return cb(null, 'noName');

				if (chapter.slug == 'www') return cb(null, 'badDomain');
				if (chapter.type == 'hosted') chapter.slug = 'https://' + chapter.slug + '.chroniclesrp.com';

				if (data.user) {
					chapter.members = [{
						_id: data.user._id,
						role: 'leader'
					}];
				}

				crp.db.insertOne('chapters', chapter, (err, result) => {
					if (err) return cb(err);

					if (chapter.type == 'hosted') {
						crp.util.deployChapter(data.cms, chapter, data.user, (err) => {
							if (err) return cb(err);

							cb(null, chapter);
						});
					} else {
						if (chapter.type == 'group' || chapter.type == 'page') {
							crp.pages.push({
								slug: '/chapters/' + chapter.slug,
								path: '/chapters/view/index.njk',
								context: {
									chapterid: chapter._id
								}
							});
						}

						cb(null, chapter);
					}
				});
			});
		});
	};

	crp.util.deployWordpress = (chapter, user, cb) => {
		var sname = chapter.slug.match(/(?<=https?:\/\/).*(?=\..*\.com)/);
		if (!sname) return cb('badSlug');

		crp.cmd.get('bash ' + crp.ROOT + '/deploy/wordpress/deploy.sh ' + sname[0], cb);
	};

	crp.util.deployChapter = (cms, chapter, user, cb) => {
		switch (cms) {
			case 'wordpress':
				crp.util.deployWordpress(chapter, user, cb);
				break;
			default:
				cb();
		}
	};

	callback()
};
