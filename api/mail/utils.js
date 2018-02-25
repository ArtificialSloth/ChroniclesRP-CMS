module.exports = (crp, callback) => {
	crp.util.msgTemplate = (subject, msg, cb) => {
		crp.db.findOne('site', {}, (err, site) => {
			if (err) return cb(err);

			var keys = [
				['SITENAME', site.name],
				['SUBJECT', subject],
				['MESSAGE', msg]
			];

			return cb(null, crp.util.parseString(site.mail_template, keys));
		});
	};

	crp.util.mail = (to, subject, msg) => {
		crp.util.msgTemplate(subject, msg, (err, result) => {
			if (err) return;

			crp.mail.send({
				to: to,
				from: 'no_reply@chroniclesrp.com',
				subject: subject,
				text: msg,
				html: result
			});
		});
	};

	crp.util.adminNotify = (subject, msg) => {
		crp.util.getUsers({role: 'administrator'}, (err, users) => {
			var to = []
			for (var i in users) {
				to.push(users[i].email);
			}

			crp.util.mail(to, subject, msg);
		});
	};

	callback();
};
