module.exports = (crp, callback) => {
	crp.express = require('express');
	crp.express.app = crp.express();

	crp.nunjucks.configure('views', {
		express: crp.express.app
	}).addExtension('query', new function() {
		this.tags = ['query'];

		this.parse = (parser, nodes, lexer) => {
			var tok = parser.nextToken();

			var args = parser.parseSignature(null, true);
			parser.advanceAfterBlockEnd(tok.value);

			return new nodes.CallExtensionAsync(this, 'run', args);
		};

		this.run = (context, collection, filter, sort, key, cb) => {
			crp.db.collection(crp.db.PREFIX + collection).find(filter).sort(sort).toArray((err, result) => {
				context.ctx[key] = result;
				cb(err);
			});
		};
	}).addExtension('lookup', new function() {
		this.tags = ['lookup'];

		this.parse = (parser, nodes, lexer) => {
			var tok = parser.nextToken();

			var args = parser.parseSignature(null, true);
			parser.advanceAfterBlockEnd(tok.value);

			return new nodes.CallExtensionAsync(this, 'run', args);
		};

		this.run = (context, collection, filter, sort, key, cb) => {
			crp.db.collection(crp.db.PREFIX + collection).findOne(filter, (err, result) => {
				context.ctx[key] = result;
				cb(err);
			});
		};
	});

	crp.express.limiter = require('express-limiter')(crp.express.app, crp.redis);
	crp.express.limiter({
		path: '*',
		method: 'all',
		lookup: ['ip'],
		total: 180,
		expire: 60 * 1000,
		onRateLimited: (req, res, next) => {
			console.log(req.ip + ' limited')
			res.redirect(429, '/');
		}
	});

	var recaptcha = require('recaptcha2');
	crp.express.recaptcha = new recaptcha({
		siteKey: '6Lf0MT8UAAAAAJ48jzvBm-QGZpB0Fer8WsGpguMS',
		secretKey: process.env.RECAPTCHA_SECRET
	});

	crp.express.upload = require('multer')({
		dest: crp.PUBLICDIR + '/uploads',
		limits: {
			fileSize: 2 * 1024 * 1024
		},
		fileFilter: (req, file, cb) => {
			var fileTypes = ['image/jpeg', 'image/png'];
			if (req.user && fileTypes.includes(file.mimetype)) {
				cb(null, true);
			} else {
				cb(null, false);
			}
		}
	});

	crp.express.app.use(crp.express.static('public'));
	crp.express.app.use(require('body-parser').urlencoded({
		extended: false
	}));
	crp.express.app.use(require('helmet')({
		expectCt: {
			maxAge: 123
		},
		hsts: false,
		noCache: true
	}));

	crp.express.ready = (cb) => {
		crp.util.requireFiles('/app.js', (err) => {
			if (err) return cb(err);

			crp.express.app.get('/*', (req, res) => {
				crp.util.processPage(req.url, req, (err, page) => {
					crp.nunjucks.render('index.njk', page.context, (err, result) => {
						if (err) return console.error(err);

						res.send(result);
					});
				});
			});

			crp.express.app.post('/api/get-page', (req, res) => {
				crp.util.processPage(req.body.page, req, (err, page) => {
					crp.nunjucks.render('pages' + page.path, page.context, (err, result) => {
						if (err) return console.error(err);

						res.send(result);
					});
				});
			});

			crp.express.app.post('/api/get-subpage', (req, res) => {
				crp.util.processPage(req.body.page, req, (err, page) => {
					crp.nunjucks.render('pages' + page.context.subPage, page.context, (err, result) => {
						if (err) return console.log(err);

						res.send(result);
					});
				});
			});

			crp.express.app.post('/api/admin/edit-site', (req, res) => {
				var site = {
					name: req.body.site_name,
					tagline: req.body.site_tagline,
					mail_template: req.body.mail_template
				};

				crp.util.editSite(site, (err, result) => {
					res.send(result);
				})
			});

			cb();
		});
	};

	callback(null, crp);
};
