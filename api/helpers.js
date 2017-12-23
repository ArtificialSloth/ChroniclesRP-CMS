module.exports = (crp) => {
	crp.handlebars.registerHelper('html', (html) => {
		return new crp.handlebars.SafeString(html);
	});
	
	crp.handlebars.registerHelper('dateToStr', (date) => {
		return crp.util.dateToStr(new Date(date));
	});
	
	crp.handlebars.registerHelper('tzSelect', () => {
		var accum = '';
		var names = crp.moment.tz.names();
		
		for (var i in names) {
			accum += '<option value="' + names[i] + '">' + names[i].replace('_', ' ') + '</option>';
		}
		
		return new crp.handlebars.SafeString(accum);
	});
	
	crp.handlebars.registerHelper('games', (options) => {
		var accum = '';
		
		for (var i = 0; i < crp.global.games.length; i++) {
			accum += options.fn({
				name: crp.global.games[i].name,
				icon: crp.global.games[i].icon,
				chapters: crp.util.filterObject(crp.global.chapters, 'game', crp.global.games[i].name)
			});
		}
		
		return accum;
	});
	
	crp.handlebars.registerHelper('ifPage', (url, req, options) => {
		if (url == req.url) {
			return options.fn(true);
		} else {
			return;
		}
	});
	
	crp.handlebars.registerHelper('render', (partial, req, _this) => {
		var rendered = crp.util.renderFile(crp.ROOT + '/views/partials/' + partial, {crp: crp, req: req, _this: _this});
		
		return new crp.handlebars.SafeString(rendered);
	});
	
	crp.handlebars.registerHelper('getContent', (req) => {		
		var page = crp.util.processPage(req.url, req);
		var rendered = crp.util.renderFile(crp.PAGESDIR + page.path, page.context);
		
		return new crp.handlebars.SafeString(rendered);
	});
	
	crp.util.requireFiles('/helpers.js');
};