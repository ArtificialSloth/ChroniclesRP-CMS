module.exports = (crp) => {
	crp.mail = {};
	crp.mail.mailgun = require('mailgun-js')({
		apiKey: process.env.MAILGUN_API_KEY,
		domain: process.env.MAILGUN_DOMAIN
	});

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
			if (err) return console.error(err);

			crp.mail.mailgun.messages().send({
				from: 'The Chronicles RP <no-reply@chroniclesrp.com>',
				to: to,
				subject: subject,
				text: msg,
				html: result
			}, (err, body) => {
				if (err) console.error(err);
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
