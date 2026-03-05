<?php
// ── Base path (supports subdirectory installs) ─────────────────────────────
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');

// ── Load cities ────────────────────────────────────────────────────────────
$cities = json_decode(file_get_contents(__DIR__ . '/data/cities.json'), true);

// ── Find country by slug ───────────────────────────────────────────────────
$slug = preg_replace('/[^a-z0-9-]/', '', strtolower($_GET['slug'] ?? ''));
$countryCities = array_values(array_filter($cities, function($c) use ($slug) {
    return $c['countrySlug'] === $slug;
}));

if (empty($countryCities)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Page not found — SunDose</title></head>';
    echo '<body style="font-family:sans-serif;text-align:center;padding:4rem">';
    echo '<h1>404 — Page not found</h1><p>This country does not exist in our database.</p>';
    echo '<a href="' . $basePath . '/">← Back to SunDose</a></body></html>';
    exit;
}

// Sort cities by population descending
usort($countryCities, function($a, $b) { return $b['population'] - $a['population']; });

// ── Country metadata from first city ──────────────────────────────────────
$countryName    = $countryCities[0]['country'];
$countryCode    = $countryCities[0]['countryCode'];
$continent      = $countryCities[0]['continent'];

// ── Best season summary ────────────────────────────────────────────────────
// Count how many cities have optimal windows per month
$monthCounts = array_fill(1, 12, 0);
foreach ($countryCities as $c) {
    foreach ($c['bestMonths'] as $m) {
        $monthCounts[$m]++;
    }
}
$peakCountMonth = array_search(max($monthCounts), $monthCounts);

// Find overall best months (any city has optimal)
$countryBestMonths = [];
for ($m = 1; $m <= 12; $m++) {
    if ($monthCounts[$m] > 0) $countryBestMonths[] = $m;
}

// ── Total annual optimal days across all cities (average) ─────────────────
$avgOptimalDays = count($countryCities) > 0
    ? round(array_sum(array_column($countryCities, 'annualOptimalDays')) / count($countryCities))
    : 0;

// ── Current month ──────────────────────────────────────────────────────────
$currentMonth = (int)date('n');
$MONTHS = ['January','February','March','April','May','June',
           'July','August','September','October','November','December'];
$MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── SEO copy ───────────────────────────────────────────────────────────────
$cityCount = count($countryCities);
$rawTitle  = "Vitamin D in {$countryName}: sun windows by city — SunDose";
if (strlen($rawTitle) > 60) $rawTitle = "Vitamin D in {$countryName} — SunDose";
$pageTitle = htmlspecialchars($rawTitle);

if (!empty($countryBestMonths)) {
    $firstM = $MONTHS[$countryBestMonths[0] - 1];
    $lastM  = $MONTHS[end($countryBestMonths) - 1];
    $metaDesc = "Best time for vitamin D in {$countryName}: optimal sun exposure from {$firstM} to {$lastM}. "
              . "Real-time solar windows for {$cityCount} cities.";
} else {
    $metaDesc = "Solar vitamin D windows for {$cityCount} cities in {$countryName}. "
              . "Find optimal sun exposure times with real-time data from SunDose.";
}
if (strlen($metaDesc) > 155) $metaDesc = substr($metaDesc, 0, 152) . '…';
$metaDesc      = htmlspecialchars($metaDesc);
$canonicalUrl  = "https://www.sundose.org/{$slug}/";

// ── Flag emoji ─────────────────────────────────────────────────────────────
function flagEmoji(string $cc): string {
    $offset = 127397;
    $chars  = array_map(function($c) use ($offset) { return mb_chr(ord($c) + $offset); }, str_split(strtoupper($cc)));
    return implode('', $chars);
}

// ── JSON-LD ────────────────────────────────────────────────────────────────
$countryJsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'Country',
    'name'     => $countryName,
    'url'      => $canonicalUrl,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$breadcrumbJsonLd = json_encode([
    '@context'        => 'https://schema.org',
    '@type'           => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'SunDose',          'item' => 'https://www.sundose.org/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => $countryName,       'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);


// ── Monthly strength across cities ────────────────────────────────────────
$monthOptCount  = array_fill(1, 12, 0);
$monthGoodCount = array_fill(1, 12, 0);
foreach ($countryCities as $c) {
    foreach ($c['bestMonths'] as $m)  $monthOptCount[$m]++;
    foreach ($c['goodMonths'] as $m)  $monthGoodCount[$m]++;
}

// ── Capital city (fallback: most populous) ─────────────────────────────────
$capitalByCode = [
    'AU' => 'Canberra',    'BR' => 'Brasília',    'CA' => 'Ottawa',
    'IN' => 'New Delhi',   'MX' => 'Mexico City', 'US' => 'Washington',
    'ZA' => 'Pretoria',    'NG' => 'Abuja',       'PK' => 'Islamabad',
    'BD' => 'Dhaka',       'PH' => 'Manila',      'TH' => 'Bangkok',
    'MY' => 'Kuala Lumpur','TR' => 'Ankara',      'CH' => 'Bern',
];
$capitalCity = $countryCities[0]; // default: largest city
if (isset($capitalByCode[$countryCode])) {
    $capName = $capitalByCode[$countryCode];
    foreach ($countryCities as $c) {
        if (stripos($c['name'], $capName) !== false) { $capitalCity = $c; break; }
    }
}

// ── FAQ content ────────────────────────────────────────────────────────────
$MONTHS_FULL = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// Q1: best time
if (!empty($countryBestMonths)) {
    $firstBest = $MONTHS_FULL[$countryBestMonths[0] - 1];
    $lastBest  = $MONTHS_FULL[end($countryBestMonths) - 1];
    $peakMName = $MONTHS_FULL[$peakCountMonth - 1];
    $citiesInPeak = $monthOptCount[$peakCountMonth];
    $a1 = "The best months for vitamin D in {$countryName} are from {$firstBest} to {$lastBest}. "
        . "The peak is in {$peakMName}, when {$citiesInPeak} out of {$cityCount} tracked cities "
        . "have optimal windows (sun elevation ≥ 45°).";
} else {
    $goodMonthsList = [];
    for ($m = 1; $m <= 12; $m++) { if ($monthGoodCount[$m] > 0) $goodMonthsList[] = $MONTHS_FULL[$m-1]; }
    if (!empty($goodMonthsList)) {
        $a1 = "In {$countryName}, the sun doesn't reach 45° in most cities, but reduced synthesis "
            . "(30–45°) is possible in " . implode(', ', $goodMonthsList) . ". Allow 30–45 min exposure.";
    } else {
        $a1 = "Solar vitamin D synthesis is very limited year-round in {$countryName} due to high latitude. "
            . "Supplementation is recommended for most of the year.";
    }
}

// Q2: sunniest city
usort($countryCities, function($a, $b) { return $b['annualOptimalDays'] - $a['annualOptimalDays']; });
$sunniestCity = $countryCities[0];
usort($countryCities, function($a, $b) { return $b['population'] - $a['population']; }); // restore order
if ($sunniestCity['annualOptimalDays'] > 0) {
    $a2 = "{$sunniestCity['name']} leads with {$sunniestCity['annualOptimalDays']} optimal days per year "
        . "(sun ≥ 45°). The national average across tracked cities is ~{$avgOptimalDays} optimal days/year.";
} elseif ($sunniestCity['annualExtendedDays'] > 0) {
    $a2 = "{$sunniestCity['name']} has the most synthesis days ({$sunniestCity['annualExtendedDays']} days/yr), "
        . "though the sun stays below 45°. Allow longer exposures of 30–45 min.";
} else {
    $a2 = "No city in our {$countryName} dataset has sufficient solar elevation for significant vitamin D synthesis. "
        . "Year-round supplementation is advised.";
}

// Q3: winter
$winterMonths = [12, 1, 2];
$winterGoodCount = 0;
foreach ($winterMonths as $wm) { $winterGoodCount += $monthGoodCount[$wm]; }
if ($winterGoodCount > 0) {
    $a3 = "Yes — some cities in {$countryName} can produce vitamin D even in winter months "
        . "(December, January, February). Check individual city pages for exact windows, "
        . "as this varies significantly by latitude within the country.";
} else {
    $a3 = "No. During winter (December–February), the sun stays too low across all tracked cities "
        . "in {$countryName} for meaningful vitamin D synthesis. Supplementation (800–2000 IU/day) "
        . "is recommended during this period.";
}

// Q4: UV safety
$maxUVICity = $countryCities[0];
foreach ($countryCities as $c) { if ($c['maxPeakUVI'] > $maxUVICity['maxPeakUVI']) $maxUVICity = $c; }
$a4 = "Peak UV in {$countryName} reaches up to {$maxUVICity['maxPeakUVI']} (in {$maxUVICity['name']}). ";
if ($maxUVICity['maxPeakUVI'] >= 8) {
    $a4 .= "These levels are high — keep exposures short (10–20 min) and apply SPF 30+ immediately after your synthesis window.";
} elseif ($maxUVICity['maxPeakUVI'] >= 5) {
    $a4 .= "These levels are moderate to high — apply sunscreen after your synthesis exposure, especially in summer.";
} else {
    $a4 .= "UV levels are relatively moderate — burn risk is low, but fair-skinned people should still be cautious.";
}

$faqItems = [
    ["When is the best time for vitamin D in {$countryName}?", $a1],
    ["Which city in {$countryName} gets the most vitamin D sun?", $a2],
    ["Can you get vitamin D in {$countryName} in winter?", $a3],
    ["Is sun exposure for vitamin D safe in {$countryName}?", $a4],
];

// ── Intro card prose ──────────────────────────────────────────────────────────
// Re-sort for sunniest city lookup (restore population order after)
usort($countryCities, function($a, $b) { return $b['annualOptimalDays'] - $a['annualOptimalDays']; });
$sunniestCity = $countryCities[0];
usort($countryCities, function($a, $b) { return $b['population'] - $a['population']; });

if (!empty($countryBestMonths)) {
    $firstBestName  = $MONTHS[$countryBestMonths[0] - 1];
    $lastBestName   = $MONTHS[end($countryBestMonths) - 1];
    $peakMNameIntro = $MONTHS[$peakCountMonth - 1];
    $introAnswer = "From <strong>{$firstBestName}</strong> to <strong>{$lastBestName}</strong>, with the peak in <strong>{$peakMNameIntro}</strong>.";
    $introSunniest = $sunniestCity['annualOptimalDays'] > 0
        ? "<strong><a href=\"{$basePath}/{$slug}/{$sunniestCity['slug']}/\">{$sunniestCity['name']}</a></strong> leads with {$sunniestCity['annualOptimalDays']} optimal days/year"
        : "<strong>{$sunniestCity['name']}</strong> has the most synthesis days";
    $introProse = "Across {$cityCount} tracked cities, the national average is <strong>~{$avgOptimalDays} optimal days per year</strong> — days when the sun clears the 45° threshold needed for effective UVB synthesis. {$introSunniest}. Scroll down to explore the month-by-month breakdown and find your city.";
    $introStat1Val   = $avgOptimalDays;
    $introStat1Label = 'optimal days / year (avg)';
    $introStat2Val   = $sunniestCity['annualOptimalDays'];
    $introStat2Label = 'days/yr in ' . $sunniestCity['name'];
} else {
    $goodMonthsAll = [];
    for ($m = 1; $m <= 12; $m++) { if ($monthGoodCount[$m] > 0) $goodMonthsAll[] = $MONTHS[$m - 1]; }
    if (!empty($goodMonthsAll)) {
        $introAnswer = "Reduced synthesis possible from <strong>" . reset($goodMonthsAll) . "</strong> to <strong>" . end($goodMonthsAll) . "</strong>.";
        $introProse  = "The sun doesn't clear 45° in most cities in {$countryName}, but extended windows (30°–45°) allow some synthesis. Allow <strong>30–45 minutes</strong> of exposure during these months. The monthly chart below shows which months offer the best conditions.";
    } else {
        $introAnswer = "Solar vitamin D is very limited year-round in {$countryName}.";
        $introProse  = "At these latitudes, the sun rarely reaches the 30° minimum elevation for meaningful UVB synthesis. <strong>Vitamin D supplementation</strong> (800–2,000 IU/day) is recommended throughout the year for most residents.";
    }
    $introStat1Val   = 0;
    $introStat1Label = 'optimal days / year';
    $introStat2Val   = $sunniestCity['annualExtendedDays'];
    $introStat2Label = 'synthesis days/yr in ' . $sunniestCity['name'];
}
$introStat3Val   = $cityCount;
$introStat3Label = 'cities tracked · ' . flagEmoji($countryCode) . ' ' . htmlspecialchars($continent);

$faqJsonLd = json_encode([
    '@context'   => 'https://schema.org',
    '@type'      => 'FAQPage',
    'mainEntity' => array_map(function($f) {
        return ['@type' => 'Question', 'name' => $f[0],
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]];
    }, $faqItems),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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
  <script type="application/ld+json"><?= $countryJsonLd ?></script>
  <script type="application/ld+json"><?= $breadcrumbJsonLd ?></script>
  <script type="application/ld+json"><?= $faqJsonLd ?></script>

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
  <h1>Best Time for Vitamin D in <em><?= htmlspecialchars($countryName) ?></em></h1>
  <nav class="hero-breadcrumb" aria-label="Breadcrumb">
    <a href="<?= $basePath ?>/">SunDose</a> ›
    <?= htmlspecialchars($countryName) ?>
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

  <!-- Monthly strength bar chart -->
  <div class="month-bar-card">
    <h2>Optimal sun windows by month</h2>
    <div class="month-bars">
      <?php for ($m = 1; $m <= 12; $m++):
        $optC  = $monthOptCount[$m];
        $goodC = $monthGoodCount[$m];
        $optPct  = $cityCount > 0 ? round($optC  / $cityCount * 100) : 0;
        $goodPct = $cityCount > 0 ? round(($goodC - $optC) / $cityCount * 100) : 0;
        $isCurrent = $m === $currentMonth;
      ?>
      <div class="month-bar-wrap">
        <div class="month-bar-track">
          <?php if ($goodPct > 0): ?>
            <div class="month-bar-fill good" style="height:<?= $goodPct ?>%"></div>
          <?php endif; ?>
          <?php if ($optPct > 0): ?>
            <div class="month-bar-fill opt" style="height:<?= $optPct ?>%;margin-top:<?= $goodPct > 0 ? '2px' : '0' ?>"></div>
          <?php endif; ?>
          <?php if ($optPct === 0 && $goodPct === 0): ?>
            <div class="month-bar-fill none" style="height:8px"></div>
          <?php endif; ?>
        </div>
        <div class="month-bar-label <?= $isCurrent ? 'current' : '' ?>"><?= $MONTHS_SHORT[$m-1] ?></div>
      </div>
      <?php endfor; ?>
    </div>
    <div class="month-bar-legend">
      <span><span class="legend-dot" style="background:#4CAF50"></span>Optimal (≥ 45°)</span>
      <span><span class="legend-dot" style="background:#FF9800"></span>Reduced (30–45°)</span>
      <span>Bar height = % of cities with synthesis</span>
    </div>
  </div>

  <!-- City grid — horizontal scroll, 3 rows -->
  <div class="cities-card">
    <h2>All cities in <?= htmlspecialchars($countryName) ?> <span style="font-size:0.88rem;color:var(--text-muted);font-family:'DM Sans',sans-serif;font-weight:400">(<?= $cityCount ?>)</span></h2>
    <div class="cities-scroll-track">
      <?php foreach ($countryCities as $c):
        $peakMName = $MONTHS[$c['peakMonth'] - 1];
      ?>
      <a href="<?= $basePath ?>/<?= htmlspecialchars($c['countrySlug']) ?>/<?= htmlspecialchars($c['slug']) ?>/" class="city-card">
        <div class="city-card-name"><?= htmlspecialchars($c['name']) ?></div>
        <div class="city-card-peak">
          <?php if ($c['peakOptimalMinutes'] > 0): ?>
            Peak: <?= $peakMName ?> (<?= $c['peakOptimalMinutes'] ?> min)
          <?php elseif ($c['annualExtendedDays'] > 0): ?>
            <?= $c['annualExtendedDays'] ?> synthesis days / yr
          <?php else: ?>
            Limited synthesis
          <?php endif; ?>
        </div>
        <div class="city-card-months">
          <?php for ($m = 1; $m <= 12; $m++):
            $inOpt  = in_array($m, $c['bestMonths']);
            $inGood = in_array($m, $c['goodMonths']);
            $cls    = $inOpt ? 'opt' : ($inGood ? 'good' : 'none');
          ?>
          <span class="month-pip <?= $cls ?>" title="<?= $MONTHS_SHORT[$m-1] ?>"></span>
          <?php endfor; ?>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Live app CTA -->
  <div class="live-cta-card">
    <h2 class="live-cta-title">Get your exact window — wherever you are in <?= htmlspecialchars($countryName) ?></h2>
    <p class="live-cta-body">The data above shows averages across cities. Your real window depends on <strong>where you are today</strong>, current cloud cover, and your skin type. <?= htmlspecialchars($capitalCity['name']) ?> is loaded below — <strong>type your town to switch.</strong></p>
  </div>

  <div id="app">
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading live data…</p>
    </div>
  </div>

  <script>
    window.__preseedLocation = {
      lat: <?= json_encode($capitalCity['lat']) ?>,
      lon: <?= json_encode($capitalCity['lon']) ?>,
      name: <?= json_encode($capitalCity['name']) ?>
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

  <!-- Footer -->
  <div class="city-footer">
    <p><a href="<?= $basePath ?>/">SunDose — Home</a> · Solar calculations: NOAA algorithms · UV index: Madronich (2007) formula · Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0)</p>
    <p>These figures are indicative. Consult a healthcare professional for personalised advice.</p>
  </div>

</div><!-- /container -->
</body>
</html>
