function crpAjax(url, data, successCallback) {
	$.ajax({
		url: url,
		method: 'POST',
		xhrFields: {withCredentials: true},
		data: data,
		success: successCallback,
		error: (jqXHR, status, error) => {
			console.log(status + ': ' + error);
		}
	});
}

function crpAjaxUpload(url, data, successCallback) {
	$.ajax({
		url: url,
		method: 'POST',
		xhrFields: {withCredentials: true},
		data: data,
		processData: false,
		contentType: false,
		success: successCallback,
		error: (jqXHR, status, error) => {
			console.log(status + ': ' + error);
		}
	});
}

function crpGetPage(page) {	
	$('.content-blackout').addClass('active');
	crpAjax('/api/get-page', {page: page}, (response) => {
		$('.content').html(response);
		$('.content-blackout').removeClass('active');
			
		window.history.pushState({page: page}, page + ' - The Chronicles RP', page);
	});
}

function crpGetSubPage(page, container, newUrl) {
	crpAjax('/api/get-subpage', {page: page}, (response) => {
		$(container).html(response);
		if (newUrl) window.history.pushState({page: page}, page + ' - The Chronicles RP', page);
	});
}

function crpTinyMCE(selector) {
	if (!selector) selector = '.tinymce';
	
	tinymce.init({
		selector: selector,
		plugins: 'textcolor colorpicker help link paste code hr table',
		forced_root_blocks: false,
		menubar: false,
		toolbar: [
			'undo | redo | paste | formatselect | fontselect | fontsizeselect | forecolor',
			'bold | italic | underline | strikethrough | hr | blockquote | table | alignleft | aligncenter | alignright | alignjustify | bullist | numlist | outdent | indent | superscript | subscript | link | removeformat | code | help'
		]
	});
}

window.onpopstate = (e) => {
	if (e.state) {
		var page = e.state.page;
		
		crpGetPage(page);
	}
};