<?php
require __DIR__ . '/common.php';

read_json_body();
$_SESSION = [];
session_destroy();
send_json(['admin' => false]);
