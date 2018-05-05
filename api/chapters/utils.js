module.exports = (crp, callback) => {
	crp.util.getChapters = (filter, cb) => {
		crp.db.find('chapters', filter, {}, cb);
	};

	crp.util.getChapterData = (chapterid, cb) => {
		if (typeof chapterid != 'object') chapterid = crp.db.objectID(chapterid);
		crp.db.findOne('chapters', {_id: chapterid}, cb);
	};

	crp.util.setChapterData = (chapter, data, cb) => {
		crp.util.getChapters({name: data.name}, (err, chapters) => {
			if (err) return cb(err);
			if (chapters.length > 1) return cb(null, 'nameTaken');

			crp.db.findOne('games', {_id: data.game}, (err, game) => {
				if (err) return cb(err);
				if (!game) return cb(null, 'noGame');

				var newChapter = chapter;
				newChapter.name = data.name;
				newChapter.nicename = crp.util.urlSafe(data.name);
				newChapter.game = data.game;
				newChapter.tagline = data.tagline;
				newChapter.desc = data.desc;
				newChapter.discord = data.discord;

				if (newChapter.tagline.length > 140) return cb(null, 'badTagline');

				if (data.img && data.img.profile) {
					var path = `/img/chapters/${newChapter._id}/${data.img.profile[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;

					crp.util.replaceFile(crp.PUBLICDIR + chapter.img.profile, data.img.profile[0].path, crp.PUBLICDIR + path);
					newChapter.img.profile = path;
				}

				if (data.img && data.img.cover) {
					var path = `/img/chapters/${newChapter._id}/${data.img.cover[0].originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;

					crp.util.replaceFile(crp.PUBLICDIR + chapter.img.cover, data.img.cover[0].path, crp.PUBLICDIR + path);
					newChapter.img.cover = path;
				}

				newChapter = crp.util.sanitizeObject(newChapter);
				crp.db.replaceOne('chapters', {_id: chapter._id}, newChapter, (err, result) => {
					cb(err, newChapter);
				});
			});
		});
	};

	crp.util.addChapter = (data, cb) => {
		crp.util.getChapters({}, (err, chapters) => {
			if (err) return cb(err);

			crp.db.findOne('games', {_id: data.game}, (err, game) => {
				if (err) return cb(err);
				if (!game) return cb(null, 'noGame');
				if (!data.user) return cb(null, 'noUser');

				var chapter = {
					type: data.type,
					name: data.name,
					nicename: crp.util.urlSafe(data.name),
					slug: crp.util.urlSafe(data.slug) || crp.util.urlSafe(data.name),
					game: game._id,
					tagline: data.tagline || '',
					desc: data.desc || '',
					discord: data.discord || '',
					img: data.img || {},
					members: [{
						_id: data.user._id,
						role: 'leader'
					}]
				};

				var types = ['hosted', 'group', 'page', 'url'];
				if (!types.includes(chapter.type)) return cb(null, 'noType');

				if (!chapter.name) return cb(null, 'noName');
				if (crp.util.findObjectInArray(chapters, 'name', chapter.name)) return cb(null, 'nameTaken');

				if (chapter.slug == 'www') return cb(null, 'badDomain');
				if (crp.util.findObjectInArray(chapters, 'slug', chapter.slug)) return cb(null, 'slugTaken');

				if (chapter.tagline.length > 140) return cb(null, 'badTagline');

				crp.db.insertOne('chapters', chapter, (err, result) => {
					if (err) return cb(err);

					crp.db.findOne('chapters', {_id: result.insertedId}, (err, chapter) => {
						crp.fs.mkdir(`${crp.PUBLICDIR}/img/chapters/${chapter._id}`, (err) => {
							if (err) return cb(err);

							if (chapter.type == 'hosted') {
								crp.util.deployChapter(data.cms, chapter, (err) => {
									crp.proxy.register(chapter.slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');

									crp.util.addChapterPage(chapter);
									cb(err, chapter);
								});
							} else {
								crp.util.addChapterPage(chapter);
								cb(null, chapter);
							}
						});
					});
				});
			});
		});
	};

	crp.util.removeChapter = (chapterid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.util.rmdir(`${crp.PUBLICDIR}/img/chapters/${chapter._id}`, (err) => {
				if (err) return cb(err);

				switch (chapter.type) {
					case 'hosted':
						crp.util.disbandChapter(chapter, (err) => {
							if (err) return cb(err);

							crp.db.deleteOne('chapters', {_id: chapter._id}, cb);
						});
						break;
					default:
						crp.db.deleteOne('chapters', {_id: chapter._id}, cb);
				}
			});
		});
	};

	crp.util.addChapterPage = (chapter) => {
		crp.pages.push({
			slug: `/chapters/${chapter.nicename}/edit`,
			path: '/chapters/view/index.njk',
			subPage: '/chapters/view/edit/index.njk',
			context: {chapterid: chapter._id}
		});

		if (chapter.type == 'group') {
			crp.pages.push({
				slug: `/chapters/${chapter.nicename}`,
				path: '/chapters/view/index.njk',
				subPage: '/chapters/view/about/index.njk',
				context: {chapterid: chapter._id}
			});
		}
	};

	crp.util.getChapterLink = (chapter) => {
		if (!chapter) return;

		switch (chapter.type) {
			case 'hosted':
				return `<a href="//${chapter.slug}.${process.env.DOMAIN || 'chroniclesrp.com'}">${chapter.name}</a>`;
				break;
			case 'url':
				return `<a href="//${chapter.slug}">${chapter.name}</a>`;
				break;
			default:
				return `<a onclick="crpGetPage('/chapters/${chapter.nicename}')">${chapter.name}</a>`;
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

	crp.util.deployWordpress = (chapter, cb) => {
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

	crp.util.deployChapter = (cms, chapter, cb) => {
		switch (cms) {
			case 'wordpress':
				crp.util.deployWordpress(chapter, cb);
				break;
			default:
				cb();
		}
	};

	crp.util.disbandChapter = (chapter, cb) => {
		crp.fs.rmdir('/var/www/' + chapter.slug, (err) => {
			if (err) return cb(err);

			crp.fs.unlink(`/etc/php/7.0/fpm/pool.d/${chapter.slug}.conf`, (err) => {
				crp.cmd(`mysql -e "DROP DATABASE ${chapter.slug}" && userdel ${chapter.slug}`, cb);
			});
		});
	};

	callback()
};
