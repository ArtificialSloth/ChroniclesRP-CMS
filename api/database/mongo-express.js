module.exports = (crp) => {	
	var mongoExpress = require('mongo-express/lib/middleware');
	var mongoExpressConfig = require(crp.ROOT + '/config/mongo-express.config.js');

	crp.express.app.use('/crp-database', mongoExpress(mongoExpressConfig));
};