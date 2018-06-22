module.exports = (crp, callback) => {
	crp.util.getChapters = (filter, cb) => {
		crp.db.find('chapters', filter, {}, cb);
	};

	crp.util.getChapterData = (chapterid, cb) => {
		if (typeof chapterid != 'object') chapterid = crp.db.objectID(chapterid);
		crp.db.findOne('chapters', {_id: chapterid}, cb);
	};

	crp.util.setChapterData = (chapterid, data, userid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.util.getUserData(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.db.findOne('games', {_id: crp.db.objectID(data.game)}, (err, game) => {
					if (err) return cb(err);
					if (!game) return cb('noGame');

					var newChapter = {
						_id: chapter._id,
						type: chapter.type,
						name: data.name || chapter.name,
						nicename: crp.util.urlSafe(data.name) || chapter.nicename,
						slug: crp.util.urlSafe(data.slug) || crp.util.urlSafe(data.name) || chapter.slug,
						game: game._id || chapter.game,
						open: data.open ? !!+data.open : chapter.open,
						tagline: data.tagline || chapter.tagline,
						desc: (data.desc != chapter.desc) ? data.desc : chapter.desc,
						discord: data.discord || chapter.discord,
						img: chapter.img || {},
						members: chapter.members || {}
					};

					crp.util.getChapters({name: newChapter.name}, (err, chapters) => {
						if (err) return cb(err);
						if (chapters && newChapter.name != chapter.name) return cb('nameTaken');

						if (newChapter.name.length > 90) return cb('badName');
						if (newChapter.slug.length > 90) return cb('badSlug');
						if (newChapter.tagline.length > 140) return cb('badTagline');
						if (newChapter.discord.length > 19) return cb('badDiscord');

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
			});
		});
	};

	crp.util.addChapter = (data, userid, cb) => {
		crp.util.getUserData(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');

			if (user.role < 2) return cb('notAllowed');
			crp.util.getChapters({}, (err, chapters) => {
				if (err) return cb(err);

				crp.db.findOne('games', {_id: crp.db.objectID(data.game)}, (err, game) => {
					if (err) return cb(err);
					if (!game) return cb('noGame');

					var chapter = {
						type: data.type,
						name: data.name,
						nicename: crp.util.urlSafe(data.name),
						slug: crp.util.urlSafe(data.slug) || crp.util.urlSafe(data.name),
						game: game._id,
						open: false,
						tagline: data.tagline || '',
						desc: data.desc || '',
						discord: data.discord || '',
						img: data.img || {},
						members: [{
							_id: user._id,
							role: 2
						}]
					};

					var types = ['hosted', 'group', 'page', 'url'];
					if (!types.includes(chapter.type)) return cb('noType');

					if (!chapter.name) return cb('noName');
					if (crp.util.findObjectInArray(chapters, 'name', chapter.name)) return cb('nameTaken');

					if (chapter.slug == 'www') return cb('badDomain');
					if (crp.util.findObjectInArray(chapters, 'slug', chapter.slug)) return cb('slugTaken');

					if (chapter.tagline.length > 140) return cb('badTagline');

					crp.db.insertOne('chapters', chapter, (err, result) => {
						if (err) return cb(err);

						crp.db.findOne('chapters', {_id: result.insertedId}, (err, chapter) => {
							crp.fs.mkdir(`${crp.PUBLICDIR}/img/chapters/${chapter._id}`, (err) => {
								if (err) return cb(err);

								switch (chapter.type) {
									case 'hosted':
										crp.util.deployChapter(data.cms, chapter, (err) => {
											if (err) return cb(err);

											crp.proxy.register(chapter.slug + '.' + (process.env.DOMAIN || 'chroniclesrp.com'), '127.0.0.1:8080');
											crp.util.addChapterPage(chapter);
											cb(null, chapter);
										});
										break;
									case 'group':
										crp.util.addCategory({name: chapter.name, chapter: chapter._id}, (err, result) => {
											if (err) return cb(err);

											crp.util.addForum({name: chapter.name, desc: chapter.tagline, category: result.insertedId}, (err, result) => {
												if (err) return cb(err);

												crp.util.addChapterPage(chapter);
												cb(null, chapter);
											});
										});
										break;
									default:
										crp.util.addChapterPage(chapter);
										cb(null, chapter);
								}
							});
						});
					});
				});
			});
		});
	};

	crp.util.removeChapter = (chapterid, userid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.util.getUserData(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.rmdir(`${crp.PUBLICDIR}/img/chapters/${chapter._id}`, (err) => {
					if (err) return cb(err);

					switch (chapter.type) {
						case 'hosted':
							crp.util.disbandChapter(chapter, (err) => {
								if (err) return cb(err);

								crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
									if (err) return cb(err);

									crp.util.removeChapterPage(chapter);
									cb(null, result);
								});
							});
							break;
						case 'group':
							crp.util.getCategories({chapter: chapter._id}, (err, categories) => {
								if (err) return cb(err);
								if (!categories) return cb('noCategories');

								crp.util.removeCategory(categories[0]._id, (err, result) => {
									if (err) return cb(err);

									crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
										if (err) return cb(err);

										crp.util.removeChapterPage(chapter);
										cb(null, result);
									});
								});
							});
							break;
						default:
							crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
								if (err) return cb(err);

								crp.util.removeChapterPage(chapter);
								cb(null, result);
							});
					}
				});
			});
		});
	};

	crp.util.joinChapter = (chapterid, userid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');
			if (!chapter.open) return cb('closed');

			crp.util.getUserData(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				if (crp.util.getChapterMember(chapter, user._id)) return cb('isMember');

				chapter.members.push({_id: user._id, role: 1});
				crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
			});
		});
	};

	crp.util.leaveChapter = (chapterid, userid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.util.getUserData(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if (!member) return cb('notMember');

				chapter.members.splice(chapter.members.indexOf(member), 1);
				crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
			});
		});
	};

	crp.util.getChapterMember = (chapter, userid) => {
		if (!chapter || !userid) return;
		return crp.util.findObjectInArray(chapter.members, '_id', userid.toString());
	};

	crp.util.setChapterMemberRole = (chapterid, data, userid, cb) => {
		crp.util.getChapterData(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.util.getUserData(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				var member = crp.util.getChapterMember(chapter, user._id);
				if ((!member || member.role < 2) && user.role < 3) return cb('notAllowed');
				crp.util.getUserData(data.userid, (err, member) => {
					if (err) return cb(err);
					if (!member) return cb('noUser');
					if (!parseInt(data.role)) return cb('badRole');

					var memberEntry = crp.util.getChapterMember(chapter, member._id);
					chapter.members[chapter.members.indexOf(memberEntry)] = {_id: member._id, role: parseInt(data.role)};
					crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
				});
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

			crp.pages.push({
				slug: `/chapters/${chapter.nicename}/forums`,
				path: '/chapters/view/index.njk',
				subPage: '/chapters/view/forums/index.njk',
				context: {chapterid: chapter._id}
			});

			crp.pages.push({
				slug: `/chapters/${chapter.nicename}/members`,
				path: '/chapters/view/index.njk',
				subPage: '/chapters/view/members/index.njk',
				context: {chapterid: chapter._id}
			});
		}
	};

	crp.util.removeChapterPage = (chapter) => {
		var chapterPages = ['edit', 'forums'];

		var index = crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'slug', `/chapters/${chapter.nicename}`));
		if (index > -1) crp.pages.splice(index, 1);

		for (var i in chapterPages) {
			index = crp.pages.indexOf(crp.util.findObjectInArray(crp.pages, 'slug', `/chapters/${chapter.nicename}/${chapterPages[i]}`));
			if (index > -1) crp.pages.splice(index, 1);
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
