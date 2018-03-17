module.exports = (crp, callback) => {
	crp.express.app.post('/api/add-chapter', (req, res) => {
		res.send('Yay!');
	});

	callback()
};
