<?php
/**
 * FO Simulator — trigger update.sh dari UI (tanpa ScriptAlias/CGI).
 * Letakkan sejajar index.html & update.sh.
 *
 * POST ./update.php
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

// Unduh zip GitHub bisa >30s (default max_execution_time)
@set_time_limit(0);
@ini_set('max_execution_time', '0');
ignore_user_abort(true);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST' && $method !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$dir = __DIR__;
$script = $dir . DIRECTORY_SEPARATOR . 'update.sh';

if (!is_file($script)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'update.sh tidak ditemukan']);
    exit;
}

if (!is_executable($script)) {
    @chmod($script, 0755);
}

// Jangan wariskan REQUEST_METHOD ke bash (supaya update.sh mode CLI, bukan CGI)
$cmd = sprintf(
    'cd %s && env -u REQUEST_METHOD -u GATEWAY_INTERFACE -u SCRIPT_FILENAME /bin/bash %s --force 2>&1',
    escapeshellarg($dir),
    escapeshellarg($script)
);

$output = [];
$exitCode = 0;
exec($cmd, $output, $exitCode);
$text = implode("\n", $output);

$version = null;
$versionFile = $dir . DIRECTORY_SEPARATOR . 'version.json';
if (is_file($versionFile)) {
    $json = json_decode((string) file_get_contents($versionFile), true);
    if (is_array($json) && isset($json['version'])) {
        $version = (string) $json['version'];
    }
}

if ($exitCode !== 0) {
    $error = 'update.sh gagal (exit ' . $exitCode . ')';
    if (preg_match('/^ERROR:\s*(.+)$/m', $text, $m)) {
        $error = trim($m[1]);
    } elseif ($text !== '') {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $text)), 'strlen'));
        if ($lines) {
            $error .= ': ' . $lines[count($lines) - 1];
        }
    }

    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $error,
        'detail' => $text,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'ok' => true,
    'version' => $version,
    'log' => $text,
], JSON_UNESCAPED_UNICODE);
