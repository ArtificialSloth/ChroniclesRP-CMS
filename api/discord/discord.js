module.exports = (crp, callback) => {
	var Eris = require('eris');
	crp.discord = new Eris(process.env.DISCORD_TOKEN);

	crp.discord.send = (msg) => {
		var channel = crp.discord.getChannel(process.env.DISCORD_CHANNEL);
		return channel ? crp.discord.createMessage(channel.id, msg) : false;
	};

	//crp.discord.connect();
	//crp.discord.on('ready', () => {
		callback(null, crp);
	//});
};
