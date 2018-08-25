module.exports = (crp) => {
	crp.chapters = {};

	crp.chapters.find = (filter, cb) => {
		crp.db.find('chapters', filter, {}, cb);
	};

	crp.chapters.get = (chapterid, cb) => {
		if (typeof chapterid != 'object') chapterid = crp.db.objectID(chapterid);
		crp.db.findOne('chapters', {_id: chapterid}, cb);
	};

	crp.chapters.set = (chapterid, data, cb) => {
		crp.chapters.get(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

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

				crp.chapters.find({name: newChapter.name}, (err, chapters) => {
					if (err) return cb(err);
					if (chapters.length > 0 && newChapter.name != chapter.name) return cb('nameTaken');

					if (newChapter.name.length > 90) return cb('badName');
					if (newChapter.slug.length > 90) return cb('badSlug');
					if (newChapter.tagline.length > 140) return cb('badTagline');
					if (newChapter.discord.length > 19) return cb('badDiscord');

					crp.async.parallel([
						(callback) => {
							if (!data.img || !data.img.profile) return callback();

							crp.storage.delete(chapter.img.profile, (err) => {
								if (err) return callback(err);

								crp.storage.upload(data.img.profile[0].path, `img/chapters/${newChapter._id}/${data.img.profile[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(data.img.profile[0].path, (err) => {
										if (err) return callback(err);

										newChapter.img.profile = file.name;
										callback();
									});
								});
							});
						},
						(callback) => {
							if (!data.img || !data.img.cover) return callback();

							crp.storage.delete(chapter.img.cover, (err) => {
								if (err) return callback(err);

								crp.storage.upload(data.img.cover[0].path, `img/chapters/${newChapter._id}/${data.img.cover[0].originalname}`, (err, file) => {
									if (err) return callback(err);

									crp.fs.unlink(data.img.cover[0].path, (err) => {
										if (err) return callback(err);

										newChapter.img.cover = file.name;
										callback();
									});
								});
							});
						}
					], (err, results) => {
						if (err) return cb(err);

						newChapter = crp.util.sanitizeObject(newChapter);
						crp.db.replaceOne('chapters', {_id: chapter._id}, newChapter, (err, result) => {
							cb(err, newChapter);
						});
					});
				});
			});
		});
	};

	crp.chapters.add = (data, userid, cb) => {
		crp.members.get(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');

			crp.chapters.find({}, (err, chapters) => {
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

					chapter = crp.util.sanitizeObject(chapter);
					crp.db.insertOne('chapters', chapter, (err, result) => {
						if (err) return cb(err);

						crp.db.findOne('chapters', {_id: result.insertedId}, (err, chapter) => {
							if (err) return cb(err);

							switch (chapter.type) {
								case 'hosted':
									crp.chapters.deploy(data.cms, chapter.slug, (err) => {
										if (err) return cb(err.toString());

										crp.chapters.addPage(chapter, (err) => {
											if (err) return cb(err);

											cb(null, chapter);
										});
									});
									break;
								case 'group':
									crp.forums.addCategory({name: chapter.name, chapter: chapter._id}, (err, result) => {
										if (err) return cb(err);

										crp.forums.addForum({name: chapter.name, desc: chapter.tagline, category: result.insertedId}, (err, result) => {
											if (err) return cb(err);

											crp.chapters.addPage(chapter, (err) => {
												if (err) return cb(err);

												cb(null, chapter);
											});
										});
									});
									break;
								default:
									crp.chapters.addPage(chapter, (err) => {
										if (err) return cb(err);

										cb(null, chapter);
									});
							}
						});
					});
				});
			});
		});
	};

	crp.chapters.remove = (chapterid, cb) => {
		crp.chapters.get(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.storage.rmdir(`img/chapters/${chapter._id}/`, (err) => {
				if (err) return cb(err);

				switch (chapter.type) {
					case 'hosted':
						crp.chapters.disband(chapter.slug, (err) => {
							if (err) return cb(err);

							crp.chapters.removePage(chapter, (err) => {
								if (err) return cb(err);

								crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
									if (err) return cb(err);

									cb(null, result);
								});
							});
						});
						break;
					case 'group':
						crp.forums.getCategories({chapter: chapter._id}, (err, categories) => {
							if (err) return cb(err);
							if (!categories[0]) return cb('noCategories');

							crp.forums.removeCategory(categories[0]._id, (err, result) => {
								if (err) return cb(err);

								crp.chapters.removePage(chapter, (err) => {
									if (err) return cb(err);

									crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
										if (err) return cb(err);

										cb(null, result);
									});
								});
							});
						});
						break;
					default:
						crp.chapters.removePage(chapter, (err) => {
							if (err) return cb(err);

							crp.db.deleteOne('chapters', {_id: chapter._id}, (err, result) => {
								if (err) return cb(err);

								cb(null, result);
							});
						});
				}
			});
		});
	};

	crp.chapters.getMember = (chapter, userid) => {
		if (!chapter || !userid) return;
		return crp.util.findObjectInArray(chapter.members, '_id', userid.toString());
	};

	crp.chapters.addMember = (chapterid, data, cb) => {
		crp.chapters.get(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.members.get(data._id, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				if (crp.chapters.getMember(chapter, user._id)) return cb('isMember');

				chapter.members.push({_id: user._id, role: parseInt(data.role) || 0});
				crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
			});
		});
	};

	crp.chapters.removeMember = (chapterid, userid, cb) => {
		crp.chapters.get(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.members.get(userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');

				var member = crp.chapters.getMember(chapter, user._id);
				if (!member) return cb('notMember');

				chapter.members.splice(chapter.members.indexOf(member), 1);
				crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
			});
		});
	};

	crp.chapters.setMemberRole = (chapterid, data, cb) => {
		crp.chapters.get(chapterid, (err, chapter) => {
			if (err) return cb(err);
			if (!chapter) return cb('noChapter');

			crp.members.get(data.userid, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb('noUser');
				if (!data.role) return cb('noRole');

				var member = crp.chapters.getMember(chapter, user._id);
				chapter.members[chapter.members.indexOf(member)] = {_id: member._id, role: parseInt(data.role)};
				crp.db.replaceOne('chapters', {_id: chapter._id}, chapter, cb);
			});
		});
	};

	crp.chapters.addPage = (chapter, cb) => {
		crp.async.parallel([
			(callback) => {
				if (chapter.type != 'group') return callback();

				crp.pages.addPage({
					slug: `/chapters/${chapter.nicename}`,
					path: '/chapters/view/index.njk',
					subPage: `/chapters/view/about/index.njk`,
					context: {chapterid: chapter._id}
				}, callback);
			},
			(callback) => {
				if (chapter.type != 'group') return callback();

				crp.pages.addPage({
					slug: `/chapters/${chapter.nicename}/forums`,
					path: '/chapters/view/index.njk',
					subPage: `/chapters/view/forums/index.njk`,
					context: {chapterid: chapter._id}
				}, callback);
			},
			(callback) => {
				crp.pages.addPage({
					slug: `/chapters/${chapter.nicename}/members`,
					path: '/chapters/view/index.njk',
					subPage: `/chapters/view/members/index.njk`,
					context: {chapterid: chapter._id}
				}, callback);
			},
			(callback) => {
				crp.pages.addPage({
					slug: `/chapters/${chapter.nicename}/edit`,
					path: '/chapters/view/index.njk',
					subPage: `/chapters/view/edit/index.njk`,
					context: {chapterid: chapter._id}
				}, callback);
			}
		], cb);
	};

	crp.chapters.removePage = (chapter, cb) => {
		var chapterPages = ['edit', 'forums', 'members'];

		crp.pages.removePage({slug: `/chapters/${chapter.nicename}`}, (err, result) => {
			if (err && err != 'noPage') return cb(err);

			crp.async.each(chapterPages, (page, callback) => {
				crp.pages.removePage({slug: `/chapters/${chapter.nicename}/${page}`}, (err, result) => {
					if (err && err != 'noPage') return callback(err);

					callback();
				});
			}, cb);
		});
	};

	crp.chapters.getLink = (chapter) => {
		if (!chapter) return;

		switch (chapter.type) {
			case 'hosted':
				return `<a href="//${chapter.slug}.chroniclesrp.com">${chapter.name}</a>`;
				break;
			case 'url':
				return `<a href="//${chapter.slug}">${chapter.name}</a>`;
				break;
			default:
				return `<a onclick="crpGetPage('/chapters/${chapter.nicename}')">${chapter.name}</a>`;
		}
	};

	crp.chapters.getInvites = (chapters, userid) => {
		if (!chapters || !userid) return;

		var result = [];
		for (var i in chapters) {
			var member = crp.chapters.getMember(chapters[i], userid);
			if (member && member.role == 0) {
				result.push(chapters[i]);
			}
		}

		return result;
	};

	crp.chapters.getProfilePic = (chapter) => {
		if (!chapter) return;

		return crp.storage.getUrl(chapter.img.profile) || crp.storage.getUrl('img/chapters/profile.png');
	};

	crp.chapters.getCoverPic = (chapter) => {
		if (!chapter) return;

		return crp.storage.getUrl(chapter.img.cover) || crp.storage.getUrl('img/cover.png');
	};

	crp.chapters.deploy = (cms, sname, cb) => {
		crp.request({
			url: `${process.env.DEPLOY_URL}/${cms}`,
			method: 'POST',
			json: true,
			body: {sname: sname}
		}, (err, res, body) => {
			if (err) return cb(err);
			if (res.statusCode != 200) return cb(res.statusCode);

			cb();
		});
	};

	crp.chapters.disband = (sname, cb) => {
		crp.request({
			url: `${process.env.DEPLOY_URL}/disband`,
			method: 'POST',
			json: true,
			body: {sname: sname}
		}, (err, res, body) => {
			if (err) return cb(err);
			if (res.statusCode != 200) return cb(res.statusCode);

			cb();
		});
	};
};
