$(() => {
	$('#login-form').submit((e) => {
		e.preventDefault();
		$('#login-form #user_login').removeClass('input-error');
		$('#login-form #user_pass').removeClass('input-error');
		
		if ($('#login-form #user_login').val() == '') {
			$('#login-form #user_login').addClass('input-error');
			loginShowError('Username field cannot be empty!');
			return;
		}
		if ($('#login-form #user_pass').val().length < 6) {
			$('#login-form #user_pass').addClass('input-error');
			loginShowError('Passwords must be at least 6 characters!');
			return;
		}
		
		var formData = $(e.target).serialize();
		crpAjax('/login', formData, (response) => {
			if (response == 'valid') {
				location.reload();
			} else if (response == 'tooMany') {
				loginShowError('Too many failed login attempts. Please wait 5 minutes then try again.');
			} else if (response == 'locked') {
				loginShowError('Your account has been locked.');
			} else {
				loginShowError('Incorrect username or password');
			}
		});
	});
	
	function loginShowError(msg) {
		$('#login').addClass('error');
		$('#login .error-message').html(msg);
		$('#login .error-message').addClass('wiggle');
		setTimeout(() => {
			$('#login .error-message').removeClass('wiggle');
		}, 500)
	}
});