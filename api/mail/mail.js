module.exports = (crp, callback) => {
	crp.mail = require('@sendgrid/mail');
	crp.mail.setApiKey(process.env.SENDGRID_API_KEY);
		
	callback(null, crp);
};