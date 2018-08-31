module.exports = (crp, callback) => {
	var Eris = require('eris');
	crp.discord = new Eris(process.env.DISCORD_TOKEN);

	crp.discord.send = (msg) => {
		var channel = crp.discord.getChannel('482697857158086666');
		return crp.discord.createMessage(channel.id, msg);
	};

	crp.discord.connect();
	crp.discord.on('ready', () => {
		callback(null, crp);
	});
};
