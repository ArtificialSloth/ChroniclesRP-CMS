module.exports = (crp, callback) => {
	crp.express = require('express');
	crp.express.app = crp.express();

	crp.http = require('http');
	crp.https = require('https');

	crp.nunjucks = require('nunjucks');
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

		this.run = (context, collection, filter, options, key, cb) => {
			crp.db.find(collection, filter, options, (err, result) => {
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

		this.run = (context, collection, filter, key, cb) => {
			crp.db.findOne(collection, filter, (err, result) => {
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
		dest: crp.ROOT + '/uploads',
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
	crp.express.app.use(require('body-parser').json());
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

			if (process.env.NODE_ENV = 'production') {
				crp.express.app.use((req, res, next) => {
					if (req.secure) return next();

    				res.redirect('https://' + req.headers.host + req.url);
					res.end();
				});
			}

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

			crp.express.app.post('/api/github', (req, res) => {
				if (!req.headers['user-agent'].includes('GitHub-Hookshot')) return res.sendStatus(401)

				var hmac = crp.auth.crypto.createHmac('sha1', process.env.GITHUB_SECRET);
				var signature = 'sha1=' + hmac.update(JSON.stringify(req.body), 'utf-8').digest('hex');
				if (!crp.auth.crypto.timingSafeEqual(Buffer.from(req.headers['x-hub-signature']), Buffer.from(signature))) return res.sendStatus(401);

				res.sendStatus(200);
				crp.cmd('pm2 pull CRP', (err, stderr, stdout) => {
					if (err) console.error(err);
					if (stderr) console.error(err);
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
				});
			});

			cb();
		});
	};

	callback(null, crp);
};
