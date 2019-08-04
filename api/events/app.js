module.exports = (crp, callback) => {
	crp.app.post('/api/add-event', (req, res) => {
		crp.users.findById(req.user, (err, user) => {
			if (err) return res.send(err);
			if (!user) return res.send('noUser');
			req.body.creator = user._id;

			crp.chapters.findById(req.body.chapter, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');

				var member = chapter.getMember(user._id);
				if ((!member || member.role < 2) && user.role < 3) return res.send('notAllowed');

				new crp.events(req.body).save((err, event) => {
					if (err) return res.send(err);

					crp.events.addJobs(event);
					res.send(true);
				});
			});
		});
	});

	crp.app.post('/api/remove-event', (req, res) => {
		crp.events.findById(req.body.eventid, (err, event) => {
			if (err) return res.send(err);
			if (!event) return res.send('noEvent');

			crp.users.findById(event.creator, (err, creator) => {
				if (err) return res.send(err);
				if (!creator) return res.send('noUser');

				crp.users.findById(req.user, (err, user) => {
					if (err) return res.send(err);
					if ((!user || !user._id.equals(creator._id)) || user.role < 3) return res.send('notAllowed');

					crp.events.deleteOne({_id: event._id}, (err) => {
						if (err) return res.send(err);

						for (var i in crp.events.jobs[req.body.eventid]) {
							crp.events.jobs[req.body.eventid][i].stop();
						}
						delete crp.events.jobs[req.body.eventid];

						res.send(true);
					});
				});
			});
		});
	});

	crp.app.post('/api/rsvp-event', (req, res) => {
		crp.events.findById(req.body.eventid, (err, event) => {
			if (err) return res.send(err);
			if (!event) return res.send('noEvent');

			crp.chapters.findById(event.chapter, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');

				crp.users.findById(event.creator, (err, creator) => {
					if (err) return res.send(err);
					if (!creator) return res.send('noUser');

					crp.users.findById(req.user, (err, user) => {
						if (err) return res.send(err);
						if (!user || user._id.equals(creator._id) || crp.moment().isAfter(event.startDate)) return res.send('notAllowed');
						if (event.rsvp && crp.util.idInArray(event.rsvp, user._id)) return res.send('alreadyGoing');

						var eventData = {rsvp: event.rsvp ? event.rsvp.concat([user._id]) : [user._id]};
						crp.events.updateOne({_id: event._id}, eventData, {runValidators: true}, (err) => {
							if (err) return res.send(err);

							var msg = `**${user.display_name}** is going to **${chapter.name}** event: ***${event.name}***.\nYou can RSVP to this event here: https://chroniclesrp.com/events/${event._id}`;
							crp.discord.send(msg, process.env.DISCORD_GENERAL, (err, result) => {
								if (err) return res.send(err);

								res.send(true);
							});
						});
					});
				});
			});
		});
	});

	crp.app.post('/api/unrsvp-event', (req, res) => {
		crp.events.findById(req.body.eventid, (err, event) => {
			if (err) return res.send(err);
			if (!event) return res.send('noEvent');

			crp.chapters.findById(event.chapter, (err, chapter) => {
				if (err) return res.send(err);
				if (!chapter) return res.send('noChapter');

				crp.users.findById(req.user, (err, user) => {
					if (err) return res.send(err);
					if (!user) return res.send('notAllowed');
					if (!event.rsvp || !crp.util.idInArray(event.rsvp, user._id)) return res.send('notGoing');

					event.rsvp.splice(crp.util.indexOfId(event.rsvp, user._id), 1);
					var eventData = {rsvp: event.rsvp};
					crp.events.updateOne({_id: event._id}, eventData, {runValidators: true}, (err) => {
						if (err) return res.send(err);

						var msg = `**${user.display_name}** is no longer going to **${chapter.name}** event: ***${event.name}***.\nSee event details here: https://chroniclesrp.com/events/${event._id}`;
						crp.discord.send(msg, process.env.DISCORD_GENERAL, (err, result) => {
							if (err) return res.send(err);

							res.send(true);
						});
					});
				});
			});
		});
	});

	callback();
};
