<?php
header('Content-Type: application/xml; charset=UTF-8');
$cities  = json_decode(file_get_contents(__DIR__ . '/data/cities.json'), true);
$baseUrl = 'https://www.sundose.org';
$lastmod = date('Y-m-01'); // first of current month — data updates seasonally

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

foreach ($cities as $c) {
    $url = $baseUrl . '/' . rawurlencode($c['countrySlug']) . '/' . rawurlencode($c['slug']) . '/';

    if ($c['population'] >= 5000000)     $priority = '0.9';
    elseif ($c['population'] >= 1000000) $priority = '0.8';
    elseif ($c['population'] >= 100000)  $priority = '0.7';
    else                                 $priority = '0.6';

    echo "  <url>\n";
    echo "    <loc>" . htmlspecialchars($url) . "</loc>\n";
    echo "    <lastmod>{$lastmod}</lastmod>\n";
    echo "    <changefreq>monthly</changefreq>\n";
    echo "    <priority>{$priority}</priority>\n";
    echo "  </url>\n";
}

echo '</urlset>';
