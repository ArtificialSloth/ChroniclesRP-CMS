module.exports = (crp, callback) => {
	crp.db = require('mongoose');

	crp.db.connect('mongodb://127.0.0.1:27017/chroniclesrp', {useNewUrlParser: true}, (err) => {
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

		callback(err, crp);
	});

	/*var mongodb = require('mongodb');
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

		callback(null, crp);
	});*/
};
