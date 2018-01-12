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

$('.user-settings-form').submit((e) => {
	e.preventDefault();

	var formData = new FormData(e.target);
	crpAjaxUpload('/api/admin/edit-user', formData, (response) => {
		$('.user-settings-form .user_email').parent().removeClass('error');
		$('.user-settings-form .old_pass').parent().removeClass('error');
		$('.user-settings-form .new_pass').parent().removeClass('error');
		$('.user-settings-form .confirm_new_pass').parent().removeClass('error');
		
		if (response == 'emailInvalid') {
			$('.user-settings-form .user_email').parent().addClass('error');
			$('.user-settings-form .user_email + .input-error').html('Email address invalid!');
		} else if (response == 'passMismatch') {
			$('.user-settings-form .old_pass').parent().addClass('error');
			$('.user-settings-form .old_pass + .input-error').html('Wrong password!');
		} else if (response == 'passLength') {
			$('.user-settings-form .new_pass').parent().addClass('error');
			$('.user-settings-form .new_pass + .input-error').html('New password must be at least 6 characters!');
		} else if (response == 'newPassMismatch') {
			$('.user-settings-form .confirm_new_pass').parent().addClass('error');
			$('.user-settings-form .confirm_new_pass + .input-error').html('Passwords don\'t match!');
		} else if (response == 'hashingError') {
			$('.user-settings-form .new_pass').parent().addClass('error');
			$('.user-settings-form .new_pass + .input-error').html('Something went wrong!');
		} else {
			location.assign('/logout');
		}
	});
});

$(() => {
	$('.user_timezone').val($('.timezone').val());
	$('.user_gender').val($('.gender').val());
});