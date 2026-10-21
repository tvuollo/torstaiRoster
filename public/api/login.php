<?php
require __DIR__ . '/common.php';

$body = read_json_body();
$hash = load_config()['password_hash'] ?? '';

if ($hash === '') {
    send_json(['error' => 'Salasanaa ei ole asetettu. Katso api/config.example.php.'], 500);
}

if (!password_verify((string)($body['password'] ?? ''), $hash)) {
    // Slow down guessing.
    sleep(1);
    send_json(['error' => 'Väärä salasana.'], 401);
}

session_regenerate_id(true);
$_SESSION['admin'] = true;
send_json(['admin' => true]);
