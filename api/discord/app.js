module.exports = (crp, callback) => {
	crp.app.get('/discord', (req, res) => {
		if (!req.user) return res.redirect('/');
		crp.users.findById(req.user, (err, user) => {
			if (err || !user || user.role < 1) return res.redirect('/');

			crp.discord.createChannelInvite(process.env.DISCORD_WELCOME, {maxAge: 300, maxUses: 1, unique: true}).then((invite) => {
				res.redirect(`https://discord.gg/${invite.code}`);
			}).catch((err) => {
				console.error(err);
				res.redirect('/');
			});
		})
	});

	callback();
};
