function verifyLogin() {
	$('#register-form .user_login').parent().removeClass('error');
	
	if ($('#register-form .user_login').val().length < 4) {
		$('#register-form .user_login').parent().addClass('error');
		$('#register-form .user_login + .input-error').html('Username must be at least 4 characters!');
		return false;
	}
	
	return true;
}

function verifyEmail() {
	$('#register-form .user_email').parent().removeClass('error');
	
	if ($('#register-form .user_email').val() == '') {
		$('#register-form .user_email').parent().addClass('error');
		$('#register-form .user_email + .input-error').html('Email address cannot be empty!');
		return false;
	}
	
	return true;
}

function verifyPass() {
	$('#register-form .user_pass').parent().removeClass('error');
	
	if ($('#register-form .user_pass').val().length < 6) {
		$('#register-form .user_pass').parent().addClass('error');
		$('#register-form .user_pass + .input-error').html('Password must be at least 6 characters!');
		return false;
	}
	
	return true;
}

function confirmPass() {
	$('#register-form .user_pass_confirm').parent().removeClass('error');
	
	if ($('#register-form .user_pass_confirm').val() != $('#register-form .user_pass').val()) {
		$('#register-form .user_pass_confirm').parent().addClass('error');
		$('#register-form .user_pass_confirm + .input-error').html('Password mismatch!');
		return false;
	}
	
	return true;
}

$('#register-form .user_login').change(() => {
	verifyLogin();
});

$('#register-form .user_email').change(() => {
	verifyEmail();
});

$('#register-form .user_pass').change(() => {
	verifyPass();
});

$('#register-form .user_pass_confirm').change(() => {
	confirmPass();
});

$('#register-form').submit((e) => {
	e.preventDefault();
	
	if (!verifyLogin()) return;
	if (!verifyEmail()) return;
	if (!verifyPass()) return;
	if (!confirmPass()) return;
	
	var formData = $('#register-form').serialize();
	crpAjax('/api/register', formData, (response) => {
		$('#register-form .user_login').parent().removeClass('error');
		$('#register-form .user_email').parent().removeClass('error');
		$('#register-form .user_pass').parent().removeClass('error');
	
		if (response == 'noCaptcha') {
			$('#register-form .g-recaptcha').parent().addClass('error');
			$('#register-form .g-recaptcha + .input-error').html('Please click the captcha first.');
		} else if (response == 'loginLength') {
			$('#register-form .user_login').parent().addClass('error');
			$('#register-form .user_login + .input-error').html('Username must be at least 4 characters!');
		} else if (response == 'loginTaken') {
			$('#register-form .user_login').parent().addClass('error');
			$('#register-form .user_login + .input-error').html('Username is already in use!');
		} else if (response == 'passLength') {
			$('#register-form .user_pass').parent().addClass('error');
			$('#register-form .user_pass + .input-error').html('Password must be at least 6 characters!');
		} else if (response == 'emailInvalid') {
			$('#register-form .user_email').parent().addClass('error');
			$('#register-form .user_email + .input-error').html('Email address is invalid!');
		} else if (response == 'generic') {
			$('#register-form .user_login').parent().addClass('error');
			$('#register-form .user_login + .input-error').html('Something went wrong :(');
		} else {
			window.location.replace('/registered');
		}
	});
});