module.exports = (crp, callback) => {	
	var mongodb = require('mongodb');
	var mongoClient = mongodb.MongoClient;
	
	mongoClient.connect(process.env.MONGODB_URL, (err, db) => {
		if (err) throw err;
		
		db.PREFIX = 'CRP_';
		db.objectID = mongodb.ObjectId;
		db.mongoExpress = require('./mongo-express.js')(crp);
		db.sanitize = require('mongo-sanitize');
		
		crp.db = db;
		crp.util.requireFiles('/globals.js');
		callback(null, crp);
	});
};