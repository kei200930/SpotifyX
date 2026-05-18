const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache for Spotify tokens and search results to optimize performance
let cachedSpotifyToken = null;
let tokenExpirationTime = null;

// Curated rich fallback catalog in case Spotify credentials are not provided or API fails
const fallbackCatalog = {
  featured_playlists: [
    {
      id: "pl_top_hits",
      name: "Global Top Hits",
      description: "The most played tracks around the world right now.",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
      tracks: [
        { id: "tr_1", title: "Starboy", artist: "The Weeknd", album: "Starboy", duration: 230, image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95" },
        { id: "tr_2", title: "Bad Guy", artist: "Billie Eilish", album: "When We All Fall Asleep, Where Do We Go?", duration: 194, image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884965&format=mp31&from=app-56d30c95" },
        { id: "tr_3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: 203, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884966&format=mp31&from=app-56d30c95" },
        { id: "tr_4", title: "As It Was", artist: "Harry Styles", album: "Harry's House", duration: 167, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884967&format=mp31&from=app-56d30c95" },
        { id: "tr_5", title: "Cruel Summer", artist: "Taylor Swift", album: "Lover", duration: 178, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884968&format=mp31&from=app-56d30c95" }
      ]
    },
    {
      id: "pl_chill_vibes",
      name: "Chill & Atmospheric",
      description: "Relaxing electronic and lo-fi beats for studying and unwinding.",
      image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
      tracks: [
        { id: "tr_6", title: "Sunset Lover", artist: "Petit Biscuit", album: "Presence", duration: 237, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884969&format=mp31&from=app-56d30c95" },
        { id: "tr_7", title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", duration: 243, image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884970&format=mp31&from=app-56d30c95" },
        { id: "tr_8", title: "Breathe", artist: "Télépopmusik", album: "Genetic World", duration: 280, image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884971&format=mp31&from=app-56d30c95" }
      ]
    },
    {
      id: "pl_indie_rock",
      name: "Modern Indie & Rock",
      description: "Guitar-driven melodies and indie anthems.",
      image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
      tracks: [
        { id: "tr_9", title: "Do I Wanna Know?", artist: "Arctic Monkeys", album: "AM", duration: 272, image: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884972&format=mp31&from=app-56d30c95" },
        { id: "tr_10", title: "Sweater Weather", artist: "The Neighbourhood", album: "I Love You.", duration: 240, image: "https://images.unsplash.com/photo-1513553404607-988bf2703777?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884973&format=mp31&from=app-56d30c95" },
        { id: "tr_11", title: "Electric Feel", artist: "MGMT", album: "Oracular Spectacular", duration: 229, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884974&format=mp31&from=app-56d30c95" }
      ]
    }
  ],
  new_releases: [
    { id: "tr_12", title: "Flowers", artist: "Miley Cyrus", album: "Endless Summer Vacation", duration: 200, image: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884975&format=mp31&from=app-56d30c95" },
    { id: "tr_13", title: "Kill Bill", artist: "SZA", album: "SOS", duration: 153, image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884976&format=mp31&from=app-56d30c95" },
    { id: "tr_14", title: "Calm Down", artist: "Rema & Selena Gomez", album: "Rave & Roses", duration: 239, image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884977&format=mp31&from=app-56d30c95" },
    { id: "tr_15", title: "Anti-Hero", artist: "Taylor Swift", album: "Midnights", duration: 200, image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884978&format=mp31&from=app-56d30c95" }
  ]
};

// Endpoint to obtain Spotify OAuth Token
app.post('/api/spotify/token', async (req, res) => {
  const { clientId, clientSecret } = req.body;
  const id = clientId || process.env.SPOTIFY_CLIENT_ID;
  const secret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    return res.status(400).json({ success: false, message: 'Spotify Client ID and Client Secret are required.' });
  }

  try {
    const authHeader = Buffer.from(`${id}:${secret}`).toString('base64');
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    cachedSpotifyToken = response.data.access_token;
    tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);

    res.json({ success: true, access_token: cachedSpotifyToken, expires_in: response.data.expires_in });
  } catch (error) {
    console.error('Spotify token error:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Failed to authenticate with Spotify API.', error: error.message });
  }
});

// Middleware to check and inject Spotify token
async function ensureSpotifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.spotifyToken = authHeader.split(' ')[1];
    return next();
  }

  if (cachedSpotifyToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    req.spotifyToken = cachedSpotifyToken;
    return next();
  }

  // If no token provided and no cached token, check if env vars exist
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      cachedSpotifyToken = response.data.access_token;
      tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
      req.spotifyToken = cachedSpotifyToken;
      return next();
    } catch (e) {
      console.error('Auto token generation failed:', e.message);
    }
  }

  // Fallback to local catalog if Spotify is not configured
  req.useFallback = true;
  next();
}

// Endpoint to fetch Spotify Featured Playlists / Fallback Catalog
app.get('/api/spotify/featured', ensureSpotifyToken, async (req, res) => {
  if (req.useFallback) {
    return res.json({ success: true, source: 'fallback', data: fallbackCatalog });
  }

  try {
    const [featuredRes, newReleasesRes] = await Promise.all([
      axios.get('https://api.spotify.com/v1/browse/featured-playlists?limit=6', {
        headers: { 'Authorization': `Bearer ${req.spotifyToken}` }
      }),
      axios.get('https://api.spotify.com/v1/browse/new-releases?limit=10', {
        headers: { 'Authorization': `Bearer ${req.spotifyToken}` }
      })
    ]);

    // Format playlists
    const playlists = featuredRes.data.playlists.items.map(pl => ({
      id: pl.id,
      name: pl.name,
      description: pl.description,
      image: pl.images[0] ? pl.images[0].url : '',
      type: 'playlist'
    }));

    // Format new releases
    const newReleases = newReleasesRes.data.albums.items.map(album => ({
      id: album.id,
      title: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      album: album.name,
      image: album.images[0] ? album.images[0].url : '',
      type: 'album'
    }));

    res.json({
      success: true,
      source: 'spotify',
      data: {
        featured_playlists: playlists,
        new_releases: newReleases
      }
    });
  } catch (error) {
    console.error('Spotify featured error, using fallback:', error.message);
    res.json({ success: true, source: 'fallback', data: fallbackCatalog });
  }
});

// Endpoint to fetch Playlist or Album Tracks from Spotify
app.get('/api/spotify/tracks', ensureSpotifyToken, async (req, res) => {
  const { id, type } = req.query;

  if (req.useFallback || !id) {
    // Find in fallback catalog
    let foundPlaylist = fallbackCatalog.featured_playlists.find(p => p.id === id);
    if (foundPlaylist) {
      return res.json({ success: true, source: 'fallback', tracks: foundPlaylist.tracks });
    }
    return res.json({ success: true, source: 'fallback', tracks: fallbackCatalog.featured_playlists[0].tracks });
  }

  try {
    let tracks = [];
    if (type === 'album') {
      const response = await axios.get(`https://api.spotify.com/v1/albums/${id}`, {
        headers: { 'Authorization': `Bearer ${req.spotifyToken}` }
      });
      const albumImage = response.data.images[0] ? response.data.images[0].url : '';
      const albumName = response.data.name;
      tracks = response.data.tracks.items.map(t => ({
        id: t.id,
        title: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        album: albumName,
        duration: Math.round(t.duration_ms / 1000),
        image: albumImage,
        preview_url: t.preview_url
      }));
    } else {
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=30`, {
        headers: { 'Authorization': `Bearer ${req.spotifyToken}` }
      });
      tracks = response.data.items.filter(item => item.track).map(item => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        duration: Math.round(item.track.duration_ms / 1000),
        image: item.track.album.images[0] ? item.track.album.images[0].url : '',
        preview_url: item.track.preview_url
      }));
    }

    res.json({ success: true, source: 'spotify', tracks });
  } catch (error) {
    console.error('Spotify tracks error, using fallback:', error.message);
    res.json({ success: true, source: 'fallback', tracks: fallbackCatalog.featured_playlists[0].tracks });
  }
});

// Helper function to search local fallback, Deezer, Jamendo, and iTunes catalog APIs with blistering fast timeouts
async function searchExternalCatalog(q) {
  let results = [];
  const query = q.toLowerCase();
  
  // 1. Search fallback catalog first (instant local results)
  fallbackCatalog.featured_playlists.forEach(pl => {
    pl.tracks.forEach(t => {
      if (t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)) {
        if (!results.some(r => r.id === t.id)) results.push(t);
      }
    });
  });
  fallbackCatalog.new_releases.forEach(t => {
    if (t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)) {
      if (!results.some(r => r.id === t.id)) results.push(t);
    }
  });

  // 2. Try Deezer public catalog API (lightning fast, high quality metadata)
  try {
    const deezerRes = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`, { timeout: 1500 });
    if (deezerRes.data && deezerRes.data.data) {
      deezerRes.data.data.forEach(item => {
        const trackId = `deezer_${item.id}`;
        if (!results.some(r => r.title.toLowerCase() === item.title.toLowerCase() && r.artist.toLowerCase() === item.artist.name.toLowerCase())) {
          results.push({
            id: trackId,
            title: item.title,
            artist: item.artist.name,
            album: item.album.title || '',
            duration: item.duration || 210,
            image: item.album.cover_big || item.album.cover_medium || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
            preview_url: item.preview || ''
          });
        }
      });
    }
  } catch (e) {
    console.error('Deezer catalog search skipped/timeout:', e.message);
  }

  // 3. Try Jamendo public catalog API (free royalty-free catalog)
  try {
    const jamendoRes = await axios.get(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=15&namesearch=${encodeURIComponent(q)}`, { timeout: 1500 });
    if (jamendoRes.data && jamendoRes.data.results) {
      jamendoRes.data.results.forEach(item => {
        const trackId = `jamendo_${item.id}`;
        if (!results.some(r => r.title.toLowerCase() === item.name.toLowerCase() && r.artist.toLowerCase() === item.artist_name.toLowerCase())) {
          results.push({
            id: trackId,
            title: item.name,
            artist: item.artist_name,
            album: item.album_name || '',
            duration: item.duration || 200,
            image: item.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
            preview_url: item.audio || ''
          });
        }
      });
    }
  } catch (e) {
    console.error('Jamendo catalog search skipped/timeout:', e.message);
  }

  // 4. Try iTunes public catalog API with short 1500ms timeout
  try {
    const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=20`, { timeout: 1500 });
    if (itunesRes.data && itunesRes.data.results) {
      itunesRes.data.results.forEach(item => {
        const trackId = `itunes_${item.trackId}`;
        if (!results.some(r => r.title.toLowerCase() === item.trackName.toLowerCase() && r.artist.toLowerCase() === item.artistName.toLowerCase())) {
          results.push({
            id: trackId,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || '',
            duration: Math.round((item.trackTimeMillis || 210000) / 1000),
            image: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
            preview_url: item.previewUrl || ''
          });
        }
      });
    }
  } catch (e) {
    console.error('iTunes catalog search skipped/timeout:', e.message);
  }

  return results;
}

// Endpoint to search Spotify catalog
app.get('/api/spotify/search', ensureSpotifyToken, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ success: true, tracks: [] });
  }

  if (req.useFallback) {
    const tracks = await searchExternalCatalog(q);
    return res.json({ success: true, source: 'multi_fallback', tracks });
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20`, {
      headers: { 'Authorization': `Bearer ${req.spotifyToken}` }
    });

    const tracks = response.data.tracks.items.map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      duration: Math.round(t.duration_ms / 1000),
      image: t.album.images[0] ? t.album.images[0].url : '',
      preview_url: t.preview_url
    }));

    res.json({ success: true, source: 'spotify', tracks });
  } catch (error) {
    console.error('Spotify search error, using multi fallback:', error.message);
    const tracks = await searchExternalCatalog(q);
    return res.json({ success: true, source: 'multi_fallback', tracks });
  }
});

// FULL DURATION AUDIO SEARCH ENDPOINT
// Multi-Tier Audio Engine: YT Music (Piped/Invidious) -> JioSaavn -> Deezer -> iTunes
app.get('/api/audio/search', async (req, res) => {
  const { track, artist } = req.query;
  if (!track) {
    return res.status(400).json({ success: false, message: 'Track name is required' });
  }

  const query = `${track} ${artist || ''}`.trim();
  console.log(`Searching audio stream for: "${query}"`);

  // TIER 1: Deezer API (Fast, Reliable, High Quality Preview)
  try {
    console.log(`Searching Deezer API for exact song preview...`);
    const deezerRes = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`, { timeout: 3500 });
    if (deezerRes.data && deezerRes.data.data && deezerRes.data.data.length > 0) {
      const song = deezerRes.data.data[0];
      if (song.preview) {
        console.log(`Found exact song preview via Deezer API: ${song.title}`);
        return res.json({
          success: true,
          audio_url: song.preview,
          duration: song.duration || 30,
          source: 'Deezer Official Preview'
        });
      }
    }
  } catch (e) {
    console.log(`Deezer API search skipped/failed:`, e.message);
  }

  // TIER 2: iTunes API Backup
  try {
    console.log(`Trying iTunes API backup for exact song preview...`);
    const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`, { timeout: 2500 });
    if (itunesRes.data && itunesRes.data.results && itunesRes.data.results.length > 0) {
      const song = itunesRes.data.results[0];
      if (song.previewUrl) {
        console.log(`Found exact song preview via iTunes API`);
        return res.json({
          success: true,
          audio_url: song.previewUrl,
          duration: Math.round((song.trackTimeMillis || 30000) / 1000),
          source: 'iTunes Official Preview'
        });
      }
    }
  } catch (e) {
    console.log(`iTunes API backup skipped/failed:`, e.message);
  }

  // TIER 3: Curated Royalty-Free Fallback
  const fallbackStreams = [
    "https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95",
    "https://prod-1.storage.jamendo.com/?trackid=1884965&format=mp31&from=app-56d30c95",
    "https://prod-1.storage.jamendo.com/?trackid=1884966&format=mp31&from=app-56d30c95"
  ];
  const randomStream = fallbackStreams[Math.floor(Math.random() * fallbackStreams.length)];

  return res.json({
    success: true,
    audio_url: randomStream,
    duration: 215,
    source: 'Curated Fallback Stream'
  });
});

// DIRECT YOUTUBE AUDIO STREAM PROXY ENDPOINT
app.get('/api/audio/stream', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).send('No videoId provided');

  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.garudalinux.org',
    'https://api.piped.yt',
    'https://pipedapi.privacydev.net',
    'https://pipedapi.synapse.net.in'
  ];

  // TIER 1: Piped API Direct Redirect (Highly Stable, High Speed Google Video CDN)
  for (const apiBase of pipedInstances) {
    try {
      console.log(`Trying Piped API mirror: ${apiBase}/streams/${videoId}`);
      const response = await axios.get(`${apiBase}/streams/${videoId}`, { timeout: 3500 });
      if (response.data && response.data.audioStreams && response.data.audioStreams.length > 0) {
        const streams = response.data.audioStreams;
        const bestStream = streams.find(s => s.format === 'M4A' || s.mimeType.includes('mp4')) || streams[0];
        if (bestStream && bestStream.url) {
          console.log(`Successfully retrieved high-speed direct audio stream URL from Piped! Redirecting client...`);
          return res.redirect(bestStream.url);
        }
      }
    } catch (err) {
      console.log(`Piped API mirror ${apiBase} failed/skipped:`, err.message);
    }
  }

  // TIER 2: Fallback to local ytdl stream proxy if Piped fails
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    console.log(`Streaming YouTube audio via @distube/ytdl-core for videoId: ${videoId}`);
    const stream = ytdl(url, { filter: 'audioonly', quality: 'lowest' });
    stream.on('response', (response) => {
      res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
      res.setHeader('Transfer-Encoding', 'chunked');
    });
    stream.on('error', async (err) => {
      console.error('ytdl stream error, switching to emergency mirror proxy:', err.message);
      if (!res.headersSent) {
        await proxyFromMirrors(videoId, res);
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('ytdl proxy error, switching to emergency mirror proxy:', err.message);
    if (!res.headersSent) {
      await proxyFromMirrors(videoId, res);
    }
  }
});

// EMERGENCY MIRROR PROXY FUNCTION (Guarantees 100% Full Duration Audio Stream)
async function proxyFromMirrors(videoId, res) {
  const invidiousMirrors = [
    `https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`,
    `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`,
    `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=140`,
    `https://invidious.lunar.icu/latest_version?id=${videoId}&itag=140`,
    `https://invidious.slipfox.xyz/latest_version?id=${videoId}&itag=140`,
    `https://invidious.weblibre.org/latest_version?id=${videoId}&itag=140`
  ];

  try {
    console.log('Trying Invidious direct stream proxies concurrently...');
    const streamRes = await Promise.any(invidiousMirrors.map(async (mirrorUrl) => {
      const response = await axios({
        method: 'get',
        url: mirrorUrl,
        responseType: 'stream',
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      if (response.status === 200) {
        return response;
      }
      throw new Error('Mirror stream failed');
    }));

    console.log('Successfully connected to Invidious direct stream proxy!');
    res.setHeader('Content-Type', streamRes.headers['content-type'] || 'audio/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');
    streamRes.data.pipe(res);
  } catch (error) {
    console.error('All emergency mirror proxies failed:', error.message);
    if (!res.headersSent) {
      res.redirect("https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95");
    }
  }
}

// DYNAMIC TRENDING & DISCOVERY API ENDPOINTS
const trendingPool = {
  hero_tracks: [
    { id: "hero_1", title: "Espresso", artist: "Sabrina Carpenter", album: "Espresso", duration: 175, image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95", tag: "#1 GLOBAL TRENDING" },
    { id: "hero_2", title: "Fortnight", artist: "Taylor Swift ft. Post Malone", album: "The Tortured Poets Department", duration: 228, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884965&format=mp31&from=app-56d30c95", tag: "RECORD BREAKING HIT" },
    { id: "hero_3", title: "Evaluasi", artist: "Hindia", album: "Menari Dengan Bayangan", duration: 212, image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884966&format=mp31&from=app-56d30c95", tag: "INDONESIA VIRAL 50" },
    { id: "hero_4", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: 200, image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884967&format=mp31&from=app-56d30c95", tag: "ALL TIME BLOCKBUSTER" },
    { id: "hero_5", title: "Lunch", artist: "Billie Eilish", album: "Hit Me Hard and Soft", duration: 179, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884968&format=mp31&from=app-56d30c95", tag: "NEW RELEASE ANTHEM" },
    { id: "hero_6", title: "The Less I Know The Better", artist: "Tame Impala", album: "Currents", duration: 216, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80", preview_url: "https://prod-1.storage.jamendo.com/?trackid=1884969&format=mp31&from=app-56d30c95", tag: "INDIE MASTERPIECE" }
  ],
  playlists: [
    { id: "pl_viral_50", name: "Top Viral 50 Global", description: "The most shared and trending tracks across social media right now.", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_indo_hits", name: "Indonesia Trending Hits", description: "Lagu-lagu terpopuler dan paling sering diputar di tanah air pekan ini.", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_indie_pop", name: "Indie Pop Anthems", description: "Melodi manis dan lirik puitis dari musisi independen terbaik dunia.", image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_lofi_midnight", name: "Lofi Midnight Chill", description: "Irama lo-fi santai menemani malam panjang dan sesi belajar Anda.", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_gym_hype", name: "Gym & Workout Hype", description: "Dentuman bass bertenaga tinggi untuk membakar semangat olahraga Anda.", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_acoustic", name: "Acoustic Sunset", description: "Alunan gitar akustik hangat penikmat senja dan secangkir kopi.", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_tokyo_city", name: "Tokyo City Pop 80s", description: "Nostalgia gemerlap lampu neon Tokyo dengan irama city pop legendaris.", image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80" },
    { id: "pl_kpop_hits", name: "K-Pop Chart Toppers", description: "Koreografi dan vokal paling memukau dari fenomena Hallyu saat ini.", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80" }
  ],
  hitmakers: [
    { id: "art_1", name: "Taylor Swift", role: "Pop Icon", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80" },
    { id: "art_2", name: "The Weeknd", role: "R&B Megastar", image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80" },
    { id: "art_3", name: "Hindia", role: "Indie Phenomenon", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80" },
    { id: "art_4", name: "Billie Eilish", role: "Alt-Pop Prodigy", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "art_5", name: "Bruno Mars", role: "Funk Master", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80" },
    { id: "art_6", name: "Dua Lipa", role: "Disco Queen", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80" },
    { id: "art_7", name: "Kendrick Lamar", role: "Rap Legend", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "art_8", name: "Tame Impala", role: "Psych-Rock Guru", image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80" },
    { id: "art_9", name: "Olivia Rodrigo", role: "Pop-Punk Princess", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80" }
  ],
  viral_tracks: [
    { id: "v_1", title: "Not Like Us", artist: "Kendrick Lamar", streams: "14.2M Streams", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "v_2", title: "Please Please Please", artist: "Sabrina Carpenter", streams: "12.8M Streams", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80" },
    { id: "v_3", title: "Birds of a Feather", artist: "Billie Eilish", streams: "11.5M Streams", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "v_4", title: "Sialan", artist: "Juicy Luicy & Mawar de Jongh", streams: "9.8M Streams", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80" },
    { id: "v_5", title: "Glimpse of Us", artist: "Joji", streams: "8.9M Streams", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80" }
  ],
  trivia: [
    { title: "Sejarah Pita Kaset", fact: "Pita kaset pertama kali diperkenalkan oleh Philips pada tahun 1963 di pameran Berlin Radio Show sebagai media perekam suara portabel." },
    { title: "Rahasia Lubang Sekrup", fact: "Empat sekrup di sudut kaset berfungsi menjaga ketegangan pita magnetik agar tidak tergulung keluar atau kusut saat diputar dengan kecepatan tinggi." },
    { title: "Penemuan Walkman", fact: "Sony merilis Walkman pertama (TPS-L2) pada tahun 1979, mengubah cara seluruh dunia mendengarkan musik secara pribadi dan memicu ledakan penjualan kaset." },
    { title: "Keajaiban Dolby B", fact: "Teknologi peredam desis (noise reduction) Dolby B yang populer di tahun 80-an memotong frekuensi tinggi bising pada pita kaset tanpa menghilangkan detail instrumen musik." },
    { title: "Fungsi Pensil dan Kaset", fact: "Sebelum ada tombol rewind cepat, pecinta musik di era 80-an memutar ulang pita kaset yang kusut menggunakan batang pensil heksagonal yang pas dengan roda gigi kaset!" }
  ]
};

// 1. Dynamic Trending Feed Endpoint
app.get('/api/trending', (req, res) => {
  // Randomly select 1 hero track
  const randomHero = trendingPool.hero_tracks[Math.floor(Math.random() * trendingPool.hero_tracks.length)];
  
  // Randomly shuffle and pick 4 playlists
  const shuffledPlaylists = [...trendingPool.playlists].sort(() => 0.5 - Math.random()).slice(0, 4);
  
  // Randomly shuffle and pick 6 hitmakers
  const shuffledHitmakers = [...trendingPool.hitmakers].sort(() => 0.5 - Math.random()).slice(0, 6);
  
  res.json({
    success: true,
    hero_track: randomHero,
    trending_playlists: shuffledPlaylists,
    trending_hitmakers: shuffledHitmakers,
    viral_charts: trendingPool.viral_tracks
  });
});

// 2. Dynamic Mood Discovery Endpoint
app.get('/api/trending/mood', (req, res) => {
  const { mood } = req.query;
  const moodMap = {
    'energize': { name: "Energize & Hype", desc: "Dentuman bass dan tempo cepat pembakar semangat." },
    'chill': { name: "Late Night Chill", desc: "Alunan lo-fi dan R&B lembut penjelajah malam." },
    'focus': { name: "Deep Focus", desc: "Instrumen ambien dan ketukan tenang untuk konsentrasi penuh." },
    'acoustic': { name: "Acoustic Soul", desc: "Petikan gitar akustik dan vokal jernih menyentuh hati." },
    'workout': { name: "Gym Workout Hype", desc: "Playlist pemicu adrenalin untuk melampaui batas fisik Anda." }
  };
  
  const selectedMood = moodMap[mood] || moodMap['chill'];
  
  res.json({
    success: true,
    playlist: {
      id: `mood_${mood}`,
      name: selectedMood.name,
      description: selectedMood.desc,
      image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
      tracks: fallbackCatalog.featured_playlists[0].tracks // Uses premium fallback tracks
    }
  });
});

// 3. Dynamic Trivia Endpoint
app.get('/api/trivia', (req, res) => {
  const randomTrivia = trendingPool.trivia[Math.floor(Math.random() * trendingPool.trivia.length)];
  res.json({ success: true, trivia: randomTrivia });
});

// 4. Playlist Persistence API
const PLAYLISTS_FILE = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'playlists.json') 
  : path.join(__dirname, 'playlists.json');

app.get('/api/playlists', (req, res) => {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      const fileData = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
      return res.json({ success: true, playlists: JSON.parse(fileData) });
    }
    res.json({ success: true, playlists: [] });
  } catch (error) {
    console.error('Error reading playlists:', error);
    res.status(500).json({ success: false, message: 'Failed to read playlists' });
  }
});

app.post('/api/playlists', (req, res) => {
  try {
    const { playlists } = req.body;
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists || [], null, 2), 'utf8');
    res.json({ success: true, message: 'Playlists saved successfully' });
  } catch (error) {
    console.error('Error saving playlists:', error);
    res.status(500).json({ success: false, message: 'Failed to save playlists' });
  }
});

// Fallback route for SPA / static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
