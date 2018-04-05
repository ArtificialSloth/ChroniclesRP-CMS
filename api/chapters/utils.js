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

	crp.util.deployPHP = (sname, cb) => {
		crp.fs.readFile(crp.ROOT + '/deploy/php-fpm/pool.conf', 'utf8', (err, data) => {
			if (err) return cb(err);

			var pool = crp.util.parseString(data, [['SNAME', sname]]);
			crp.fs.writeFile('/etc/php/7.0/fpm/pool.d/' + sname + '.conf', pool, (err) => {
				if (err) return cb(err);

				crp.cmd('systemctl reload php7.0-fpm', cb);
			});
		});
	};

	crp.util.deployWordpress = (chapter, user, cb) => {
		var sname = chapter.slug.match(/(?<=https?:\/\/).*(?=\..*\.com)/);
		if (!sname) return cb('badSlug');

		crp.util.deployPHP(sname, (err, stdout, stderr) => {
			if (err) return cb(err);
			if (stderr) return cb(stderr);

			crp.http.get('http://wordpress.org/latest.tar.gz', (res) => {
				var file = fs.createWriteStream('/var/www/latest.tar.gz');

				res.pipe(file);
				file.on('finish', () => {
					crp.targz({src: '/var/www/latest.tar.gz', dest: '/var/www'}, (err) => {
						if (err) return cb(err);

						crp.fs.unlink('/var/www/latest.tar.gz');
						crp.fs.rename('/var/www/wordpress', '/var/www/' + sname, (err) => {
							if (err) return cb(err);

							crp.fs.readFile(crp.ROOT + '/deploy/wordpress/wp-config.php', 'utf8', (err, data) => {
								if (err) return cb(err);

								crp.auth.crypto.randomBytes(32, (err, buf) => {
									if (err) return cb(err);

									var config = crp.util.parseString(data, [
										['SNAME', sname],
										['PASS', buf.toString('hex')]
									]);
									crp.fs.writeFile('/var/www/' + sname + '/wp-config.php', config, cb);
								});
							});
						});
					});
				});
			}).on('error', (err) => {
				fs.unlink('/var/www/latest.tar.gz');
				cb(err);
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
