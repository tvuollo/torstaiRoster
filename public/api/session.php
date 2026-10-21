<?php
require __DIR__ . '/common.php';

send_json(['admin' => is_admin()]);
