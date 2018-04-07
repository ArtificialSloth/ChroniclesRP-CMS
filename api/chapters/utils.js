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
							crp.proxy.register(chapter.slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');

							cb(err, chapter);
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

	crp.util.getChapterLink = (chapter, text) => {
		if (!chapter) return;

		switch (chapter.type) {
			case 'hosted':
				return `<a href="//${chapter.slug}.${process.env.DOMAIN || 'chroniclesrp.com'}">${text}</a>`;
				break;
			case 'url':
				return `<a href="//${chapter.slug}">${text}</a>`;
				break;
			default:
				return `<a onclick="crpGetPage('/chapters/${chapter.slug}')">${text}</a>`;
		}
	};

	crp.util.deployPHP = (sname, cb) => {
		crp.fs.readFile(crp.ROOT + '/deploy/php-fpm/pool.conf', 'utf8', (err, data) => {
			if (err) return cb(err);

			var pool = crp.util.parseString(data, [['SNAME', sname]]);
			crp.fs.writeFile(`/etc/php/7.0/fpm/pool.d/${sname}.conf`, pool, (err) => {
				if (err) return cb(err);

				crp.cmd('systemctl reload php7.0-fpm', cb);
			});
		});
	};

	crp.util.deployWordpress = (chapter, user, cb) => {
		crp.util.deployPHP(chapter.slug, (err, stdout, stderr) => {
			if (err) return cb(err);
			if (stderr) return cb(stderr);

			crp.cmd('wget http://wordpress.org/latest.tar.gz -O /var/www/latest.tar.gz && tar xzvf /var/www/latest.tar.gz -C /var/www', (err, stdout, stderr) => {
				if (err) return cb(err);

				crp.fs.unlink('/var/www/latest.tar.gz');
				crp.fs.rename('/var/www/wordpress', '/var/www/' + chapter.slug, (err) => {
					if (err) return cb(err);

					crp.fs.readFile(crp.ROOT + '/deploy/wordpress/wp-config.php', 'utf8', (err, data) => {
						if (err) return cb(err);

						crp.auth.crypto.randomBytes(32, (err, buff) => {
							if (err) return cb(err);

							var pass = buff.toString('hex')
							var config = crp.util.parseString(data, [
								['SNAME', chapter.slug],
								['GENPASS', pass]
							]);
							crp.fs.writeFile(`/var/www/${chapter.slug}/wp-config.php`, config, (err) => {
								if (err) return cb(err);

								crp.cmd(`useradd ${chapter.slug} && chown -R /var/www/${chapter.slug}`, (err, stdout, stderr) => {
									crp.cmd(`mysql -e "CREATE DATABASE ${chapter.slug}" && mysql -e "GRANT ALL PRIVILEGES ON ${chapter.slug}.* TO '${chapter.slug}'@'localhost' IDENTIFIED BY '${pass}'"`, cb);
								});
							});
						});
					});
				});
			});
		});
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
