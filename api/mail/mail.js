module.exports = (crp) => {
	crp.mail = {};

	crp.mail.sendgrid = require('@sendgrid/mail');
	crp.mail.sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

	crp.mail.msgTemplate = (subject, msg, cb) => {
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

	crp.mail.send = (to, subject, msg) => {
		crp.mail.msgTemplate(subject, msg, (err, result) => {
			if (err) return;

			crp.mail.sendgrid.send({
				to: to,
				from: 'no_reply@chroniclesrp.com',
				subject: subject,
				text: msg,
				html: result
			});
		});
	};

	crp.mail.adminNotify = (subject, msg) => {
		crp.members.find({role: 3}, (err, users) => {
			var to = []
			for (var i in users) {
				to.push(users[i].email);
			}

			crp.mail.send(to, subject, msg);
		});
	};
};
