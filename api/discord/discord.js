module.exports = (crp, callback) => {
	var Eris = require('eris');
	crp.discord = new Eris(process.env.DISCORD_TOKEN);

	crp.discord.send = (msg, channel, cb) => {
		var channel = crp.discord.getChannel(channel) || crp.discord.getChannel(process.env.DISCORD_CHANNEL);
		if (!channel) return cb('noChannel');

		crp.async.retry({times: 4, interval: 500}, (callback) => {
			channel.createMessage(msg).then((msg) => {
				callback(null, msg);
			}).catch(callback);
		}, (err, result) => {
			if (cb) return cb(err, result);
		});
	};

	crp.discord.on('guildMemberAdd', (guild, member) => {
		member.addRole(process.env.DISCORD_DEFAULT_ROLE);
	});

	crp.discord.connect();
	crp.discord.on('ready', () => {
		if (!callback) return;

		callback(null, crp);
		callback = null;
	});
};
