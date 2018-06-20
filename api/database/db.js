module.exports = (crp, callback) => {
	var mongodb = require('mongodb');
	var mongoClient = mongodb.MongoClient;

	mongoClient.connect(process.env.MONGODB_URL, (err, db) => {
		if (err) return callback(err, crp);

		crp.db = {
			mongodb: db,
			prefix: 'CRP_',
			sanitize: require('mongo-sanitize')
		};

		crp.db.find = (collection, filter, options, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).find(filter, options).toArray(cb);
		};

		crp.db.findOne = (collection, filter, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).findOne(filter, cb);
		};

		crp.db.insertOne = (collection, data, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).insertOne(data, cb);
		};

		crp.db.replaceOne = (collection, filter, data, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).replaceOne(filter, data, cb);
		};

		crp.db.deleteOne = (collection, filter, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).deleteOne(filter, cb);
		};

		crp.db.deleteMany = (collection, filter, cb) => {
			crp.db.mongodb.collection(crp.db.prefix + collection).deleteMany(filter, cb);
		};

		crp.db.objectID = (oid) => {
			try {
				return mongodb.ObjectId(oid);
			} catch (e) {
				return e;
			}
		};

		crp.pages = [];
		crp.util.requireFiles('/pages.js', (err) => {
			callback(err, crp);
		});
	});
};
