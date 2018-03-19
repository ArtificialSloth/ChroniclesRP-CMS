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
		crp.fs.readFile(crp.ROOT + '/templates/site', 'utf8', (err, data) => {
			if (err) return cb(err);
			var site = crp.util.parseString(data, [
				['NICENAME', name],
				['SLUG', slug]
			]);

			crp.fs.writeFile('/etc/nginx/sites-available/' + name, site, (err) => {
				if (err) return cb(err);

				crp.fs.symlink('/etc/nginx/sites-available/' + name, '/etc/nginx/sites-enabled/' + name, (err) => {
					if (err) return cb(err);

					crp.cmd.run('systemctl reload nginx');
					crp.fs.readFile(crp.ROOT + '/templates/pool.conf', 'utf8', (err, data) => {
						if (err) return cb(err);
						var pool = crp.util.parseString(data, [['NICENAME', name]]);

						crp.fs.writeFile('/etc/php/7.0/fpm/pool.d/' + name + '.conf', pool, (err) => {
							if (err) return cb(err);

							crp.cmd.run('systemctl reload php7.0-fpm');
							cb();
						});
					});
				});
			});
		});
	};

	crp.util.deployWordpress = (chapter, user, cb) => {
		var nicename = crp.util.urlSafe(chapter.name);

		crp.util.newNginxVHost(nicename, chapter.slug, (err) => {
			if (err) return cb(err);

			crp.cmd.get('wget http://wordpress.org/latest.tar.gz -O /var/www/' + nicename + '/latest.tar.gz', (err) => {
				if (err) return cb(err);

				crp.cmd.get('tar xzvf /var/www/' + nicename + '/latest.tar.gz /var/www/' + nicename, (err) => {
					if (err) return cb(err);

					crp.cmd.get('mv /var/www/' + nicename + '/wordpress/* /var/www/' + nicename, (err) => {
						if (err) return cb(err);

						crp.cmd.get('rm -R /var/www/' + nicename + '/wordpress', cb);
					});
				});
			});
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
