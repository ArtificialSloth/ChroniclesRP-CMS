module.exports = (crp, callback) => {
	crp.app.get('/discord', (req, res) => {
		if (!req.user) return res.redirect('/');
		crp.members.get(req.user, (err, user) => {
			if (err) return res.redirect('/');

			crp.discord.createChannelInvite(process.env.DISCORD_CHANNEL, {maxAge: 300, maxUses: 1, unique: true}).then((invite) => {
				res.redirect(`https://discord.gg/${invite.code}`);
			}).catch((err) => {
				console.error(err);
				res.redirect('/');
			});
		})
	});

	callback();
};
