$('.user-account-form').submit((e) => {
	e.preventDefault();
	tinymce.triggerSave();
	
	var formData = new FormData(e.target);
	crpAjaxUpload('/api/admin/edit-user', formData, (response) => {
		$('.user-account-form .user_dob').parent().removeClass('error');
		$('.user-account-form .user_timezone').parent().removeClass('error');
		$('.user-account-form .user_gender').parent().removeClass('error');
		$('.user-account-form .display_name').parent().removeClass('error');
		$('.user-account-form .profile_pic').parent().removeClass('error');
		$('.user-account-form .cover_pic').parent().removeClass('error');
			
		if (typeof response != 'object') {
			if (response == 'dobInvalid') {
				$('.user-account-form .user_dob').parent().addClass('error');
				$('.user-account-form .user_dob + .input-error').html('Invalid date!');
			} else if (response == 'tzInvalid') {
				$('.user-account-form .user_timezone').parent().addClass('error');
				$('.user-account-form .user_timezone + .input-error').html('Timezone invalid!');
			} else if (response == 'genderInvalid') {
				$('.user-account-form .user_gender').parent().addClass('error');
				$('.user-account-form .user_gender + .input-error').html('Gender invalid!');
			} else if (response == 'profileTooLarge') {
				$('.user-account-form .profile_pic').parent().addClass('error');
				$('.user-account-form .profile_pic + .input-error').html('File size must me < 2 MB');
			} else if (response == 'coverTooLarge') {
				$('.user-account-form .cover_pic').parent().addClass('error');
				$('.user-account-form .cover_pic + .input-error').html('File size must me < 2 MB');
			} else {
				$('.user-account-form .display_name').parent().addClass('error');
				$('.user-account-form .display_name + .input-error').html('Something went wrong :(');
			}
		} else {
			crpGetPage('/members/' + response.nicename + '/account');
		}
	});
});

$(() => {
	$('.user_timezone').val($('.timezone').val());
	$('.user_gender').val($('.gender').val());
});