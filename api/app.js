module.exports = (crp, callback) => {
	var bodyParser = require('body-parser');
	var multer = require('multer');
	
	crp.express = require('express');
	crp.express.exphbs = require('express-handlebars');
	
	crp.express.app = crp.express();
	crp.express.hbs = crp.express.exphbs.create({
		extname: '.hbs',
		defaultLayout: 'main'
	});
	crp.express.upload = multer({
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
	
	crp.express.app.engine('.hbs', crp.express.hbs.engine);
	crp.express.app.set('view engine', '.hbs');
	
	crp.express.app.use(crp.express.static('public'));
	crp.express.app.use(bodyParser.urlencoded({extended: false}));
	crp.express.app.use('/jquery', crp.express.static(crp.ROOT + '/node_modules/jquery/dist/'));
	
	crp.express.ready = () => {
		crp.util.requireFiles('/app.js');
		
		crp.express.app.get('/*', (req, res) => {
			var context = {crp: crp, req: req};
			res.render('index', context);
		});
		
		crp.express.app.post('/api/get-page', (req, res) => {
			var page = crp.util.processPage(req.body.page, req);
			
			res.render('partials/pages' + page.path, page.context);
		});
		
		crp.express.app.post('/api/get-subpage', (req, res) => {
			var page = crp.util.processPage(req.body.page, req);
			
			res.send(page.context.subPage);
		});
	};
	
	callback(null, crp);
};