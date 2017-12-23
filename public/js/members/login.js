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
		
		var formData = $('#login-form').serialize();
		crpAjax('/login', formData, (response) => {
			if (response.status === true) {
				location.reload();
			} else if (response.status == 'locked') {
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