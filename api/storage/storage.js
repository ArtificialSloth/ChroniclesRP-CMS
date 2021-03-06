module.exports = (crp) => {
	crp.storage = {};

	var {Storage} = require('@google-cloud/storage');
	var creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
	var storage = new Storage({projectId: creds.project_id, credentials: creds});

	crp.storage.bucket = storage.bucket(process.env.GOOGLE_BUCKET);

	crp.storage.upload = (file, dest, cb) => {
		crp.storage.bucket.upload(file, {destination: dest, public: true}, cb);
	};

	crp.storage.delete = (file, cb) => {
		if (typeof file == 'string') file = crp.storage.getFile(file);
		if (!file) return cb();

		file.delete(cb);
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
};
