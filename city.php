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
$rawTitle  = "What's the best time to get Vitamin D in {$city['name']}? — SunDose";
if (strlen($rawTitle) > 70) $rawTitle = "Vitamin D in {$city['name']} — SunDose";
$pageTitle = htmlspecialchars($rawTitle);

$peakM    = $city['seasonal'][$city['peakMonth'] - 1];
$peakMName = monthName($city['peakMonth']);
$hasBest  = count($city['bestMonths']) > 0;
$hasGood  = count($city['goodMonths']) > 0;

if ($hasBest) {
    $ptStart = utcToLocal($peakM['optimalStart'], $tz, $city['peakMonth']);
    $ptEnd   = utcToLocal($peakM['optimalEnd'],   $tz, $city['peakMonth']);
    $metaDesc = "Optimal Vitamin D windows in {$city['name']}: {$city['annualOptimalDays']} sunny days/year, "
              . "peak {$ptStart}–{$ptEnd} in {$peakMName}. Real-time UV data, cloud cover & skin-type calculator.";
} elseif ($hasGood) {
    $goodCount = count($city['goodMonths']);
    $metaDesc  = "When to get sun for Vitamin D in {$city['name']}? Synthesis possible {$goodCount} months/year. "
               . "Monthly solar windows, real-time UV index and personalised exposure times.";
} else {
    $metaDesc = "Solar Vitamin D is very limited in {$city['name']} — find out why, when it's marginally possible, "
              . "and how to supplement effectively. Real-time UV data with SunDose.";
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

// Q1 (removed — answered by intro card)

// Q2: duration
if ($estimMinutes) {
    $a2 = "In {$peakMName}, when UV peaks around {$peakM['peakUVI']}, someone with medium skin (type III) typically needs about {$estimMinutes} minutes outside — arms and face exposed, no sunscreen. Darker skin takes roughly 2–4 times longer to absorb the same amount. If you're out during the extended window when the sun's a bit lower, budget closer to 30–45 minutes.";
} else {
    $a2 = "Unfortunately, UV levels in {$city['name']} stay low enough that time alone won't compensate. Even a long exposure won't produce much vitamin D when the sun barely clears the horizon — the atmosphere filters out too much UVB.";
}

// Q3: winter (adjusted for hemisphere)
$winterLabel = $isSouth ? 'in summer (northern hemisphere)' : 'in winter';
$winterMonths = $isSouth ? [6, 7, 8] : [12, 1, 2];
$winterGood = array_intersect($city['goodMonths'], $winterMonths);
if (count($winterGood) > 0) {
    $a3 = "Surprisingly, yes — {$city['name']} gets enough direct sun for some synthesis even through the colder months. The windows get shorter, but they're there. Check the monthly table above for exact times.";
} elseif ($isPolar) {
    $a3 = "No — and the gaps can be long. That's just the reality of living this far from the equator. The flip side is that in summer the sun barely sets, giving you unusually wide synthesis windows each day. It balances out, in its own way.";
} else {
    $winterStart = $isSouth ? 'June' : 'November';
    $winterEnd   = $isSouth ? 'August' : 'February';
    $a3 = "Not really. From {$winterStart} to {$winterEnd}, the sun stays too low in {$city['name']} for meaningful synthesis — the atmosphere filters out most UVB at shallow angles. Supplementation (800–2,000 IU/day) is a practical option during those months.";
}

// Q4: UV safety
if ($city['maxPeakUVI'] >= 8) {
    $a4 = "Peak UV in {$city['name']} hits {$city['maxPeakUVI']} around {$peakMName} — high enough to burn fairly quickly. Stick to your synthesis window (~{$estimMinutes} min for medium skin), then put SPF 30+ on straight away. More time outside doesn't mean more vitamin D; it just means more burn risk.";
} elseif ($city['maxPeakUVI'] >= 5) {
    $a4 = "UV peaks around {$city['maxPeakUVI']} in {$peakMName} — moderate to high. Get your synthesis window in, then apply SPF 30+. It's not dangerously intense, but a bit of protection after your dose makes sense.";
} else {
    $a4 = "UV levels in {$city['name']} stay fairly moderate — a peak of around {$city['maxPeakUVI']}. Burn risk is relatively low, which is actually why synthesis takes longer here too. Fair-skinned people should still be a little mindful around midday in summer.";
}

// Q5: cloud cover
$a5 = "Yes, but maybe less than you'd expect. Thin cloud cover barely makes a dent — you're still getting around 90% of UVB on a lightly overcast day. Once you're into heavy overcast territory (75%+ cloud cover), it's a different story: you might need to stay out about twice as long for the same effect. On a genuinely grey day, it's often not worth it. The calculator below uses today's actual forecast for {$city['name']} so you don't have to guess.";

// Q6: window glass
$a6 = "Sadly, no. Glass blocks UVB almost entirely — the exact wavelength your skin needs to make vitamin D. Sitting in a sunny room with light streaming in feels nice, but it won't do anything for your levels. You need to actually be outside, skin exposed to real, unfiltered sky.";

// Q7: optimal vs extended window
if ($hasBest) {
    $a7 = "Think of it this way: the optimal window (sun above 45°) is when UVB punches through the atmosphere efficiently — 10–20 minutes is enough for most people with medium skin. The extended window (30–45°) is the sun at a shallower angle, working through more atmosphere. UVB is still there, just diluted. Same result in the end, you just need 30–45 minutes rather than 15. Below 30°, the path is too long and most UVB gets absorbed before it reaches you, regardless of how long you stay out.";
} else {
    $a7 = "In {$city['name']}, the sun doesn't consistently reach 45°, so the extended window (30–45°) is what you're working with. The UVB is there but at lower intensity — budget 30–45 minutes rather than the 10–20 a higher sun angle would need. And if the sun's below 30°, more time outside won't help: the atmosphere absorbs most of the UVB before it gets to you.";
}

$faqItems = [
    ["How many minutes of sun exposure for vitamin D in {$city['name']}?", $a2],
    ["Is there solar vitamin D {$winterLabel} in {$city['name']}?", $a3],
    ["Is sun exposure for vitamin D safe in {$city['name']}?", $a4],
    ["Does cloud cover affect vitamin D synthesis in {$city['name']}?", $a5],
    ["Can I get vitamin D through a window in {$city['name']}?", $a6],
    ["What's the difference between optimal and extended sun windows?", $a7],
];

// ── Intro card prose ──────────────────────────────────────────────────────────
// Current month window times
$todayOptStart = utcToLocal($monthData['optimalStart'],  $tz, $currentMonth);
$todayOptEnd   = utcToLocal($monthData['optimalEnd'],    $tz, $currentMonth);
$todayExtStart = utcToLocal($monthData['extendedStart'], $tz, $currentMonth);
$todayExtEnd   = utcToLocal($monthData['extendedEnd'],   $tz, $currentMonth);

if ($monthData['optimalWindowMinutes'] > 0) {
    $introSubtitle = "The best time today in <strong>" . htmlspecialchars($city['name']) . "</strong> to synthesize Vitamin D is from <strong>{$todayOptStart}</strong> to <strong>{$todayOptEnd}</strong>.";
} elseif ($monthData['hasVitaminD']) {
    $introSubtitle = "The best time today in <strong>" . htmlspecialchars($city['name']) . "</strong> to synthesize Vitamin D is from <strong>{$todayExtStart}</strong> to <strong>{$todayExtEnd}</strong> (reduced synthesis).";
} else {
    $introSubtitle = "No vitamin D synthesis window available this month in <strong>" . htmlspecialchars($city['name']) . "</strong>.";
}

$introH2 = "What's the best time to get Vitamin D in " . htmlspecialchars($city['name']) . "?";

if ($hasBest) {
    if ($city['annualOptimalDays'] >= 300) {
        $introProse = "With <strong>{$city['annualOptimalDays']} optimal days per year</strong>, {$city['name']} is among the world's best-positioned cities for solar vitamin D. The sun clears 45° — the minimum angle for effective UVB synthesis — for up to <strong>{$city['peakOptimalMinutes']} minutes</strong> on peak days. The monthly calendar below shows exact windows all year.";
    } elseif ($city['annualOptimalDays'] >= 120) {
        $firstBestName = monthName($city['bestMonths'][0]);
        $lastBestName  = monthName(end($city['bestMonths']));
        $introProse = "Across the year, <strong>{$city['annualOptimalDays']} days</strong> reach the 45° solar elevation needed for optimal UVB synthesis — roughly {$firstBestName} to {$lastBestName}. Peak windows last up to <strong>{$city['peakOptimalMinutes']} minutes</strong>. The monthly calendar below shows the exact picture.";
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
    $firstGoodName  = monthName($city['goodMonths'][0]);
    $lastGoodName   = monthName(end($city['goodMonths']));
    $peakExtStart   = utcToLocal($peakM['extendedStart'], $tz, $city['peakMonth']);
    $peakExtEnd     = utcToLocal($peakM['extendedEnd'],   $tz, $city['peakMonth']);
    $introProse     ="The sun reaches between 30° and 45° in {$city['name']} from {$firstGoodName} to {$lastGoodName}, enabling vitamin D synthesis at a slower rate. The sun doesn't quite clear 45° at this latitude, so windows are less efficient but still meaningful. Full month-by-month breakdown below.";
    $peakExtMin     = $peakM['extendedWindowMinutes'];
    $introStat1Val   = $city['annualExtendedDays'];
    $introStat1Label = 'synthesis days / year';
    $introStat2Val   = $peakExtMin . ' min';
    $introStat2Label = 'extended window in ' . $peakMName;
} else {
    $introProse    ="In {$city['name']}, the sun never reaches 30° — the minimum elevation for meaningful UVB production. <strong>Vitamin D supplementation</strong> (800–2,000 IU/day) is the recommended alternative at this latitude. The live app below can still show you current UV conditions.";
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

  <link rel="icon" href="<?= $basePath ?>/img/favicon.png" type="image/png">

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
  <h1>Vitamin D in <em><?= htmlspecialchars($city['name']) ?></em></h1>
  <nav class="hero-breadcrumb" aria-label="Breadcrumb">
    <a href="<?= $basePath ?>/">SunDose</a> ›
    <a href="<?= $basePath ?>/<?= htmlspecialchars($city['countrySlug']) ?>/"><?= htmlspecialchars($city['country']) ?></a> ›
    <?= htmlspecialchars($city['name']) ?>
  </nav>
</div>

<div class="container">

  <!-- Intro answer card -->
  <div class="city-intro-card">
    <h2 class="intro-h2"><?= $introH2 ?></h2>
    <div class="intro-answer"><?= $introSubtitle ?></div>
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
