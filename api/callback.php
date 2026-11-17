<?php
/**
 * GAMEHUB – OAuth-Callback
 *
 * Tauscht den Authorization-Code gegen Tokens beim Phoenixmagie-Provider
 * und übergibt sie an den Browser (localStorage), danach Weiterleitung zu /konto.
 *
 * Benötigte Umgebungsvariablen: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET
 */

declare(strict_types=1);

const OAUTH_ISSUER = 'https://phoenixmagie.vercel.app';
const REDIRECT_URI = 'https://games-phoenixmagie.vercel.app/api/callback';

function env(string $key): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? null;
    }
    return ($value === null || $value === '') ? null : (string) $value;
}

function json_error(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Einfacher HTTP-Request mit cURL (Fallback: Stream-Context).
 * @return array{status:int, body:string}
 */
function http_request(string $method, string $url, ?string $body = null, array $headers = []): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $response = curl_exec($ch);
        if ($response === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException('HTTP-Fehler: ' . $err);
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ['status' => $status, 'body' => (string) $response];
    }

    $context = stream_context_create(['http' => [
        'method'        => $method,
        'header'        => implode("\r\n", $headers),
        'content'       => $body ?? '',
        'timeout'       => 15,
        'ignore_errors' => true,
    ]]);
    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        throw new RuntimeException('HTTP-Fehler beim Abruf von ' . $url);
    }
    $status = 0;
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
            $status = (int) $m[1];
        }
    }
    return ['status' => $status, 'body' => $response];
}

/* ---------- Ablauf ---------- */

$code  = isset($_GET['code']) ? (string) $_GET['code'] : '';
$state = isset($_GET['state']) ? (string) $_GET['state'] : '';

if ($code === '') {
    json_error(400, ['error' => 'Missing authorization code']);
}

try {
    // Provider-Konfiguration laden
    $configUrl = OAUTH_ISSUER . '/.well-known/oauth.json';
    $configRes = http_request('GET', $configUrl, null, ['Accept: application/json']);
    if ($configRes['status'] < 200 || $configRes['status'] >= 300) {
        throw new RuntimeException('Failed to load OAuth config from ' . $configUrl);
    }
    $config = json_decode($configRes['body'], true);
    if (!is_array($config) || empty($config['token_endpoint'])) {
        throw new RuntimeException('Invalid OAuth config');
    }

    // Absoluten Token-Endpoint auflösen
    $tokenEndpoint = (string) $config['token_endpoint'];
    if (!preg_match('#^https?://#i', $tokenEndpoint)) {
        $base = rtrim((string) ($config['issuer'] ?? OAUTH_ISSUER), '/');
        $tokenEndpoint = $base . '/' . ltrim($tokenEndpoint, '/');
    }

    // Code gegen Tokens tauschen
    $payload = json_encode([
        'grant_type'    => 'authorization_code',
        'code'          => $code,
        'redirect_uri'  => REDIRECT_URI,
        'client_id'     => env('OAUTH_CLIENT_ID'),
        'client_secret' => env('OAUTH_CLIENT_SECRET'),
    ]);

    $tokenRes = http_request('POST', $tokenEndpoint, $payload, [
        'Content-Type: application/json',
        'Accept: application/json',
    ]);
    $tokenData = json_decode($tokenRes['body'], true);
} catch (Throwable $e) {
    json_error(500, [
        'error'   => 'Failed to exchange authorization code',
        'details' => $e->getMessage(),
    ]);
}

if ($tokenRes['status'] < 200 || $tokenRes['status'] >= 300 || !is_array($tokenData)) {
    json_error($tokenRes['status'] >= 400 ? $tokenRes['status'] : 502, is_array($tokenData) ? $tokenData : ['error' => 'Invalid token response']);
}

// Sicher in <script> einbettbar machen
$jsonFlags    = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES;
$accessToken  = json_encode((string) ($tokenData['access_token'] ?? ''), $jsonFlags);
$refreshToken = json_encode(isset($tokenData['refresh_token']) ? (string) $tokenData['refresh_token'] : null, $jsonFlags);
$stateJs      = json_encode($state, $jsonFlags);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <script src="/assets/js/device-guard.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#06020a">
  <title>Anmeldung · GAMEHUB</title>
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
  <main class="center-page">
    <div>
      <div class="spinner" aria-hidden="true"></div>
      <h1 class="page-title" style="font-size:20px" id="title">Anmeldung erfolgreich</h1>
      <p class="muted" id="msg">Du wirst zu deinem Konto weitergeleitet …</p>
    </div>
  </main>
  <script>
    (function () {
      var expected = null;
      try { expected = localStorage.getItem('oauth_state'); } catch (e) {}
      var received = <?= $stateJs ?>;
      if (expected && received && expected !== received) {
        document.getElementById('title').textContent = 'Anmeldung fehlgeschlagen';
        document.getElementById('msg').textContent = 'Sicherheitsprüfung ungültig. Bitte erneut anmelden.';
        setTimeout(function () { location.href = '/'; }, 3000);
        return;
      }
      try {
        localStorage.removeItem('oauth_state');
        localStorage.setItem('access_token', <?= $accessToken ?>);
        var refresh = <?= $refreshToken ?>;
        if (refresh) localStorage.setItem('refresh_token', refresh);
      } catch (e) {}
      location.replace('/#konto');
    })();
  </script>
</body>
</html>
