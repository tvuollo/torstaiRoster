<?php
// GET: everyone gets the player list. POST: admin saves the whole list.
require __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_json(load_players());
}

require_admin();
$players = clean_players(read_json_body());
save_players($players);
send_json($players);
