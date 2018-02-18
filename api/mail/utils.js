module.exports = (crp, callback) => {
	crp.util.msgTemplate = (subject, msg) => {
		var keys = [
			['SITENAME', crp.global.site.name],
			['SUBJECT', subject],
			['MESSAGE', msg]
		];

		return crp.util.parseString(crp.global.site.mail_template, keys);
	};

	crp.util.mail = (to, subject, msg) => {
		crp.mail.send({
			to: to,
			from: 'no_reply@chroniclesrp.com',
			subject: subject,
			text: msg,
			html: crp.util.msgTemplate(subject, msg)
		});
	};

	crp.util.adminNotify = (subject, msg) => {
		var admins = crp.util.getUsersByRole('administrator');
		var to = []
		for (var i in admins) {
			to.push(admins[i].email);
		}

		crp.util.mail(to, subject, msg);
	};

	callback();
};
