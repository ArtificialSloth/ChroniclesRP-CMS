module.exports = (crp, callback) => {
	var Eris = require('eris');
	crp.discord = new Eris(process.env.DISCORD_TOKEN);

	crp.discord.inqueries = {};
	crp.discord.send = (msg, channel, cb) => {
		var channel = channel || crp.discord.getChannel(process.env.DISCORD_CHANNEL);
		if (!channel) return;

		crp.async.retry({times: 4, interval: 500}, (callback) => {
			channel.createMessage(msg).then((msg) => {
				callback(null, msg);
			}).catch(callback);
		}, (err, result) => {
			if (cb) return cb(err, result);
		});
	};

	crp.discord.inquire = (guild, member, errChannel) => {
		if (!guild || !member) return;

		crp.discord.getDMChannel(member.id).then((channel) => {
			crp.db.findOne('site', {}, (err, site) => {
				if (err) return;

				var inquery = crp.util.shuffleArray(site.discord.inqueries)[0];

				inquery.choices.push(inquery.answer);
				inquery.choices = crp.util.shuffleArray(inquery.choices);

				var answers = '';
				for (var i in inquery.choices) {
					answers = answers + `\n	**${(parseInt(i) + 1)}:** \`${inquery.choices[i]}\``;
				}

				var msg = `${site.discord.greeting}\n\n**${inquery.question}**${answers}`;
				crp.discord.send(msg, channel, (err, result) => {
					if (err && errChannel) return crp.discord.send(`\`\`\`${err}\`\`\``, errChannel);

					inquery.guild = guild;
					crp.discord.inqueries[member.id] = inquery;
				});
			});
		}).catch(console.error);
	};

	crp.discord.on('guildMemberAdd', crp.discord.inquire);
	crp.discord.on('messageCreate', (msg) => {
		if (msg.content.startsWith('/message')) {
			if (!msg.member || !msg.member.roles.includes(process.env.DISCORD_BOARD_ROLE)) return;

			return crp.discord.inquire(msg.member.guild, {id: msg.content.replace('/message ', '')}, msg.channel);
		}

		if (!msg.channel.recipient) return;

		var inquery = crp.discord.inqueries[msg.channel.recipient.id];
		if (!inquery) return;

		var res = parseInt(msg.content);
		if (!res || res < 1 || res > inquery.choices.length) return;

		crp.db.findOne('site', {}, (err, site) => {
			if (err) return;

			crp.discord.inqueries[msg.channel.recipient.id] = null;
			if (inquery.choices[res - 1] != inquery.answer) return crp.discord.send(site.discord.reject, msg.channel);

			crp.discord.addGuildMemberRole(inquery.guild.id, msg.channel.recipient.id, process.env.DISCORD_DEFAULT_ROLE).then(() => {
				crp.discord.send(site.discord.accept, msg.channel);
			}).catch(console.error);
		});
	});

	crp.discord.connect();
	crp.discord.on('ready', () => {
		if (!callback) return;

		callback(null, crp);
		callback = null;
	});
};
