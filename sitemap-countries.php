<?php
header('Content-Type: application/xml; charset=UTF-8');
$cities  = json_decode(file_get_contents(__DIR__ . '/data/cities.json'), true);
$baseUrl = 'https://www.sundose.org';
$lastmod = date('Y-m-01');

// Aggregate countries: count cities and sum population
$countries = [];
foreach ($cities as $c) {
    $cs = $c['countrySlug'];
    if (!isset($countries[$cs])) {
        $countries[$cs] = ['cityCount' => 0, 'totalPop' => 0];
    }
    $countries[$cs]['cityCount']++;
    $countries[$cs]['totalPop'] += $c['population'];
}

// Sort by total population descending
uasort($countries, function($a, $b) { return $b['totalPop'] - $a['totalPop']; });

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

foreach ($countries as $cs => $data) {
    $url = $baseUrl . '/' . rawurlencode($cs) . '/';

    // Priority: large countries with many cities rank higher
    if ($data['totalPop'] >= 50000000)     $priority = '0.9';
    elseif ($data['totalPop'] >= 10000000) $priority = '0.8';
    else                                   $priority = '0.7';

    echo "  <url>\n";
    echo "    <loc>" . htmlspecialchars($url) . "</loc>\n";
    echo "    <lastmod>{$lastmod}</lastmod>\n";
    echo "    <changefreq>monthly</changefreq>\n";
    echo "    <priority>{$priority}</priority>\n";
    echo "  </url>\n";
}

echo '</urlset>';
