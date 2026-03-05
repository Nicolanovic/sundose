<?php
header('Content-Type: application/xml; charset=UTF-8');
$baseUrl = 'https://www.sundose.org';
$lastmod = date('Y-m-01');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

$sitemaps = [
    '/sitemap-countries.xml',
    '/sitemap-cities.xml',
];

foreach ($sitemaps as $path) {
    echo "  <sitemap>\n";
    echo "    <loc>" . htmlspecialchars($baseUrl . $path) . "</loc>\n";
    echo "    <lastmod>{$lastmod}</lastmod>\n";
    echo "  </sitemap>\n";
}

echo '</sitemapindex>';
