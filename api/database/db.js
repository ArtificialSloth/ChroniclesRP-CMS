module.exports = (crp, callback) => {
	var mongodb = require('mongodb');
	var mongoClient = mongodb.MongoClient;

	mongoClient.connect(process.env.MONGODB_URL, (err, db) => {
		if (err) return callback(err, crp);

		crp.db = db;
		crp.db.PREFIX = 'CRP_';
		crp.db.objectID = mongodb.ObjectId;
		crp.db.sanitize = require('mongo-sanitize');

		crp.util.requireFiles('/globals.js', (err) => {
			callback(err, crp);
		});
	});
};
