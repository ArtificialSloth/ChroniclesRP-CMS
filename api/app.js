module.exports = (crp, callback) => {
	crp.express = require('express');
	crp.express.app = crp.express();

	require('nunjucks').configure('nunjucks', {express: crp.express.app});

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
	crp.express.app.use(require('body-parser').urlencoded({extended: false}));
	crp.express.app.use('/jquery', crp.express.static(crp.ROOT + '/node_modules/jquery/dist/'));
	crp.express.app.use(require('helmet')({
		expectCt: {
			maxAge: 123
		},
		hsts: false,
		noCache: true
	}));

	crp.express.ready = () => {
		crp.util.requireFiles('/app.js');

		crp.express.app.get('/*', (req, res) => {
			var context = {crp: crp, user: crp.util.getUserData(req.user)};
			res.render('index.njk', context);
		});

		crp.express.app.post('/api/get-page', (req, res) => {
			var page = crp.util.processPage(req.body.page, req);

			res.render('partials/pages' + page.path, page.context);
		});

		crp.express.app.post('/api/get-subpage', (req, res) => {
			var page = crp.util.processPage(req.body.page, req);

			res.send(page.context.subPage);
		});

		crp.express.app.post('/api/admin/edit-site', (req, res) => {
			var site = {
				name: req.body.site_name,
				tagline: req.body.site_tagline,
				mail_template: req.body.mail_template
			};

			res.send(crp.util.editSite(site));
		});
	};

	callback(null, crp);
};
