$('.user-settings-form').submit((e) => {
	e.preventDefault();
	
	var formData = $(e.target).serialize();
	crpAjax('/api/admin/edit-user', formData, (response) => {
		if (response) {
			$('.' + response._id).removeClass('locked');
			$('.' + response._id).next().find('.user_locked').prop('checked', false);
			if (response.locked) {
				$('.' + response._id).addClass('locked');
				$('.' + response._id).next().find('.user_locked').prop('checked', true);
			}
			
			$('.' + response._id).next().find('.user_login').val(response.login);
			$('.' + response._id).next().find('.user_login').val(response.login);
			$('.' + response._id).next().find('.display_name').val(response.display_name);
			$('.' + response._id).next().find('.user_email').val(response.email);
			$('.' + response._id).next().find('.user_role').val(response.role);
			
			$('.' + response._id + ' .login').html(response.login);
			$('.' + response._id + ' .email').html(response.email);
			$('.' + response._id + ' .role').html(response.role);
			$(e.target).find('.user-saved').addClass('active');
			
			setTimeout(() => {
				$(e.target).find('.user-saved').removeClass('active');
			}, 5000);
		}
	});
});

function usersRemove(userid) {
	crpAjax('/api/admin/remove-user', {userid: userid}, (response) => {
		if (response) crpGetSubPage('/admin/users', '.admin-content', true);
	});
}

function usersToggleRoleFilter(tab, role) {	
	$('.users-menu .active').removeClass('active');
	$(tab).addClass('active');
	
	$('.users-content .table .active').removeClass('active');
	$('.users-content .table .' + role).addClass('active');
}

$('.add-user form').submit((e) => {
	e.preventDefault();
	
	var formData = $(e.target).serialize();
	crpAjax('/api/admin/add-user', formData, (response) => {
		if (response) crpGetSubPage('/admin/users', '.admin-content', true);
	});
});