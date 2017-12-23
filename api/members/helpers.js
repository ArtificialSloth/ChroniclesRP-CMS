module.exports = (crp) => {
	crp.handlebars.registerHelper('userLogin', (userid) => {
		if (userid) {
			return crp.util.getUserData(userid).login;
		}
	});
	
	crp.handlebars.registerHelper('userDisplayName', (userid) => {
		if (userid) {
			return crp.util.getUserData(userid).display_name;
		}
	});
	
	crp.handlebars.registerHelper('userNicename', (userid) => {
		if (userid) {
			return crp.util.getUserData(userid).nicename;
		}
	});
	
	crp.handlebars.registerHelper('ifIsUser', (user, req, options) => {
		if (req.user == user._id.toString() || crp.util.isUserAdmin(req.user)) {
			return options.fn({crp: crp, req: req, user: user});
		}
	});
	
	crp.handlebars.registerHelper('ifPending', (userid, req, options) => {
		if (options && crp.util.userIsRole(userid, 'pending')) {
			return options.fn({crp: crp, req: req});
		} else {
			return;
		}
	});
	
	crp.handlebars.registerHelper('ifMember', (userid, req, options) => {
		if (options && crp.util.userIsRole(userid, 'member')) {
			return options.fn({crp: crp, req: req});
		} else {
			return;
		}
	});
	
	crp.handlebars.registerHelper('ifChapterLeader', (userid, req, options) => {	
		if (options && crp.util.userIsRole(userid, 'chapter_leader')) {
			return options.fn({crp: crp, req: req});
		} else {
			return;
		}
	});
	
	crp.handlebars.registerHelper('ifAdmin', (userid, req, options) => {
		if (options && crp.util.isUserAdmin(userid)) {
			return options.fn({crp: crp, req: req});
		} else {
			return;
		}
	});
	
	crp.handlebars.registerHelper('ifHasMembers', (role, req, options) => {
		if (options && role == '*') {
			return options.fn({crp: crp, req: req, users: crp.util.getUsers()});
		} else if (options && crp.util.roleHasUsers(role)) {
			return options.fn({crp: crp, req: req, users: crp.util.getUsersByRole(role)});
		} else {
			return;
		}
	});
};