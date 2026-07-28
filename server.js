// DownFeed — Facebook video & photo extractor
// Node.js 18+ (uses built-in fetch)
// NOTE: flat structure — index.html and server.js sit in the same folder,
// so there's no "public/" subfolder to get lost during upload.

const express = require('express');
const path = require('path');
const { Readable } = require('stream');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// ---------------------------------------------------------------------
// Primary extraction: a third-party RapidAPI service.
// Why: Facebook actively blocks direct scraping from cloud/datacenter
// IPs (like Render's) — that's what was causing the earlier 400 errors.
// This API already handles that problem on their end, so it's far more
// reliable than us scraping Facebook's HTML directly.
//
// Setup: sign up at rapidapi.com, subscribe to "Facebook Audio/Video
// Downloader" (by mahmudulhasandev) — the free tier is enough to start —
// then set RAPIDAPI_KEY as an environment variable on Render
// (Dashboard -> your service -> Environment -> Add Environment Variable).
// ---------------------------------------------------------------------

const RAPIDAPI_HOST = 'all-in-one-video-downloader1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Response shape from this API: { videos: [{ resolution: "720x1280", url, ext, ... }, ...] }
// Rank by pixel area so the biggest resolution becomes "hd" and the next becomes "sd".
function resolutionArea(resolution) {
  if (!resolution) return 0;
  const [w, h] = resolution.split('x').map(Number);
  return (w || 0) * (h || 0);
}

async function extractViaRapidApi(url) {
  const endpoint = `https://${RAPIDAPI_HOST}/download?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
  });

  if (!res.ok) {
    const err = new Error(`RapidAPI responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (data.error) {
    const err = new Error(data.message || 'RapidAPI reported an error');
    err.status = 422;
    throw err;
  }

  const videos = [...(data.videos || [])].sort(
    (a, b) => resolutionArea(b.resolution) - resolutionArea(a.resolution)
  );
  const audios = data.audios || [];

  const hd = videos[0]?.url || null;
  const audio = audios[0]?.url || null;

  return { hd, audio, photos: [] };
}

// ---------------------------------------------------------------------
// Fallback / photo support: best-effort scrape of mbasic.facebook.com.
// This RapidAPI is video/audio-focused, so we still try our own scrape
// for photo posts, and as a backup if RAPIDAPI_KEY isn't set yet.
// ---------------------------------------------------------------------

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

async function extractViaScrape(url) {
  const canonicalUrl = await resolveToCanonicalUrl(url);
  const mbasicUrl = toMbasicUrl(canonicalUrl);
  const { html } = await fetchHtml(mbasicUrl, canonicalUrl);

  const hd = extractField(html, 'hd_src') || extractField(html, 'playable_url_quality_hd');
  const sd = extractField(html, 'sd_src') || extractField(html, 'playable_url');
  const photos = extractPhotos(html);

  return { hd, sd, photos };
}

app.post('/api/extract', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a link.' });
  }
  if (!/facebook\.com|fb\.watch/.test(url)) {
    return res.status(400).json({ error: 'Only Facebook links are supported.' });
  }

  let result = { hd: null, audio: null, photos: [] };
  let lastError = null;

  if (RAPIDAPI_KEY) {
    try {
      result = await extractViaRapidApi(url);
    } catch (err) {
      console.error('RapidAPI extraction failed:', err);
      lastError = err;
    }
  }

  // Try the scrape too -- either as the only method (no API key set yet),
  // or just to pick up photos the video API doesn't return.
  if (!RAPIDAPI_KEY || !result.hd || result.photos.length === 0) {
    try {
      const scraped = await extractViaScrape(url);
      result = {
        hd: result.hd || scraped.hd,
        audio: result.audio,
        photos: result.photos.length ? result.photos : scraped.photos,
      };
    } catch (err) {
      console.error('Scrape fallback failed:', err);
      lastError = lastError || err;
    }
  }

  if (!result.hd && result.photos.length === 0) {
    const status = lastError && lastError.status;
    const error = status
      ? `Could not fetch data from Facebook (code ${status}). Check that the link is a public post.`
      : 'No media found. The post may be private, or the link is incorrect.';
    return res.status(502).json({ error });
  }

  return res.json(result);
});

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

async function downloadToFile(url, filePath) {
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    throw new Error(`Could not fetch ${url} (${upstream.status})`);
  }
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filePath);
    Readable.fromWeb(upstream.body).pipe(fileStream);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

function safeUnlink(filePath) {
  fs.unlink(filePath, () => {});
}

// Proxy download: forces a real download (Content-Disposition: attachment)
// for cross-origin media URLs, and — when a separate audio-only stream is
// given via ?audio= — merges video + audio into one MP4 with ffmpeg before
// sending it. Facebook/Instagram often serve video and audio as separate
// DASH streams, so without this the downloaded video has no sound.
app.get('/api/download', async (req, res) => {
  const { url, audio, filename } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url');
  }

  const safeName = (filename || 'downfeed-video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');

  // No separate audio track -- just stream the file straight through.
  if (!audio || typeof audio !== 'string') {
    try {
      const upstream = await fetch(url);
      if (!upstream.ok || !upstream.body) {
        return res.status(502).send('Could not fetch the file.');
      }
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (err) {
      console.error('Download proxy failed:', err);
      res.status(502).send('Download failed.');
    }
    return;
  }

  // Separate audio track -- download both, mux with ffmpeg, stream the result.
  const tmpId = crypto.randomBytes(8).toString('hex');
  const videoPath = path.join(os.tmpdir(), `downfeed-${tmpId}-video.mp4`);
  const audioPath = path.join(os.tmpdir(), `downfeed-${tmpId}-audio.m4a`);
  const outPath = path.join(os.tmpdir(), `downfeed-${tmpId}-out.mp4`);

  try {
    await Promise.all([downloadToFile(url, videoPath), downloadToFile(audio, audioPath)]);

    // -c copy: just repackage the streams together, no re-encoding --
    // fast and keeps the original quality.
    await runFfmpeg([
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c', 'copy',
      '-map', '0:v:0',
      '-map', '1:a:0',
      outPath,
    ]);

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    const stat = fs.statSync(outPath);
    res.setHeader('Content-Length', stat.size);

    const readStream = fs.createReadStream(outPath);
    readStream.pipe(res);
    readStream.on('close', () => {
      safeUnlink(videoPath);
      safeUnlink(audioPath);
      safeUnlink(outPath);
    });
  } catch (err) {
    console.error('Merge download failed:', err);
    safeUnlink(videoPath);
    safeUnlink(audioPath);
    safeUnlink(outPath);
    res.status(502).send('Could not prepare the video with sound. Please try again.');
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
  if (!RAPIDAPI_KEY) {
    console.log('NOTE: RAPIDAPI_KEY is not set -- running on the scrape-only fallback.');
  }
});
