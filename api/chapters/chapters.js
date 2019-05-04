module.exports = (crp) => {
	var schema = new crp.db.Schema({
		type: {
			type: String,
			required: true,
			enum: ['hosted', 'group', 'page', 'url']
		},
		name: {
			type: String,
			required:true,
			minlength: 4,
			maxlength: 80,
			validate: {
				msg: 'Name {VALUE} is already in use.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						crp.chapters.find({name: val}, (err, chapters) => {
							if (err) return reject(err);
							if (chapters && chapters.length > 0) return resolve(false);
							resolve(true);
						});
					});
				}
			},
			set: function(val) {
				if (this.type != 'url') this.set('nicename', crp.util.urlSafe(val));
				return val;
			}
		},
		nicename: {
			type: String,
			lowercase: true,
			default: function() {
				return crp.util.urlSafe(this.name);
			}
		},
		slug: {
			type: String,
			lowercase: true,
			default: function() {
				return crp.util.urlSafe(this.name);
			}
		},
		game: {
			type: crp.db.Schema.Types.ObjectId,
			required: true,
			validate: {
				msg: '{VALUE} is not an existing game ID.',
				validator: function(val) {
					return new Promise((resolve, reject) => {
						crp.games.findById(val, (err, game) => {
							if (err) return reject(err);
							if (!game) return resolve(false);
							resolve(true);
						});
					});
				}
			}
		},
		open: {
			type: Boolean,
			default: false
		},
		tagline: {
			type: String,
			maxlength: 140,
			validate: {
				msg: 'Path \'{PATH}\' ({VALUE}) is shorter that the minimum allowed length ({MINLENGTH})',
				validator: function(val) {
					return val ? ((val.length == 0) ? true : ((val.length >= 4) ? true : false)) : true;
				}
			}
		},
		desc: {
			type: String,
			validate: {
				msg: 'Path \'{PATH}\' ({VALUE}) is shorter that the minimum allowed length ({MINLENGTH})',
				validator: function(val) {
					return val ? ((val.length == 0) ? true : ((val.length >= 4) ? true : false)) : true;
				}
			}
		},
		discord: {
			type: String,
			maxlength: 18,
			validate: {
				msg: 'Path \'{PATH}\' ({VALUE}) is shorter that the minimum allowed length (19)',
				validator: function(val) {
					return val ? ((val.length == 0) ? true : ((val.length < 18) ? false : true)) : true;
				}
			}
		},
		img: {
			profile: {
				type: String,
				default: null
			},
			cover: {
				type: String,
				default: null
			}
		},
		members: [Object]
	});

	schema.methods.getMember = function(userid) {
		return crp.util.findObjectInArray(this.members, '_id', userid);
	};

	schema.methods.addMember = function(data, cb) {
		crp.users.findById(data._id, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');
			if (this.getMember(user._id)) return cb('isMember');

			this.members.push({_id: user._id, role: parseInt(data.role) || 0});
			crp.chapters.updateOne({_id: this._id}, {members: this.members}, cb);
		});
	};

	schema.methods.removeMember = function(userid, cb) {
		crp.users.findById(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');

			var member = this.getMember(user._id);
			if (!member) return cb('notMember');

			this.members.splice(this.members.indexOf(member), 1);
			crp.chapters.updateOne({_id: this._id}, {members: this.members}, cb);
		});
	};

	schema.methods.setMemberRole = function(userid, role, cb) {
		crp.users.findById(userid, (err, user) => {
			if (err) return cb(err);
			if (!user) return cb('noUser');
			if (!role) return cb('noRole');

			var member = this.getMember(user._id);
			this.members[this.members.indexOf(member)].role = parseInt(role);
			crp.chapters.updateOne({_id: this._id}, {members: this.members}, cb);
		});
	};

	schema.methods.getURL = function() {
		if (this.type == 'url') return this.slug;
		return `/chapters/${this.nicename}`;
	};

	schema.methods.getProfilePic = function() {
		return crp.storage.getUrl(this.img.profile) || crp.storage.getUrl('img/chapters/profile.png');
	};

	schema.methods.getCoverPic = function() {
		return crp.storage.getUrl(this.img.cover) || crp.storage.getUrl('img/cover.png');
	};

	crp.chapters = new crp.db.model('chapter', schema);

	crp.pages.add((slug, cb) => {
		if (slug == '/chapters') return cb(null, {
			path: '/chapters/browse/index.njk'
		});
		if (slug == '/chapters/create') return cb(null, {
			path: '/chapters/create/index.njk',
			role: 2
		});

		crp.games.find({}, (err, games) => {
			if (err) return cb(err);

			for (var i in games) {
				if (slug == `/chapters/${games[i].slug}`) return cb(null, {
					path: '/chapters/browse/index.njk',
					context: {filter: games[i]._id}
				});
			}

			crp.chapters.find({}, (err, chapters) => {
				if (err) return cb(err);

				for (var i in chapters) {
					if (chapters[i].type == 'group') {
						if (slug == `/chapters/${chapters[i].nicename}`) return cb(null, {
							path: '/chapters/profile/index.njk',
							subPage: '/chapters/profile/about/index.njk',
							context: {chapterid: chapters[i]._id}
						});

						if (slug == `/chapters/${chapters[i].nicename}/forums`) return cb(null, {
							path: '/chapters/profile/index.njk',
							subPage: `/chapters/profile/forums/index.njk`,
							context: {chapterid: chapters[i]._id}
						});
					}

					if (slug == `/chapters/${chapters[i].nicename}/members`) return cb(null, {
						path: '/chapters/profile/index.njk',
						subPage: `/chapters/profile/members/index.njk`,
						context: {chapterid: chapters[i]._id}
					});

					if (slug == `/chapters/${chapters[i].nicename}/settings`) return cb(null, {
						path: '/chapters/profile/index.njk',
						subPage: `/chapters/profile/settings/index.njk`,
						context: {chapterid: chapters[i]._id}
					});
				}

				cb();
			});
		});
	});
};
