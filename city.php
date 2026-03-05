<?php
// ── Base path (supports subdirectory installs, e.g. /dev/sundose) ─────────────
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');

// ── Load & find city ──────────────────────────────────────────────────────────
$citiesJson = file_get_contents(__DIR__ . '/data/cities.json');
$cities = json_decode($citiesJson, true);

$slug = preg_replace('/[^a-z0-9-]/', '', strtolower($_GET['slug'] ?? ''));
$city = null;
foreach ($cities as $c) {
    if ($c['slug'] === $slug) { $city = $c; break; }
}

if (!$city) {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Page not found — SunDose</title></head>';
    echo '<body style="font-family:sans-serif;text-align:center;padding:4rem">';
    echo '<h1>404 — Page not found</h1><p>This city does not exist in our database.</p>';
    echo '<a href="' . $basePath . '/">← Back to SunDose</a></body></html>';
    exit;
}

// ── Current month & seasonal data ────────────────────────────────────────────
try {
    $tz = new DateTimeZone($city['timezone']);
} catch (Exception $e) {
    $tz = new DateTimeZone('UTC');
}
$now = new DateTime('now', $tz);
$currentMonth = (int)$now->format('n'); // 1-12
$monthData    = $city['seasonal'][$currentMonth - 1];
$isSouth      = $city['hemisphere'] === 'south';
$isPolar      = $city['isPolar'];

// ── Month names ───────────────────────────────────────────────────────────────
$MONTHS = ['January','February','March','April','May','June',
           'July','August','September','October','November','December'];
$MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthName($m) {
    global $MONTHS;
    return $MONTHS[$m - 1];
}

// ── Convert UTC "HH:MM" to local time string ──────────────────────────────────
function utcToLocal($hhmm, DateTimeZone $tz, $month): string {
    if (!$hhmm) return '';
    try {
        $dt = new DateTime("2024-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-15 {$hhmm}:00", new DateTimeZone('UTC'));
        $dt->setTimezone($tz);
        return $dt->format('H:i');
    } catch (Exception $e) {
        return $hhmm;
    }
}

// ── Nearby cities (same continent, sorted by Haversine) ──────────────────────
function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $R    = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a    = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2)**2;
    return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
}
$nearby = [];
foreach ($cities as $c) {
    if ($c['slug'] === $slug) continue;
    if ($c['continent'] !== $city['continent']) continue;
    $nearby[] = ['city' => $c, 'dist' => (int)haversine($city['lat'], $city['lon'], $c['lat'], $c['lon'])];
}
usort($nearby, function($a, $b) { return $a['dist'] - $b['dist']; });
$nearby = array_slice($nearby, 0, 8);

// ── SEO copy ──────────────────────────────────────────────────────────────────
$cityFr  = htmlspecialchars($city['nameFr']);
$rawTitle = "Vitamin D in {$city['name']}: optimal sun windows — SunDose";
if (strlen($rawTitle) > 60) $rawTitle = "Vitamin D in {$city['name']} — SunDose";
$pageTitle = htmlspecialchars($rawTitle);

$peakM    = $city['seasonal'][$city['peakMonth'] - 1];
$peakMName = monthName($city['peakMonth']);
$hasBest  = count($city['bestMonths']) > 0;
$hasGood  = count($city['goodMonths']) > 0;

if ($hasBest) {
    $ptStart = utcToLocal($peakM['optimalStart'], $tz, $city['peakMonth']);
    $ptEnd   = utcToLocal($peakM['optimalEnd'],   $tz, $city['peakMonth']);
    $metaDesc = "When to get sun for vitamin D in {$city['name']}? "
              . "In {$peakMName}, optimal window {$ptStart}–{$ptEnd} "
              . "({$city['peakOptimalMinutes']} min). Real-time calculator + weather.";
} elseif ($hasGood) {
    $goodCount = count($city['goodMonths']);
    $metaDesc  = "Vitamin D sun windows in {$city['name']}: synthesis possible "
               . "{$goodCount} months a year. Calculate your optimal exposure "
               . "in real time with SunDose.";
} else {
    $metaDesc = "In {$city['name']} (lat. {$city['lat']}°), solar vitamin D "
              . "is limited. Find out when it's possible and when to supplement.";
}
if (strlen($metaDesc) > 155) $metaDesc = substr($metaDesc, 0, 152) . '…';
$metaDesc = htmlspecialchars($metaDesc);

$canonicalUrl = "https://www.sundose.org/{$city['countrySlug']}/{$city['slug']}/";
$latDir  = $city['lat'] >= 0 ? 'N' : 'S';
$lonDir  = $city['lon'] >= 0 ? 'E' : 'W';
$latAbs  = abs($city['lat']);
$lonAbs  = abs($city['lon']);

// ── FAQ (dynamic from seasonal data) ─────────────────────────────────────────
$estimMinutes = $peakM['peakUVI'] >= 1 ? round(60 / $peakM['peakUVI']) : null;

// Q1: best time
if ($hasBest) {
    $firstBest = monthName($city['bestMonths'][0]);
    $lastBest  = monthName(end($city['bestMonths']));
    $a1 = "In {$city['name']}, the best window is in {$peakMName} between {$ptStart} "
        . "and {$ptEnd} (local time). Across the year, optimal windows exist mainly "
        . "from {$firstBest} to {$lastBest} (around {$city['annualOptimalDays']} days).";
} elseif ($hasGood) {
    $firstGood = monthName($city['goodMonths'][0]);
    $lastGood  = monthName(end($city['goodMonths']));
    $a1 = "In {$city['name']}, synthesis is possible (reduced window, sun between 30° and 45°) "
        . "from {$firstGood} to {$lastGood}. The sun doesn't reach 45° at this latitude — "
        . "allow longer exposures (30–45 min).";
} else {
    $a1 = "In {$city['name']}, the sun stays too low to synthesise vitamin D significantly. "
        . "Supplementation is recommended year-round.";
}

// Q2: duration
if ($estimMinutes) {
    $a2 = "During the optimal window (UV index ~{$peakM['peakUVI']} in {$peakMName}), skin type III "
        . "(medium) needs about {$estimMinutes} minutes of arms and face exposed. "
        . "Darker skin types need 2–4× longer. Outside the optimal window, allow 30–45 minutes.";
} else {
    $a2 = "UV levels in {$city['name']} are insufficient for significant synthesis. "
        . "Regardless of exposure duration, vitamin D production remains very limited.";
}

// Q3: winter (adjusted for hemisphere)
$winterLabel = $isSouth ? 'in summer (northern hemisphere)' : 'in winter';
$winterMonths = $isSouth ? [6, 7, 8] : [12, 1, 2];
$winterGood = array_intersect($city['goodMonths'], $winterMonths);
if (count($winterGood) > 0) {
    $a3 = "Yes — {$city['name']} gets enough sun for some synthesis even during the coldest months. Check the monthly table for exact times.";
} elseif ($isPolar) {
    $a3 = "No. Like all polar cities, {$city['name']} has long periods with no synthesis possible. However, in summer the sun barely sets, offering very long exposure windows.";
} else {
    $winterStart = $isSouth ? 'June' : 'November';
    $winterEnd   = $isSouth ? 'August' : 'February';
    $a3 = "No. From {$winterStart} to {$winterEnd}, the sun stays too low for vitamin D synthesis in {$city['name']}. Supplementation is recommended during this period.";
}

// Q4: UV safety
$a4 = "In {$city['name']}, the UV index can reach {$city['maxPeakUVI']} in {$peakMName}. ";
if ($city['maxPeakUVI'] >= 8) {
    $a4 .= "These levels are high — don't exceed your synthesis time (≈{$estimMinutes} min) without SPF 30+ sunscreen. Apply protection immediately after.";
} elseif ($city['maxPeakUVI'] >= 5) {
    $a4 .= "These levels are moderate to high — apply SPF 30+ after your synthesis exposure.";
} else {
    $a4 .= "These levels are moderate — burn risk is low, but be cautious especially with fair skin.";
}

$faqItems = [
    ["When to get sun for vitamin D in {$city['name']}?", $a1],
    ["How many minutes of sun exposure for vitamin D in {$city['name']}?", $a2],
    ["Is there solar vitamin D {$winterLabel} in {$city['name']}?", $a3],
    ["Is sun exposure for vitamin D safe in {$city['name']}?", $a4],
];

// ── Intro card prose ──────────────────────────────────────────────────────────
if ($hasBest) {
    $introAnswer = "In <strong>{$peakMName}</strong>, between <strong>{$ptStart}</strong> and <strong>{$ptEnd}</strong>.";
    if ($city['annualOptimalDays'] >= 300) {
        $introProse = "With <strong>{$city['annualOptimalDays']} optimal days per year</strong>, {$city['name']} is among the world's best-positioned cities for solar vitamin D. The sun clears 45° — the minimum angle for effective UVB synthesis — for up to <strong>{$city['peakOptimalMinutes']} minutes</strong> on peak days. The monthly calendar below shows exact windows all year, and the live calculator lets you check right now.";
    } elseif ($city['annualOptimalDays'] >= 120) {
        $firstBestName = monthName($city['bestMonths'][0]);
        $lastBestName  = monthName(end($city['bestMonths']));
        $introProse = "Across the year, <strong>{$city['annualOptimalDays']} days</strong> reach the 45° solar elevation needed for optimal UVB synthesis — roughly {$firstBestName} to {$lastBestName}. Peak windows last up to <strong>{$city['peakOptimalMinutes']} minutes</strong>. The monthly calendar and live calculator below show you the exact picture.";
    } else {
        $firstBestName = monthName($city['bestMonths'][0]);
        $lastBestName  = monthName(end($city['bestMonths']));
        $introProse = "Optimal windows are seasonal here, concentrated between {$firstBestName} and {$lastBestName} (<strong>{$city['annualOptimalDays']} days/year</strong>). Outside this window, the sun doesn't reach 45° and synthesis slows significantly. Check the monthly calendar below for precise times.";
    }
    $introStat1Val   = $city['annualOptimalDays'];
    $introStat1Label = 'optimal days / year';
    $introStat2Val   = $city['peakOptimalMinutes'] . ' min';
    $introStat2Label = 'peak window in ' . $peakMName;
} elseif ($hasGood) {
    $firstGoodName = monthName($city['goodMonths'][0]);
    $lastGoodName  = monthName(end($city['goodMonths']));
    $introAnswer = "From <strong>{$firstGoodName}</strong> to <strong>{$lastGoodName}</strong> — reduced synthesis window.";
    $introProse  = "The sun reaches between 30° and 45° in {$city['name']} during these months, enabling vitamin D synthesis at a slower rate. <strong>Allow 30–45 minutes</strong> of exposure with arms and face exposed. The sun doesn't quite clear 45° at this latitude, so windows are less efficient but still meaningful. Full month-by-month breakdown below.";
    $peakExtMin  = $city['seasonal'][$city['peakMonth'] - 1]['extendedWindowMinutes'];
    $introStat1Val   = $city['annualExtendedDays'];
    $introStat1Label = 'synthesis days / year';
    $introStat2Val   = $peakExtMin . ' min';
    $introStat2Label = 'extended window in ' . $peakMName;
} else {
    $introAnswer = "Solar vitamin D is not available year-round here.";
    $introProse  = "In {$city['name']}, the sun never reaches 30° — the minimum elevation for meaningful UVB production. <strong>Vitamin D supplementation</strong> (800–2,000 IU/day) is the recommended alternative at this latitude. The live app below can still show you current UV conditions.";
    $introStat1Val   = 0;
    $introStat1Label = 'optimal days / year';
    $introStat2Val   = $monthData['maxElevation'] . '°';
    $introStat2Label = 'max solar elevation';
}
$introStat3Val   = number_format($latAbs, 1) . '°' . $latDir;
$introStat3Label = flagEmoji($city['countryCode']) . ' ' . htmlspecialchars($city['country']);

// ── JSON-LD ───────────────────────────────────────────────────────────────────
$cityJsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'City',
    'name'     => $city['name'],
    'url'      => $canonicalUrl,
    'containedInPlace' => [
        '@type' => 'Country',
        'name'  => $city['country'],
        'url'   => "https://www.sundose.org/{$city['countrySlug']}/",
    ],
    'geo' => [
        '@type'     => 'GeoCoordinates',
        'latitude'  => $city['lat'],
        'longitude' => $city['lon'],
    ],
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$faqJsonItems = array_map(function($f) {
    return [
        '@type'          => 'Question',
        'name'           => $f[0],
        'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]],
    ];
}, $faqItems);

$faqJsonLd = json_encode([
    '@context'   => 'https://schema.org',
    '@type'      => 'FAQPage',
    'mainEntity' => $faqJsonItems,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$breadcrumbJsonLd = json_encode([
    '@context'        => 'https://schema.org',
    '@type'           => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'SunDose',              'item' => 'https://www.sundose.org/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => htmlspecialchars($city['country']), 'item' => "https://www.sundose.org/{$city['countrySlug']}/"],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $city['name'],           'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// ── Flag emoji ────────────────────────────────────────────────────────────────
function flagEmoji(string $countryCode): string {
    $offset = 127397;
    $chars  = array_map(function($c) use ($offset) { return mb_chr(ord($c) + $offset); }, str_split(strtoupper($countryCode)));
    return implode('', $chars);
}

// ── Month table helpers ───────────────────────────────────────────────────────
function monthClass(array $m): string {
    if ($m['optimalWindowMinutes'] > 0) return 'opt';
    if ($m['hasVitaminD']) return 'ext';
    return 'none';
}
function monthBadge(array $m): string {
    if ($m['optimalWindowMinutes'] > 0) return '<span class="badge badge-opt">Optimal</span>';
    if ($m['hasVitaminD']) return '<span class="badge badge-ext">Reduced</span>';
    return '<span class="badge badge-none">—</span>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $pageTitle ?></title>
  <meta name="description" content="<?= $metaDesc ?>">
  <link rel="canonical" href="<?= htmlspecialchars($canonicalUrl) ?>">

  <!-- Open Graph -->
  <meta property="og:type"        content="article">
  <meta property="og:title"       content="<?= $pageTitle ?>">
  <meta property="og:description" content="<?= $metaDesc ?>">
  <meta property="og:url"         content="<?= htmlspecialchars($canonicalUrl) ?>">

  <!-- JSON-LD -->
  <script type="application/ld+json"><?= $cityJsonLd ?></script>
  <script type="application/ld+json"><?= $breadcrumbJsonLd ?></script>
  <script type="application/ld+json"><?= $faqJsonLd ?></script>

  <!-- Fonts & styles (same as main app) -->
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= $basePath ?>/styles/main.css">
  <link rel="stylesheet" href="<?= $basePath ?>/styles/pages.css">
</head>
<body>

<!-- Hero — identical structure to main app -->
<div class="hero">
  <div class="sun-visual">
    <div class="sun-rays"></div>
    <div class="sun-core"></div>
  </div>
  <a href="<?= $basePath ?>/" class="hero-brand">Sun<em>Dose</em></a>
  <h1>Best Time for Vitamin D in <em><?= htmlspecialchars($city['name']) ?></em></h1>
  <nav class="hero-breadcrumb" aria-label="Breadcrumb">
    <a href="<?= $basePath ?>/">SunDose</a> ›
    <a href="<?= $basePath ?>/<?= htmlspecialchars($city['countrySlug']) ?>/"><?= htmlspecialchars($city['country']) ?></a> ›
    <?= htmlspecialchars($city['name']) ?>
  </nav>
</div>

<div class="container">

  <!-- Intro answer card -->
  <div class="city-intro-card">
    <div class="intro-answer"><?= $introAnswer ?></div>
    <p class="intro-prose"><?= $introProse ?></p>
    <div class="intro-stats">
      <div class="intro-stat">
        <span class="intro-stat-val"><?= $introStat1Val ?></span>
        <span class="intro-stat-label"><?= $introStat1Label ?></span>
      </div>
      <div class="intro-stat">
        <span class="intro-stat-val"><?= $introStat2Val ?></span>
        <span class="intro-stat-label"><?= $introStat2Label ?></span>
      </div>
      <div class="intro-stat">
        <span class="intro-stat-val"><?= $introStat3Val ?></span>
        <span class="intro-stat-label"><?= $introStat3Label ?></span>
      </div>
    </div>
  </div>

  <!-- Current month window -->
  <div class="city-now-card">
    <h2>In <?= monthName($currentMonth) ?> in <?= htmlspecialchars($city['name']) ?></h2>
    <?php
    $optStart = utcToLocal($monthData['optimalStart'],  $tz, $currentMonth);
    $optEnd   = utcToLocal($monthData['optimalEnd'],    $tz, $currentMonth);
    $extStart = utcToLocal($monthData['extendedStart'], $tz, $currentMonth);
    $extEnd   = utcToLocal($monthData['extendedEnd'],   $tz, $currentMonth);
    ?>
    <?php if ($monthData['optimalWindowMinutes'] > 0): ?>
      <div class="now-window">
        <div class="now-slot">
          <div class="now-slot-label">☀️ Optimal window (sun ≥ 45°)</div>
          <div class="now-slot-time"><?= $optStart ?> – <?= $optEnd ?></div>
          <div class="now-slot-dur"><?= $monthData['optimalWindowMinutes'] ?> min · local time</div>
        </div>
        <?php if ($monthData['extendedWindowMinutes'] > $monthData['optimalWindowMinutes']): ?>
        <div class="now-slot">
          <div class="now-slot-label">🌤️ Extended window (sun ≥ 30°)</div>
          <div class="now-slot-time"><?= $extStart ?> – <?= $extEnd ?></div>
          <div class="now-slot-dur"><?= $monthData['extendedWindowMinutes'] ?> min</div>
        </div>
        <?php endif; ?>
      </div>
    <?php elseif ($monthData['hasVitaminD']): ?>
      <div class="now-window">
        <div class="now-slot">
          <div class="now-slot-label">🌤️ Reduced window (sun 30°–45°)</div>
          <div class="now-slot-time"><?= $extStart ?> – <?= $extEnd ?></div>
          <div class="now-slot-dur"><?= $monthData['extendedWindowMinutes'] ?> min · local time</div>
        </div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-soft);margin:0.5rem 0 0">Sun doesn't reach 45° this month (max <?= $monthData['maxElevation'] ?>°). Allow 30–45 min of exposure.</p>
    <?php else: ?>
      <p style="color:var(--text-soft)">No significant vitamin D synthesis this month. Max elevation: <?= $monthData['maxElevation'] ?>° (≥ 30° required).</p>
      <?php if (count($city['goodMonths']) > 0): ?>
      <p style="font-size:0.85rem;color:var(--text-muted)">Next possible window: <strong><?= monthName($city['goodMonths'][0]) ?></strong>.</p>
      <?php endif; ?>
    <?php endif; ?>
    <div class="now-uvi">Estimated UV in clear sky (<?= monthName($currentMonth) ?>): <strong><?= $monthData['peakUVI'] ?></strong> · Max elevation: <strong><?= $monthData['maxElevation'] ?>°</strong></div>
  </div>

  <!-- Annual calendar -->
  <div class="city-calendar">
    <h2>Annual vitamin D calendar</h2>
    <table class="month-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Max UV</th>
          <th>Optimal window (≥ 45°)</th>
          <th>Extended window (≥ 30°)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($city['seasonal'] as $m): ?>
        <?php
          $isCurrentM = $m['month'] === $currentMonth;
          $cls        = monthClass($m);
          $oStart     = utcToLocal($m['optimalStart'],  $tz, $m['month']);
          $oEnd       = utcToLocal($m['optimalEnd'],    $tz, $m['month']);
          $eStart     = utcToLocal($m['extendedStart'], $tz, $m['month']);
          $eEnd       = utcToLocal($m['extendedEnd'],   $tz, $m['month']);
        ?>
        <tr class="<?= $cls ?><?= $isCurrentM ? ' current-month' : '' ?>">
          <td><?= $MONTHS_SHORT[$m['month'] - 1] ?><?= $isCurrentM ? ' ←' : '' ?></td>
          <td><?= $m['peakUVI'] ?></td>
          <td><?= $m['optimalWindowMinutes'] > 0 ? "{$oStart} – {$oEnd} ({$m['optimalWindowMinutes']} min)" : '—' ?></td>
          <td><?= $m['hasVitaminD'] ? "{$eStart} – {$eEnd} ({$m['extendedWindowMinutes']} min)" : '—' ?></td>
          <td><?= monthBadge($m) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <div class="cal-legend">
      <span><span class="badge badge-opt">Optimal</span> Sun ≥ 45° — efficient synthesis</span>
      <span><span class="badge badge-ext">Reduced</span> Sun 30–45° — slow synthesis</span>
      <span><span class="badge badge-none">—</span> No synthesis</span>
    </div>
  </div>

  <!-- Live app CTA -->
  <div class="live-cta-card">
    <h2 class="live-cta-title">What about right now, in <?= htmlspecialchars($city['name']) ?>?</h2>
    <p class="live-cta-body">The calendar above shows typical windows based on solar geometry. Below, today's <strong>cloud cover</strong> and your <strong>skin type</strong> are factored in for a personalised dose recommendation — updated live.</p>
  </div>

  <!-- Live interactive app -->
  <div id="app">
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading live data…</p>
    </div>
  </div>

  <!-- Preseed: must come before main.js -->
  <script>
    window.__preseedLocation = {
      lat: <?= json_encode($city['lat']) ?>,
      lon: <?= json_encode($city['lon']) ?>,
      name: <?= json_encode($city['name']) ?>
    };
  </script>
  <script type="module" src="<?= $basePath ?>/js/main.js"></script>

  <!-- FAQ -->
  <div class="city-faq">
    <h2>Frequently asked questions</h2>
    <?php foreach ($faqItems as $faq): ?>
    <div class="faq-item">
      <h3><?= htmlspecialchars($faq[0]) ?></h3>
      <p><?= htmlspecialchars($faq[1]) ?></p>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Nearby cities -->
  <?php if (!empty($nearby)): ?>
  <div class="city-nearby">
    <h2>Nearby cities</h2>
    <div class="nearby-grid">
      <?php foreach ($nearby as $n): $nc = $n['city']; ?>
      <a href="<?= $basePath ?>/<?= htmlspecialchars($nc['countrySlug']) ?>/<?= htmlspecialchars($nc['slug']) ?>/" class="nearby-card">
        <div class="nearby-name"><?= htmlspecialchars($nc['nameFr']) ?></div>
        <div class="nearby-country"><?= htmlspecialchars($nc['countryFr']) ?> · <?= number_format($n['dist']) ?> km</div>
        <div class="nearby-peak">
          <?php if ($nc['peakOptimalMinutes'] > 0): ?>
            ☀️ Optimal in <?= monthName($nc['peakMonth']) ?> (<?= $nc['peakOptimalMinutes'] ?> min)
          <?php elseif ($nc['annualExtendedDays'] > 0): ?>
            🌤️ <?= $nc['annualExtendedDays'] ?> days / year
          <?php else: ?>
            Limited synthesis
          <?php endif; ?>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
  <?php endif; ?>

  <!-- Footer -->
  <div class="city-footer">
    <p><a href="<?= $basePath ?>/">SunDose — Home</a> · Solar calculations: NOAA algorithms · UV index: Madronich (2007) formula · Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0)</p>
    <p>These figures are indicative. Consult a healthcare professional for personalised advice.</p>
  </div>

</div><!-- /container -->
</body>
</html>
