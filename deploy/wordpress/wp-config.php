<?php
define('DB_NAME', 'NICENAME');
define('DB_USER', 'NICENAME');
define('DB_PASSWORD', 'PASS');
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

SALT

$table_prefix  = 'wp_';

define('WP_DEBUG', false);
define('FS_METHOD', 'direct');

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
