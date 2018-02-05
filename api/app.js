module.exports = (crp, callback) => {
	crp.express = require('express');
	crp.express.app = crp.express();

	crp.nunjucks.configure('views', {
		express: crp.express.app
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
	crp.express.recaptcha = new require('recaptcha2')({
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

	crp.express.ready = () => {
		return new Promise((resolve, reject) => {
			crp.util.requireFiles('/app.js').then(() => {
				crp.express.app.get('/*', (req, res) => {
					var page = crp.util.processPage(req.url, req);

					res.render('index.njk', page.context);
				});

				crp.express.app.post('/api/get-page', (req, res) => {
					var page = crp.util.processPage(req.body.page, req);

					res.render('pages' + page.path, page.context);
				});

				crp.express.app.post('/api/get-subpage', (req, res) => {
					var page = crp.util.processPage(req.body.page, req);

					res.send(crp.nunjucks.render('pages' + page.context.subPage, page.context));
				});

				crp.express.app.post('/api/admin/edit-site', (req, res) => {
					var site = {
						name: req.body.site_name,
						tagline: req.body.site_tagline,
						mail_template: req.body.mail_template
					};

					res.send(crp.util.editSite(site));
				});

				return resolve();
			}).catch((err) => {
				return reject(err);
			});
		});
	};

	callback(null, crp);
};
