module.exports = (crp, callback) => {
	crp.storage = {};

	var storage = new require('@google-cloud/storage')({projectId: process.env.GOOGLE_PROJECT_ID});
	crp.storage.bucket = storage.bucket(process.env.GOOGLE_BUCKET);

	crp.storage.upload = (file, dest, cb) => {
		crp.storage.bucket.upload(file, {destination: dest, public: true}, cb);
	};

	crp.storage.delete = (file, cb) => {
		if (typeof file == 'string') file = crp.storage.getFile(file);
		if (!file) return cb();

		file.delete(file, cb);
	};

	crp.storage.rmdir = (dir, cb) => {
		if (!dir) return;

		crp.storage.bucket.deleteFiles({prefix: dir}, cb);
	};

	crp.storage.getFile = (file) => {
		if (!file) return;

		return crp.storage.bucket.file(file);
	};

	crp.storage.getUrl = (file) => {
		if (typeof file == 'string') file = crp.storage.getFile(file);
		if (!file) return;

		return `https://storage.googleapis.com/${file.bucket.name}/${file.name}`;
	};

	callback(null, crp);
};
