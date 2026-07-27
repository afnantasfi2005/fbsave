// DownFeed — Facebook video & photo extractor
// Node.js 18+ (uses built-in fetch)
// NOTE: flat structure — index.html and server.js sit in the same folder,
// so there's no "public/" subfolder to get lost during upload.

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36';

function toMbasicUrl(inputUrl) {
  const u = new URL(inputUrl);
  u.hostname = 'mbasic.facebook.com';
  return u.toString();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Upstream responded with ${res.status}`);
  }
  return res.text();
}

function unescapeFbUrl(raw) {
  return raw.replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/&amp;/g, '&');
}

function extractField(html, key) {
  const re = new RegExp(`"${key}":"(https:[^"]+?)"`);
  const match = html.match(re);
  return match ? unescapeFbUrl(match[1]) : null;
}

function extractPhotos(html) {
  const urls = new Set();
  const re = /"(?:image|photo_image)":\{"uri":"(https:[^"]+?)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    urls.add(unescapeFbUrl(m[1]));
  }
  return [...urls];
}

app.post('/api/extract', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'একটি লিংক দিন।' });
  }
  if (!/facebook\.com|fb\.watch/.test(url)) {
    return res.status(400).json({ error: 'শুধুমাত্র Facebook লিংক সাপোর্ট করা হয়।' });
  }

  try {
    const mbasicUrl = toMbasicUrl(url);
    const html = await fetchHtml(mbasicUrl);

    const hd = extractField(html, 'hd_src') || extractField(html, 'playable_url_quality_hd');
    const sd = extractField(html, 'sd_src') || extractField(html, 'playable_url');
    const photos = extractPhotos(html);

    if (!hd && !sd && photos.length === 0) {
      return res.status(422).json({
        error: 'কোনো মিডিয়া খুঁজে পাওয়া যায়নি। পোস্টটি হয়তো প্রাইভেট, অথবা লিংকটি ঠিক নেই।',
      });
    }

    return res.json({ hd, sd, photos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
  }
});

// Fallback: always serve index.html for the root route, so "Cannot GET /"
// can't happen even if static serving order ever misbehaves.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DownFeed server running on http://localhost:${PORT}`);
});
