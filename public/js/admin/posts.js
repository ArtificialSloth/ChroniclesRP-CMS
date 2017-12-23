$('.post-settings-form').submit((e) => {
	e.preventDefault();
	tinymce.triggerSave();

	var formData = $(e.target).serialize();
	crpAjax('/api/admin/edit-post', formData, (response) => {
		if (response) {			
			$('.' + response._id + ' .title').html(response.title);
			$('.' + response._id + ' .slug').html(response.slug);
			$(e.target).find('.post-saved').addClass('active');
			
			setTimeout(() => {
				$(e.target).find('.post-saved').removeClass('active');
			}, 5000);
		}
	});
});

function postsRemove(postid) {
	crpAjax('/api/admin/remove-post', {postid: postid}, (response) => {
		if (response) crpGetSubPage('/admin/posts', '.admin-content', true);
	});
}

$('.add-post form').submit((e) => {
	e.preventDefault();
	tinymce.triggerSave();
	
	var formData = $(e.target).serialize();
	crpAjax('/api/admin/add-post', formData, (response) => {
		if (response) crpGetSubPage('/admin/posts', '.admin-content', true);
	});
});