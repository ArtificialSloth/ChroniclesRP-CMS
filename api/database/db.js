module.exports = (crp, callback) => {
	crp.db = require('mongoose');

	crp.db.connect(process.env.MONGODB_URL, {useNewUrlParser: true}, (err) => {
		crp.sites = crp.db.model('site', new crp.db.Schema({
			name: {type: String, required: true},
			tagline: String,
			mail_template: {type: String, required: true},
			css: {
				colors: {
					font: String,
					link: String,
					bg: String,
					bodyBg: String,
					header: String,
					primary: String,
					secondary: String
				},
				img: {
					bg: String,
					ico: String,
					cover: String,
					phpBB: String,
					donate: String,
					header: String,
					drupal: String,
					joomla: String,
					discord: String,
					wordpress: String
				}
			}
		}));

		crp.games = crp.db.model('game', new crp.db.Schema({
			name: {
				type: String,
				required: true
			},
			slug: {
				type: String,
				lowercase: true,
				default: function() {
					return crp.util.urlSafe(this.name);
				}
			},
			icon: {
				type: String,
				required: true
			}
		}));

		callback(err, crp);
	});
};
