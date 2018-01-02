module.exports = (crp) => {
	crp.util = {};
	
	crp.util.filterObject = (object, key, filter) => {
		var result = [];
		
		for (var k in object) {
			if (object[k][key] == filter) {
				result.push(object[k]);
			}
		}
		
		return result;
	};
		
	crp.util.findObjectInArray = (array, key, val) => {
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] == val) {
				return array[i];
			}
		}
	};
	
	crp.util.sanitizeObject = (object) => {
		for (var k in object) {
			if (typeof object[k] == 'object') {
				object[k] = crp.util.sanitizeObject(object[k]);
			} else {
				object[k] = crp.db.sanitize(object[k]);
			}
		}
		
		return object;
	};
	
	crp.util.dateToStr = (date) => {
		return crp.moment(date).utcOffset('-05:00').format('LLL');
	};
	
	crp.util.requireFiles = (file, callback) => {
		var files = crp.fs.readdirSync(crp.ROOT + '/api/');
			
		for (var i = 0; i < files.length; i++) {
			if (files[i].includes('.js')) continue;
			
			if (crp.fs.existsSync(crp.ROOT + '/api/' + files[i] + file)) {
				require(crp.ROOT + '/api/' + files[i] + file)(crp);
			}
		}
	};
	
	crp.util.renderFile = (path, context) => {
		var content = crp.fs.readFileSync(path + '.hbs', 'utf8');
				
		content = content.replace(/({{>)(.*)(}})/g, (match, p1, p2, p3) => {
			return crp.util.renderFile(crp.ROOT + '/views/partials/' + p2, context);
		});
						
		var rendered = crp.handlebars.compile(content)(context);
		
		return rendered;
	};
	
	crp.util.processPage = (path, req) => {		
		var context = {crp: crp, req: req};
		var page = crp.util.findObjectInArray(crp.global.pages, 'slug', path);
		var post = crp.util.findObjectInArray(crp.global.posts, 'slug', path);
		
		if (page) {
			var canView = true;
			if (page.role && !crp.util.userIsRole(req.user, page.role)) canView = false;
			
			if (canView || crp.util.isUserAdmin(req.user)) {
				path = page.path;
				if (page.context) context[page.context.key] = page.context.val;
				if (page.subPage) context.subPage = crp.util.renderFile(page.subPage, context);
			} else {
				path = '/404';
			}
		} else if (post) {
			path = '/posts/post';
			context['post'] = post;
		} else {
			path = '/404';
		}
		
		return {path: path, context: context};
	};
	
	crp.util.replaceFile = (oldFile, newFile, newPath) => {
		crp.fs.unlink(oldFile, (err) => {
			if (err) throw err;
		});
		
		crp.fs.rename(newFile, newPath, (err) => {
			if (err) throw err;
		});
	};
	
	crp.util.mail = (to, subject, msg) => {
		crp.mail.send({
			to: to,
			from: 'no_reply@chroniclesrp.com',
			subject: subject,
			text: msg,
			html: msg
		});
	};
		
	crp.util.requireFiles('/utils.js');
};