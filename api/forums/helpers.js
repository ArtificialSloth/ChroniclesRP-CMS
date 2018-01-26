module.exports = (crp) => {
	crp.handlebars.registerHelper('eachForumByCategory', (categoryid, options) => {
		var accum = '';
		
		var forums = crp.util.getForumsByCategory(categoryid);
		
		for (var i in forums) {
			accum += options.fn(forums[i]);
		}
		
		return accum;
	});
};