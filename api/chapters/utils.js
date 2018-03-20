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

	crp.util.newNginxVHost = (name, slug, cb) => {
		crp.cmd.get('bash ' + crp.ROOT + '/deploy/nginx/deploy.sh php ' + name + ' ' + slug, (err) => {
			if (err) return cb(err);

			crp.cmd.get('bash ' + crp.ROOT + '/deploy/php-fpm/deploy.sh ' + name, cb);
		});
	};

	crp.util.deployWordpress = (chapter, user, cb) => {
		crp.util.newNginxVHost(crp.util.urlSafe(chapter.name), chapter.slug.replace('https://', ''), (err) => {
			if (err) return cb(err);

			crp.cmd.get('bash ' + crp.ROOT + '/deploy/wordpress/deploy.sh ' + crp.util.urlSafe(chapter.name), cb);
		});
	};

	crp.util.deployChapter = (cms, chapter, user, cb) => {
		if (cms == 'wordpress') {
			crp.util.deployWordpress(chapter, user, cb);
		} else {
			cb();
		}
	};

	callback()
};
