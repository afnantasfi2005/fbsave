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

const BROWSER_HEADERS = {
  'User-Agent': MOBILE_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Dest': 'document',
  'Referer': 'https://mbasic.facebook.com/',
};

function toMbasicUrl(inputUrl) {
  const u = new URL(inputUrl);
  u.hostname = 'mbasic.facebook.com';
  u.protocol = 'https:';
  return u.toString();
}

async function fetchHtml(url, referer) {
  const res = await fetch(url, {
    headers: referer ? { ...BROWSER_HEADERS, Referer: referer } : BROWSER_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) {
    const err = new Error(`Upstream responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return { html: await res.text(), finalUrl: res.url };
}

// "facebook.com/share/..." and "fb.watch/..." links are short redirect
// links that resolve to the real post URL only on the main www domain —
// mbasic often 400s on them directly. Resolve on www first, then hand the
// final canonical URL to mbasic for the actual scrape.
async function resolveToCanonicalUrl(inputUrl) {
  if (!/\/share\/|fb\.watch/i.test(inputUrl)) {
    return inputUrl;
  }
  const u = new URL(inputUrl);
  u.hostname = 'www.facebook.com';
  u.protocol = 'https:';
  const { finalUrl } = await fetchHtml(u.toString());
  return finalUrl;
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
    const canonicalUrl = await resolveToCanonicalUrl(url);
    const mbasicUrl = toMbasicUrl(canonicalUrl);
    const { html } = await fetchHtml(mbasicUrl, canonicalUrl);

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
    const status = err.status;
    const error = status
      ? `Facebook থেকে ডেটা আনা যায়নি (কোড ${status})। লিংকটি পাবলিক পোস্টের কিনা যাচাই করুন।`
      : 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।';
    return res.status(502).json({ error });
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
