module.exports = (crp) => {
	function SocketAPI() {};
	
	SocketAPI.io = require('socket.io').listen(crp.express.app.server);

	return SocketAPI;
};