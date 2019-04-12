module.exports = (crp) => {
	crp.mail = {activations: []};
	crp.mail.mailgun = require('mailgun-js')({
		apiKey: process.env.MAILGUN_API_KEY,
		domain: process.env.MAILGUN_DOMAIN
	});

	crp.mail.validateEmail = (email) => {
		return (typeof email == 'string' && email.includes('@') && email.lastIndexOf('.') > email.lastIndexOf('@'));
	};

	crp.mail.msgTemplate = (subject, msg, cb) => {
		crp.sites.findOne({}, (err, site) => {
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

	crp.mail.sendConfirmCode = (userid, email) => {
		var activation = {
			_id: userid,
			email: email,
			code: crp.auth.crypto.randomBytes(3).toString('hex').toUpperCase()
		};
		crp.mail.activations.push(activation);

		crp.util.wait(15 * 60 * 1000, () => {
			crp.mail.activations.splice(crp.mail.activations.indexOf(activation), 1);
		});

		var subject = 'Confirm your email address';
		var msg = 'Please use the following code to confirm your email address <div style="font-size:20px; text-align:center">' + activation.code + '</div>';
		crp.mail.send(activation.email, subject, msg);
	};

	crp.mail.adminNotify = (subject, msg) => {
		crp.users.find({role: 3}, (err, users) => {
			var to = []
			for (var i in users) {
				to.push(users[i].email);
			}

			crp.mail.send(to, subject, msg);
		});
	};
};
