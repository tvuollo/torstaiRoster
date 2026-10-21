# Torstai Roster

Splits the Thursday ice time sign-ups into two balanced teams, black and white.

## How it works

1. Copy the sign-up list from the Nimenhuuto event and paste it in. Names are matched to player profiles:
   exact name or alias first, then an initial ("Ville H" matches "Ville Hyötylä"), then a first name only
   one player has (shown in yellow so you can check it). Anything else becomes a guest you can fix, split
   or merge. "(MV)" marks a goalie, and goalies are left out of the teams.
2. Pick how Reidars are handled: no preference, split evenly, or all on black.
3. Generate. Teams are the same size, defensemen are split evenly (F/D players count half),
   and the totals of offense, defense, speed, skill and grit (1-3 each) are kept as close as possible.
   The pick is random among the near-best splits, so "Arvo uudelleen" gives a different but still balanced result.

Ratings are never shown on the roster page. They are edited in the admin view (`#admin`), behind a password.

## Development

```sh
npm install
npm run api   # PHP API on localhost:8000 (needs php)
npm run dev   # Vite dev server, proxies /api to the PHP server
npm test
```

For local admin login, create `public/api/config.php` as described below (it is gitignored).

## Test version on GitHub Pages

`.github/workflows/pages.yml` publishes a build without PHP to GitHub Pages on every push to `main`
(or by hand from the Actions tab). In that build the admin has no login and players are saved in
the browser only, so it is for trying things out, not for sharing ratings.
To use it, set **Settings → Pages → Source** to **GitHub Actions**. Pages on a free account needs a public repo.

To move the ratings to the real server, press **Vie tiedostoon** in the Pages admin to download
`players.json`. Then either press **Tuo tiedostosta** in the server's admin and **Tallenna**, or upload the
file to `api/data/players.json` on the server.

The same build can be made locally with `VITE_STORAGE=browser npm run build`.

## Deploying

Needs a web server with PHP 7.4+.

1. `npm run build` and upload the contents of `dist/` to the server folder (for example `torstai/`).
2. On the server, copy `api/config.example.php` to `api/config.php` and put a password hash in it:
   `php -r 'echo password_hash("your-password", PASSWORD_DEFAULT), "\n";'`
3. Make `api/data/` writable by the web server.

Saved players live in `api/data/players.json`, which is created on the first save from `players.seed.json`.
The previous version is kept as `players.previous.json`. When you deploy again, don't delete
`api/data/players.json` or `api/config.php` (for example, don't use `rsync --delete` on them).
