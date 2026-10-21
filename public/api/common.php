<?php
// Shared helpers for the admin API: session, JSON responses and the player data file.

const DATA_DIR = __DIR__ . '/data';
const PLAYERS_FILE = DATA_DIR . '/players.json';
const SEED_FILE = DATA_DIR . '/players.seed.json';
const CONFIG_FILE = __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
]);
session_start();

function send_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function is_admin(): bool
{
    return !empty($_SESSION['admin']);
}

function require_admin(): void
{
    if (!is_admin()) {
        send_json(['error' => 'Kirjaudu ensin sisään.'], 401);
    }
}

// Writes must come as JSON. Browsers can't send that cross-site without a CORS preflight,
// which this API never answers, so together with the SameSite cookie this blocks CSRF.
function read_json_body()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_json(['error' => 'Method not allowed'], 405);
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        send_json(['error' => 'Expected JSON'], 415);
    }
    $body = json_decode(file_get_contents('php://input'), true);
    if ($body === null) {
        send_json(['error' => 'Invalid JSON'], 400);
    }
    return $body;
}

function load_config(): array
{
    if (!is_file(CONFIG_FILE)) {
        return [];
    }
    return require CONFIG_FILE;
}

function load_players(): array
{
    $file = is_file(PLAYERS_FILE) ? PLAYERS_FILE : SEED_FILE;
    return json_decode(file_get_contents($file), true) ?? [];
}

function save_players(array $players): void
{
    if (is_file(PLAYERS_FILE)) {
        copy(PLAYERS_FILE, DATA_DIR . '/players.previous.json');
    }
    $tmp = PLAYERS_FILE . '.tmp';
    $json = json_encode($players, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, PLAYERS_FILE)) {
        send_json(['error' => 'Tallennus epäonnistui. Onko api/data-kansio kirjoitettava?'], 500);
    }
}

function clean_rating($value): int
{
    return max(1, min(3, (int)$value));
}

// Keep only known fields with sane values, so a bad request can't break the data file.
function clean_players($input): array
{
    if (!is_array($input)) {
        send_json(['error' => 'Expected a list of players'], 400);
    }
    $players = [];
    $ids = [];
    foreach ($input as $player) {
        $name = trim((string)($player['Name'] ?? ''));
        $id = trim((string)($player['Id'] ?? ''));
        if ($name === '' || $id === '' || isset($ids[$id])) {
            send_json(['error' => "Pelaajalta puuttuu nimi tai sama tunnus on kahdesti: $name"], 400);
        }
        $ids[$id] = true;
        $ratings = $player['Ratings'] ?? [];
        $aliases = array_values(array_filter(array_map(
            fn($alias) => trim((string)$alias),
            is_array($player['Aliases'] ?? null) ? $player['Aliases'] : []
        ), fn($alias) => $alias !== ''));
        $players[] = [
            'Id' => mb_substr($id, 0, 100),
            'Name' => mb_substr($name, 0, 100),
            'Aliases' => $aliases,
            'Position' => in_array($player['Position'] ?? '', ['F', 'D', 'B'], true) ? $player['Position'] : 'F',
            'IsReidar' => !empty($player['IsReidar']),
            'IsPermaWhite' => !empty($player['IsPermaWhite']),
            'Ratings' => [
                'Offense' => clean_rating($ratings['Offense'] ?? 2),
                'Defense' => clean_rating($ratings['Defense'] ?? 2),
                'Speed' => clean_rating($ratings['Speed'] ?? 2),
                'Skill' => clean_rating($ratings['Skill'] ?? 2),
                'Grit' => clean_rating($ratings['Grit'] ?? 2),
            ],
        ];
    }
    usort($players, fn($a, $b) => strcmp($a['Name'], $b['Name']));
    return $players;
}
