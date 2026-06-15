const express   = require('express');
const router    = express.Router();
const RSSParser = require('rss-parser');
const { protect } = require('../middleware/auth');

const parser = new RSSParser();

// Cache: 15 minutes per feed
const cache = {};

const FEEDS = {
  international: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.cnn.com/rss/edition_world.rss'
  ],
  national: [
    'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms',
    'https://www.thehindu.com/news/national/feeder/default.rss'
  ],
  community: [
    // Add your community website RSS feed URL here
    'https://www.baps.org/RSSfeed.aspx'
  ]
};

async function fetchFeed(url) {
  const now = Date.now();
  if (cache[url] && now - cache[url].ts < 15 * 60 * 1000) return cache[url].data;
  try {
    const feed = await parser.parseURL(url);
    const data = feed.items.slice(0, 12).map(item => ({
      title:       item.title,
      link:        item.link,
      summary:     item.contentSnippet || item.summary || '',
      pubDate:     item.pubDate,
      image:       item.enclosure?.url || item['media:thumbnail']?.['$']?.url || '',
      categories:  item.categories || []
    }));
    cache[url] = { data, ts: now };
    return data;
  } catch {
    return [];
  }
}

// GET /api/news?type=international|national|community
router.get('/', protect, async (req, res) => {
  try {
    const type  = req.query.type || 'international';
    const urls  = FEEDS[type] || FEEDS.international;
    const results = await Promise.all(urls.map(fetchFeed));
    const items = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
