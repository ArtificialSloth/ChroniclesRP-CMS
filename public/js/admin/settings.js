$('.site-settings-form').submit((e) => {
	e.preventDefault();
	tinymce.triggerSave();
	
	var formData = $(e.target).serialize();
	crpAjax('/api/admin/edit-site', formData, (response) => {
		if (response.name) {
			$('.site-title a').html(response.name);
			$('.site-description').html(response.tagline);
			
			$(e.target).find('.site-saved').addClass('active');
			setTimeout(() => {
				$(e.target).find('.site-saved').removeClass('active');
			}, 5000);
		}
	});
});