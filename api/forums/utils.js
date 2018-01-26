module.exports = (crp) => {
	crp.util.getForums = (filter) => {		
		var forums = crp.global.forums;
		
		if (filter) {
			forums = crp.util.filterObject(forums, filter[0], filter[1].toString());
		}
		
		forums.sort((a, b) => {
			return a.order - b.order;
		});
		
		return forums;
	};
	
	crp.util.getForumsByCategory = (category) => {		
		return crp.util.getForums(['category', category]);
	};
};