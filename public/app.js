/**
 * KASET - PREMIUM MINIMALIST MUSIC PLAYER & CATALOG APPLICATION LOGIC
 * Built with Vanilla JavaScript
 */

class KasetApp {
  constructor() {
    // Application State
    this.state = {
      isPlaying: false,
      currentTrack: null,
      tracksQueue: [],
      trackIndex: 0,
      isShuffle: false,
      isRepeat: false,
      isDarkTheme: true,
      currentView: 'home-view',
      catalogSource: 'fallback',
      searchQuery: '',
      customPlaylists: [],
      trackAddingToPlaylist: null
    };

    // DOM Elements Cache
    this.dom = {
      audio: document.getElementById('main-audio-player'),
      appContainer: document.getElementById('app-container'),
      
      // Navigation
      navHome: document.getElementById('nav-home'),
      navExplore: document.getElementById('nav-explore'),
      navCassette: document.getElementById('nav-cassette'),
      navPlaylists: document.getElementById('nav-playlists'),
      
      // Views
      homeView: document.getElementById('home-view'),
      searchView: document.getElementById('search-view'),
      playlistView: document.getElementById('playlist-view'),
      cassetteView: document.getElementById('cassette-view'),
      myPlaylistsView: document.getElementById('my-playlists-view'),
      
      // Grids & Containers
      featuredGrid: document.getElementById('featured-playlists-grid'),
      newReleasesGrid: document.getElementById('new-releases-grid'),
      searchResultsGrid: document.getElementById('search-results-grid'),
      playlistTracksContainer: document.getElementById('playlist-tracks-container'),
      playlistsGrid: document.getElementById('playlists-grid'),
      
      // Modals
      createPlaylistModal: document.getElementById('create-playlist-modal'),
      addToPlaylistModal: document.getElementById('add-to-playlist-modal'),
      
      // Topbar
      searchInput: document.getElementById('search-input'),
      clearSearchBtn: document.getElementById('clear-search-btn'),
      apiSourceText: document.getElementById('api-source-text'),
      statusDot: document.getElementById('status-dot'),
      
      // Player Bar Elements
      playerCover: document.getElementById('player-cover'),
      playerTitle: document.getElementById('player-title'),
      playerArtist: document.getElementById('player-artist'),
      btnPlayPause: document.getElementById('btn-play-pause'),
      iconPlay: document.getElementById('icon-play'),
      iconPause: document.getElementById('icon-pause'),
      btnShuffle: document.getElementById('btn-shuffle'),
      btnRepeat: document.getElementById('btn-repeat'),
      btnToggleCassette: document.getElementById('btn-toggle-cassette'),
      timeCurrent: document.getElementById('time-current'),
      timeTotal: document.getElementById('time-total'),
      progressBar: document.getElementById('progress-bar'),
      progressFilled: document.getElementById('progress-filled'),
      volumeSlider: document.getElementById('volume-slider'),
      
      // Cassette View Elements
      spinningCassette: document.getElementById('spinning-cassette'),
      cassetteTitle: document.getElementById('cassette-track-title'),
      cassetteArtist: document.getElementById('cassette-track-artist'),
      audioSourceBadge: document.getElementById('audio-source-badge'),
      
      // Modal
      settingsModal: document.getElementById('settings-modal'),
      spotifyClientId: document.getElementById('spotify-client-id'),
      spotifyClientSecret: document.getElementById('spotify-client-secret'),
      settingsStatusMsg: document.getElementById('settings-status-msg'),

      // Now Playing Popup Modal
      songPopupModal: document.getElementById('song-popup-modal'),
      popupCover: document.getElementById('popup-cover'),
      popupTitle: document.getElementById('popup-title'),
      popupArtist: document.getElementById('popup-artist'),
      popupSourceBadge: document.getElementById('popup-source-badge'),
      popupIconPlay: document.getElementById('popup-icon-play'),
      popupIconPause: document.getElementById('popup-icon-pause')
    };

    this.init();
  }

  /**
   * Initialize Application
   */
  async init() {
    this.setupEventListeners();
    this.loadTheme();
    this.loadSavedCredentials();
    this.loadYouTubeIframeAPI(); // Load the official YouTube player engine
    await this.loadPlaylists();
    await this.fetchFeaturedCatalog();
    await this.loadTrending();
  }

  loadYouTubeIframeAPI() {
    // Global hook for YouTube Iframe API Ready state
    window.onYouTubeIframeAPIReady = () => {
      window.ytPlayer = new YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: '', // starts empty
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'rel': 0,
          'modestbranding': 1,
          'showinfo': 0,
          'autoplay': 0
        },
        events: {
          'onReady': () => {
            console.log('YouTube Iframe Player Engine Ready.');
            const led = document.getElementById('tv-led-indicator');
            if (led) led.classList.add('active'); // Turn vintage TV light green
          },
          'onStateChange': (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              this.handleTrackEnded();
            }
            if (event.data === YT.PlayerState.PLAYING) {
              this.onPlayStateChange(true);
            }
            if (event.data === YT.PlayerState.PAUSED) {
              this.onPlayStateChange(false);
            }
          }
        }
      });
    };

    // Load official YouTube script
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  /**
   * Setup DOM Event Listeners
   */
  setupEventListeners() {
    // Audio Player Events
    this.dom.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.dom.audio.addEventListener('ended', () => this.handleTrackEnded());
    this.dom.audio.addEventListener('play', () => this.onPlayStateChange(true));
    this.dom.audio.addEventListener('pause', () => this.onPlayStateChange(false));
    this.dom.audio.addEventListener('waiting', () => this.updateAudioSourceBadge('Buffering stream...'));
    this.dom.audio.addEventListener('playing', () => this.updateAudioSourceBadge(`Playing full duration (${this.state.currentTrack ? this.state.currentTrack.audioSource : 'Stream'})`));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Spacebar to play/pause if not in input
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.togglePlayPause();
      }
    });

    // Touch swipe support for mobile player bar
    let touchStartY = 0;
    const playerBar = document.getElementById('player-bar');
    if (playerBar) {
      playerBar.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      
      playerBar.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartY;
        
        // If swiped down more than 30px, collapse
        if (diffY > 30) {
          playerBar.classList.add('collapsed');
        } 
        // If swiped up more than 30px, expand
        else if (diffY < -30) {
          playerBar.classList.remove('collapsed');
        }
      }, { passive: true });
    }
  }

  /**
   * Toggle Mobile Player Bar (Collapse / Expand)
   */
  toggleMobilePlayerBar(event) {
    if (event) event.stopPropagation();
    const playerBar = document.getElementById('player-bar');
    if (playerBar) {
      playerBar.classList.toggle('collapsed');
    }
  }

  /**
   * Load Theme from LocalStorage
   */
  loadTheme() {
    const savedTheme = localStorage.getItem('kaset_theme');
    if (savedTheme === 'light') {
      this.state.isDarkTheme = false;
      document.body.classList.remove('dark-theme');
      this.dom.appContainer.classList.remove('dark-theme');
    } else {
      this.state.isDarkTheme = true;
      document.body.classList.add('dark-theme');
      this.dom.appContainer.classList.add('dark-theme');
    }
  }

  /**
   * Toggle Dark/Light Theme
   */
  toggleTheme() {
    this.state.isDarkTheme = !this.state.isDarkTheme;
    if (this.state.isDarkTheme) {
      document.body.classList.add('dark-theme');
      this.dom.appContainer.classList.add('dark-theme');
      localStorage.setItem('kaset_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      this.dom.appContainer.classList.remove('dark-theme');
      localStorage.setItem('kaset_theme', 'light');
    }
  }

  /**
   * Load Saved Spotify Credentials
   */
  loadSavedCredentials() {
    const clientId = localStorage.getItem('spotify_client_id');
    const clientSecret = localStorage.getItem('spotify_client_secret');
    if (clientId && clientSecret) {
      this.dom.spotifyClientId.value = clientId;
      this.dom.spotifyClientSecret.value = clientSecret;
    }
  }

  /**
   * Save & Authenticate Spotify Credentials
   */
  async saveSpotifyCredentials() {
    const clientId = this.dom.spotifyClientId.value.trim();
    const clientSecret = this.dom.spotifyClientSecret.value.trim();

    if (!clientId || !clientSecret) {
      this.showSettingsStatus('Both Client ID and Client Secret are required.', false);
      return;
    }

    this.showSettingsStatus('Authenticating with Spotify API...', true);

    try {
      const response = await fetch('/api/spotify/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('spotify_client_id', clientId);
        localStorage.setItem('spotify_client_secret', clientSecret);
        this.showSettingsStatus('Successfully authenticated with Spotify Web API!', true);
        
        // Refresh catalog with live Spotify data
        setTimeout(() => {
          this.closeSettingsModal();
          this.fetchFeaturedCatalog();
        }, 1500);
      } else {
        this.showSettingsStatus(data.message || 'Authentication failed. Check your credentials.', false);
      }
    } catch (error) {
      this.showSettingsStatus('Network error while connecting to server.', false);
    }
  }

  showSettingsStatus(msg, isSuccess) {
    this.dom.settingsStatusMsg.textContent = msg;
    this.dom.settingsStatusMsg.className = `status-msg ${isSuccess ? 'success' : 'error'}`;
    this.dom.settingsStatusMsg.classList.remove('hidden');
  }

  openSettingsModal() {
    this.dom.settingsModal.classList.remove('hidden');
  }

  closeSettingsModal() {
    this.dom.settingsModal.classList.add('hidden');
    this.dom.settingsStatusMsg.classList.add('hidden');
  }

  /**
   * Fetch Featured Catalog & New Releases
   */
  async fetchFeaturedCatalog() {
    try {
      const response = await fetch('/api/spotify/featured');
      const data = await response.json();

      if (data.success) {
        this.state.catalogSource = data.source;
        this.updateCatalogSourceUI(data.source);
        this.renderFeaturedGrid(data.data.featured_playlists);
        this.renderNewReleasesGrid(data.data.new_releases);
      }
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
      this.dom.featuredGrid.innerHTML = `<div class="status-msg error" style="grid-column:1/-1;">Failed to load catalog. Check server connection.</div>`;
    }
  }

  updateCatalogSourceUI(source) {
    if (source === 'spotify') {
      this.dom.apiSourceText.textContent = 'Live Spotify Web API';
      this.dom.statusDot.className = 'status-indicator active';
    } else {
      this.dom.apiSourceText.textContent = 'Curated Fallback Library';
      this.dom.statusDot.className = 'status-indicator';
    }
  }

  /**
   * Load Dynamic Trending Feed & Hitmakers & Viral Charts & Trivia
   */
  async loadTrending() {
    try {
      const response = await fetch('/api/trending');
      const data = await response.json();
      if (data.success) {
        // 1. Update Dynamic Hero Banner
        this.state.heroTrack = data.hero_track;
        this.state.viralTracks = data.viral_charts;
        document.getElementById('hero-tag').textContent = data.hero_track.tag || '#1 GLOBAL TRENDING';
        document.getElementById('hero-track-title').textContent = data.hero_track.title;
        document.getElementById('hero-track-artist').textContent = `${data.hero_track.artist} • Alunan musik trending penakluk tangga lagu dunia saat ini.`;

        // 2. Update Trending Playlists (overwrite featured grid with dynamic trending playlists)
        this.renderFeaturedGrid(data.trending_playlists);

        // 3. Render Trending Hitmakers Grid
        const hitmakersGrid = document.getElementById('hitmakers-grid');
        if (hitmakersGrid) {
          hitmakersGrid.innerHTML = data.trending_hitmakers.map(art => `
            <div class="hitmaker-card" onclick="app.searchHitmaker('${art.name.replace(/'/g, "\\'")}')">
              <div class="hitmaker-img-container">
                <img src="${art.image}" alt="${art.name}" class="hitmaker-img">
              </div>
              <h5 class="hitmaker-name">${art.name}</h5>
              <span class="hitmaker-role">${art.role}</span>
            </div>
          `).join('');
        }

        // 4. Render Viral Charts Grid
        const viralGrid = document.getElementById('viral-charts-grid');
        if (viralGrid) {
          viralGrid.innerHTML = data.viral_charts.map((v, idx) => `
            <div class="viral-card" onclick="app.playViralTrackDirectly('${v.id}', '${v.title.replace(/'/g, "\\'")}', '${v.artist.replace(/'/g, "\\'")}', '${v.image}')">
              <div class="viral-rank">#${idx + 1}</div>
              <img src="${v.image}" alt="${v.title}" class="viral-img">
              <div class="viral-info">
                <h5 class="viral-title">${v.title}</h5>
                <p class="viral-artist">${v.artist}</p>
                <span class="viral-streams">${v.streams}</span>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.error('Failed to load trending feed:', e);
    }
  }

  /**
   * Play Dynamic Hero Track
   */
  playHeroTrack() {
    if (!this.state.heroTrack) return;
    const track = {
      id: this.state.heroTrack.id,
      title: this.state.heroTrack.title,
      artist: this.state.heroTrack.artist,
      album: this.state.heroTrack.album || 'Single',
      duration: this.state.heroTrack.duration || 180,
      image: this.state.heroTrack.image,
      preview_url: this.state.heroTrack.preview_url
    };
    this.playSingleTrack(track);
  }

  /**
   * Play Viral Track Directly
   */
  playViralTrackDirectly(id, title, artist, image) {
    const track = {
      id: id,
      title: title,
      artist: artist,
      album: 'Viral Hits',
      duration: 200,
      image: image,
      preview_url: 'https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95'
    };
    this.playSingleTrack(track);
  }

  /**
   * Search Hitmaker Top Songs
   */
  searchHitmaker(name) {
    this.dom.searchInput.value = name;
    this.performSearch(name);
  }

  /**
   * Load Mood Station Playlist
   */
  async loadMood(mood, btnElem) {
    // Update active pill
    document.querySelectorAll('.mood-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');

    try {
      const response = await fetch(`/api/trending/mood?mood=${mood}`);
      const data = await response.json();
      if (data.success && data.playlist) {
        this.openPlaylist(
          data.playlist.id,
          data.playlist.name,
          data.playlist.description,
          data.playlist.image,
          'MOOD'
        );
      }
    } catch (e) {
      console.error('Failed to load mood playlist:', e);
    }
  }

  /**
   * Load Next Trivia
   */
  async loadTrivia() {
    try {
      const response = await fetch('/api/trivia');
      const data = await response.json();
      if (data.success && data.trivia) {
        document.getElementById('trivia-title').textContent = data.trivia.title;
        document.getElementById('trivia-fact').textContent = data.trivia.fact;
      }
    } catch (e) {
      console.error('Failed to load trivia:', e);
    }
  }

  /**
   * Render Featured Playlists Grid
   */
  renderFeaturedGrid(playlists) {
    this.dom.featuredGrid.innerHTML = playlists.map(pl => `
      <div class="catalog-card" onclick="app.openPlaylist('${pl.id}', '${pl.name}', '${pl.description.replace(/'/g, "\\'")}', '${pl.image}', 'playlist')">
        <div class="card-img-container">
          <img src="${pl.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}" alt="${pl.name}" class="card-img">
          <button class="card-play-btn" onclick="event.stopPropagation(); app.playPlaylistDirectly('${pl.id}', 'playlist')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        </div>
        <h4 class="card-title">${pl.name}</h4>
        <p class="card-subtitle">${pl.description || 'Curated music playlist'}</p>
      </div>
    `).join('');
  }

  /**
   * Render New Releases Grid
   */
  renderNewReleasesGrid(releases) {
    this.dom.newReleasesGrid.innerHTML = releases.map(album => `
      <div class="catalog-card" onclick="app.openPlaylist('${album.id}', '${album.title.replace(/'/g, "\\'")}', 'Album by ${album.artist.replace(/'/g, "\\'")}', '${album.image}', 'album')">
        <div class="card-img-container">
          <img src="${album.image || 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=300&auto=format&fit=crop&q=80'}" alt="${album.title}" class="card-img">
          <button class="card-play-btn" onclick="event.stopPropagation(); app.playPlaylistDirectly('${album.id}', 'album')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        </div>
        <h4 class="card-title">${album.title}</h4>
        <p class="card-subtitle">${album.artist}</p>
      </div>
    `).join('');
  }

  async openPlaylist(id, name, desc, image, type) {
    this.switchView('playlist-view');
    
    document.getElementById('playlist-detail-name').textContent = name;
    document.getElementById('playlist-detail-desc').textContent = desc;
    
    const coverUrl = image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
    document.getElementById('playlist-detail-img').src = coverUrl;
    
    const vinylLabel = document.getElementById('vinyl-label-img');
    if (vinylLabel) vinylLabel.src = coverUrl;
    
    const vinyl = document.getElementById('playlist-vinyl-record');
    if (vinyl) {
      if (this.state.isPlaying) {
        vinyl.classList.add('spinning');
      } else {
        vinyl.classList.remove('spinning');
      }
    }

    document.getElementById('playlist-detail-type').textContent = type.toUpperCase().replace('_', ' ');

    this.dom.playlistTracksContainer.innerHTML = `<div class="loading-spinner"></div>`;

    const glow = document.getElementById('playlist-ambient-glow');
    const vibeBadge = document.getElementById('playlist-detail-vibe-badge');
    const hoverEdit = document.getElementById('playlist-cover-hover-edit');
    const aiWand = document.getElementById('playlist-ai-wand-btn');
    const dashboard = document.getElementById('playlist-dashboard-stats');

    if (type === 'custom_playlist') {
      this.state.currentViewedPlaylistId = id;
      const playlist = this.state.customPlaylists.find(p => p.id === id);
      const tracks = playlist ? playlist.tracks : [];
      const theme = (playlist && playlist.theme) ? playlist.theme : 'cyberpunk';
      
      // Update parent view classes to cascade custom theme styles safely
      const viewEl = document.getElementById('playlist-view');
      if (viewEl) {
        viewEl.classList.remove('theme-cyberpunk', 'theme-sunset', 'theme-emerald', 'theme-ocean', 'theme-gold');
        viewEl.classList.add(`theme-${theme}`);
      }
      if (glow) {
        glow.className = `playlist-ambient-glow theme-${theme}`;
      }
      if (vibeBadge) {
        vibeBadge.style.display = 'inline-block';
        vibeBadge.className = `vibe-badge theme-cyberpunk`;
        vibeBadge.textContent = 'KASET VIBE';
      }
      
      if (hoverEdit) hoverEdit.style.display = 'flex';
      if (aiWand) aiWand.style.display = 'flex';
      if (dashboard) {
        dashboard.style.display = 'grid';
        
        // Compute stats
        const count = tracks.length;
        const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 210), 0);
        const durationMin = Math.round(totalSec / 60);
        
        let vibeName = "Chill";
        if (theme === 'cyberpunk') vibeName = "Cyberpunk";
        else if (theme === 'sunset') vibeName = "Sunset";
        else if (theme === 'emerald') vibeName = "Forest Zen";
        else if (theme === 'ocean') vibeName = "Deep Blue";
        else if (theme === 'gold') vibeName = "Gold Jazz";
        
        document.getElementById('stat-tracks-count').textContent = count;
        document.getElementById('stat-tracks-duration').textContent = `${durationMin} min`;
        document.getElementById('stat-tracks-energy').textContent = vibeName;
      }

      this.state.tracksQueue = tracks;
      this.renderPlaylistTracks(tracks, true, id);
      return;
    }

    // Standard Spotify playlist
    this.state.currentViewedPlaylistId = null;
    if (glow) glow.className = 'playlist-ambient-glow theme-cyberpunk';
    if (vibeBadge) vibeBadge.style.display = 'none';
    if (hoverEdit) hoverEdit.style.display = 'none';
    if (aiWand) aiWand.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';

    try {
      const response = await fetch(`/api/spotify/tracks?id=${id}&type=${type}`);
      const data = await response.json();

      if (data.success) {
        this.state.tracksQueue = data.tracks;
        this.renderPlaylistTracks(data.tracks, false);
      }
    } catch (error) {
      this.dom.playlistTracksContainer.innerHTML = `<div class="status-msg error">Failed to load playlist tracks.</div>`;
    }
  }

  renderPlaylistTracks(tracks, isCustom = false, playlistId = null) {
    if (tracks.length === 0) {
      this.dom.playlistTracksContainer.innerHTML = `<div class="status-msg" style="padding: 40px; text-align: center; color: var(--text-muted);">Playlist ini masih kosong. Silakan cari lagu dan tambahkan ke playlist Anda!</div>`;
      return;
    }

    this.dom.playlistTracksContainer.innerHTML = tracks.map((track, idx) => `
      <div class="track-row ${this.state.currentTrack && this.state.currentTrack.id === track.id ? 'active' : ''}" onclick="app.playTrackIndex(${idx})">
        <span class="track-number">${idx + 1}</span>
        <img src="${track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}" alt="${track.title}" class="track-thumb">
        <div class="track-info">
          <div class="track-title">${track.title}</div>
          <div class="track-artist">${track.artist}</div>
        </div>
        <div class="track-album">${track.album || ''}</div>
        <div class="track-actions-container" style="display: flex; align-items: center; gap: 16px; margin-left: auto;">
          <div class="track-duration" style="margin-right: 8px;">${this.formatTime(track.duration || 210)}</div>
          ${isCustom ? `
            <button class="remove-from-playlist-btn" onclick="event.stopPropagation(); app.removeTrackFromPlaylist('${playlistId}', '${track.id}')" title="Remove from Playlist" style="background: none; border: none; color: #ff5b5b; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; transition: all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          ` : `
            <button class="add-to-playlist-btn" onclick="event.stopPropagation(); app.openAddToPlaylistModal('${track.id}')" title="Add to Playlist" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; transition: all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          `}
        </div>
      </div>
    `).join('');
  }

  /**
   * Play Entire Playlist / Album
   */
  playEntirePlaylist() {
    if (this.state.tracksQueue.length > 0) {
      this.playTrackIndex(0);
    }
  }

  async playPlaylistDirectly(id, type) {
    try {
      const response = await fetch(`/api/spotify/tracks?id=${id}&type=${type}`);
      const data = await response.json();

      if (data.success && data.tracks.length > 0) {
        this.state.tracksQueue = data.tracks;
        this.playTrackIndex(0);
      }
    } catch (error) {
      console.error('Play directly failed', error);
    }
  }

  playFeaturedTrack() {
    this.playPlaylistDirectly('pl_top_hits', 'playlist');
  }

  /**
   * Search Spotify Catalog
   */
  async handleSearch(event) {
    const query = event.target.value.trim();
    this.state.searchQuery = query;

    if (query.length > 0) {
      this.dom.clearSearchBtn.classList.remove('hidden');
      if (event.key === 'Enter' || query.length > 2) {
        this.performSearch(query);
      }
    } else {
      this.clearSearch();
    }
  }

  async performSearch(query) {
    this.switchView('search-view');
    document.getElementById('search-title').textContent = `Search Results for "${query}"`;
    this.dom.searchResultsGrid.innerHTML = `<div class="loading-spinner"></div>`;

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success) {
        this.state.tracksQueue = data.tracks;
        if (data.tracks.length === 0) {
          this.dom.searchResultsGrid.innerHTML = `<div class="status-msg" style="grid-column:1/-1;">No tracks found matching your query.</div>`;
        } else {
          this.dom.searchResultsGrid.innerHTML = data.tracks.map((track, idx) => `
            <div class="track-row ${this.state.currentTrack && this.state.currentTrack.id === track.id ? 'active' : ''}" onclick="app.playTrackIndex(${idx})">
              <span class="track-number">${idx + 1}</span>
              <img src="${track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}" alt="${track.title}" class="track-thumb">
              <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
              </div>
              <div class="track-album">${track.album || ''}</div>
              <div class="track-actions-container" style="display: flex; align-items: center; gap: 16px; margin-left: auto;">
                <div class="track-duration" style="margin-right: 8px;">${this.formatTime(track.duration || 210)}</div>
                <button class="add-to-playlist-btn" onclick="event.stopPropagation(); app.openAddToPlaylistModal('${track.id}')" title="Add to Playlist" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; transition: all 0.2s;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (error) {
      this.dom.searchResultsGrid.innerHTML = `<div class="status-msg error" style="grid-column:1/-1;">Search failed.</div>`;
    }
  }

  clearSearch() {
    this.dom.searchInput.value = '';
    this.dom.clearSearchBtn.classList.add('hidden');
    this.showHomeView();
  }

  /**
   * Switch Active View
   */
  switchView(viewId) {
    this.state.currentView = viewId;
    
    // Hide all views
    this.dom.homeView.classList.remove('active');
    this.dom.homeView.classList.add('hidden');
    this.dom.searchView.classList.remove('active');
    this.dom.searchView.classList.add('hidden');
    this.dom.playlistView.classList.remove('active');
    this.dom.playlistView.classList.add('hidden');
    this.dom.cassetteView.classList.remove('active');
    this.dom.cassetteView.classList.add('hidden');
    if (this.dom.myPlaylistsView) {
      this.dom.myPlaylistsView.classList.remove('active');
      this.dom.myPlaylistsView.classList.add('hidden');
    }

    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    // Update Nav Active States
    this.dom.navHome.classList.remove('active');
    this.dom.navExplore.classList.remove('active');
    this.dom.navCassette.classList.remove('active');
    if (this.dom.navPlaylists) this.dom.navPlaylists.classList.remove('active');

    if (viewId === 'home-view') this.dom.navHome.classList.add('active');
    if (viewId === 'cassette-view') this.dom.navCassette.classList.add('active');
    if (viewId === 'my-playlists-view' && this.dom.navPlaylists) this.dom.navPlaylists.classList.add('active');
  }

  showHomeView() {
    this.switchView('home-view');
  }

  showPlaylistsView() {
    this.switchView('my-playlists-view');
    this.renderCustomPlaylistsGrid();
  }

  showExploreView() {
    this.switchView('home-view');
    // Scroll to playlists
    document.querySelector('.catalog-section').scrollIntoView({ behavior: 'smooth' });
  }

  toggleCassetteView() {
    if (this.state.currentView === 'cassette-view') {
      this.showHomeView();
      this.dom.btnToggleCassette.classList.remove('active');
    } else {
      this.switchView('cassette-view');
      this.dom.btnToggleCassette.classList.add('active');
    }
  }

  /**
   * AUDIO PLAYBACK & FULL DURATION FETCHING LOGIC
   */
  playSingleTrack(track) {
    this.state.tracksQueue = [track];
    this.playTrackIndex(0);
  }

  async playTrackIndex(index) {
    if (index < 0 || index >= this.state.tracksQueue.length) return;
    
    this.state.trackIndex = index;
    const track = this.state.tracksQueue[index];
    this.state.currentTrack = track;

    // Update UI immediately with track metadata
    this.dom.playerTitle.textContent = track.title;
    this.dom.playerArtist.textContent = track.artist;
    this.dom.playerCover.src = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80';
    
    // Update Cassette Tape Label
    this.dom.cassetteTitle.textContent = track.title;
    this.dom.cassetteArtist.textContent = track.artist;

    // Update Now Playing Popup Modal UI
    if (this.dom.popupTitle) this.dom.popupTitle.textContent = track.title;
    if (this.dom.popupArtist) this.dom.popupArtist.textContent = track.artist;
    if (this.dom.popupCover) this.dom.popupCover.src = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80';

    // Refresh active states in lists without re-rendering DOM or re-fetching API
    document.querySelectorAll('.track-row').forEach(row => row.classList.remove('active'));
    const activeRows = document.querySelectorAll('.track-row');
    if (activeRows[index]) activeRows[index].classList.add('active');

    // Clean up active audio and YouTube playback before starting new track
    this.dom.audio.pause();
    this.dom.audio.src = '';
    
    if (this.state.ytProgressInterval) {
      clearInterval(this.state.ytProgressInterval);
    }
    
    // Reset progress UI to loading state
    this.dom.progressFilled.style.width = '0%';
    this.dom.timeCurrent.textContent = '0:00';
    this.dom.timeTotal.textContent = this.formatTime(track.duration || 240);
    
    this.onPlayStateChange(false);
    this.updateAudioSourceBadge(`Searching track source...`);

    // Turn Vintage TV LED Red (loading)
    const led = document.getElementById('tv-led-indicator');
    if (led) {
      led.classList.remove('active');
      led.style.backgroundColor = '#ff3b30';
      led.style.boxShadow = '0 0 10px #ff3b30';
    }

    // CRITICAL MOBILE AUTOPLAY BYPASS:
    // Synchronously play/activate the official YouTube player if initialized to capture the user touch event!
    if (window.ytPlayer && typeof window.ytPlayer.playVideo === 'function') {
      try {
        window.ytPlayer.mute();
        window.ytPlayer.playVideo();
      } catch (e) {
        console.log('Synchronous YouTube blessing skipped:', e.message);
      }
    }

    // Fetch full-duration audio stream directly via our multi-tier Node search API
    fetch(`/api/audio/search?track=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`)
      .then(res => res.json())
      .then(data => {
        // Only load if the user hasn't switched tracks while loading
        if (this.state.currentTrack && this.state.currentTrack.id === track.id && data.success) {
          if (data.videoId) {
            // PLAY VIA THE VISIBLE RETRO TV MONITOR IFRAME PLAYER (100% stable, bypassed CORS & Vercel streaming limitations)
            this.state.isYoutubeActive = true;
            track.audioSource = data.source || 'Premium Engine';

            if (window.ytPlayer && typeof window.ytPlayer.loadVideoById === 'function') {
              window.ytPlayer.unMute();
              window.ytPlayer.setVolume(this.dom.volumeSlider.value * 100);
              window.ytPlayer.loadVideoById(data.videoId, 0);
              window.ytPlayer.playVideo();
              this.onPlayStateChange(true);
              this.startYtProgressLoop();
              this.updateAudioSourceBadge(`Playing full duration (${track.audioSource})`);

              // Turn TV LED Green
              if (led) {
                led.classList.add('active');
                led.style.backgroundColor = '#1db954';
                led.style.boxShadow = '0 0 10px #1db954';
              }
            } else {
              // Fail-safe if iframe API hasn't loaded, stream natively
              this.state.isYoutubeActive = false;
              this.dom.audio.src = `/api/audio/stream?videoId=${data.videoId}`;
              this.dom.audio.play().catch(e => console.error('Emergency direct play failed:', e));
              this.updateAudioSourceBadge(`Playing full duration (Emergency Fallback)`);
            }
          } else if (data.audio_url) {
            // Emergency fallback for other audio files
            this.state.isYoutubeActive = false;
            track.audioSource = data.source || 'Premium Stream';
            this.dom.audio.src = data.audio_url;
            this.dom.audio.load();

            const onCanPlay = () => {
              this.dom.audio.play().catch(e => console.error('Fallback play failed:', e));
              this.updateAudioSourceBadge(`Playing full duration (${track.audioSource})`);
              this.onPlayStateChange(true);
              this.dom.audio.removeEventListener('canplay', onCanPlay);
            };
            this.dom.audio.addEventListener('canplay', onCanPlay);
          }
        }
      })
      .catch(err => {
        console.error('Audio load failed:', err);
        this.updateAudioSourceBadge(`Failed to load full duration stream.`);
      });
  }

  startYtProgressLoop() {
    if (this.state.ytProgressInterval) {
      clearInterval(this.state.ytProgressInterval);
    }
    this.state.ytProgressInterval = setInterval(() => {
      if (this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
        const currentTime = window.ytPlayer.getCurrentTime();
        const duration = window.ytPlayer.getDuration() || this.state.currentTrack.duration || 240;
        
        if (duration > 0) {
          const progressPercent = (currentTime / duration) * 100;
          this.dom.progressFilled.style.width = `${progressPercent}%`;
          this.dom.timeCurrent.textContent = this.formatTime(currentTime);
          this.dom.timeTotal.textContent = this.formatTime(duration);
        }
      }
    }, 500);
  }

  updateAudioSourceBadge(text) {
    this.dom.audioSourceBadge.textContent = text;
    if (this.dom.popupSourceBadge) this.dom.popupSourceBadge.textContent = text;
  }

  togglePlayPause() {
    if (!this.state.currentTrack) {
      if (this.state.tracksQueue.length > 0) {
        this.playTrackIndex(0);
      } else {
        this.playFeaturedTrack();
      }
      return;
    }

    if (this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.getPlayerState === 'function') {
      const state = window.ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        window.ytPlayer.pauseVideo();
        this.onPlayStateChange(false);
      } else {
        window.ytPlayer.playVideo();
        this.onPlayStateChange(true);
      }
      return;
    }

    if (this.dom.audio.paused) {
      this.dom.audio.play();
    } else {
      this.dom.audio.pause();
    }
  }

  onPlayStateChange(isPlaying) {
    this.state.isPlaying = isPlaying;
    
    const vinyl = document.getElementById('playlist-vinyl-record');
    
    if (isPlaying) {
      this.dom.iconPlay.classList.add('hidden');
      this.dom.iconPause.classList.remove('hidden');
      if (this.dom.popupIconPlay) this.dom.popupIconPlay.classList.add('hidden');
      if (this.dom.popupIconPause) this.dom.popupIconPause.classList.remove('hidden');
      this.dom.spinningCassette.classList.add('playing');
      if (vinyl) vinyl.classList.add('spinning');
    } else {
      this.dom.iconPlay.classList.remove('hidden');
      this.dom.iconPause.classList.add('hidden');
      if (this.dom.popupIconPlay) this.dom.popupIconPlay.classList.remove('hidden');
      if (this.dom.popupIconPause) this.dom.popupIconPause.classList.add('hidden');
      this.dom.spinningCassette.classList.remove('playing');
      if (vinyl) vinyl.classList.remove('spinning');
    }
  }

  openSongPopup() {
    if (this.dom.songPopupModal) {
      this.dom.songPopupModal.classList.remove('hidden');
    }
  }

  closeSongPopup() {
    if (this.dom.songPopupModal) {
      this.dom.songPopupModal.classList.add('hidden');
    }
  }

  nextTrack() {
    if (this.state.tracksQueue.length === 0) return;

    let nextIdx = this.state.trackIndex + 1;
    if (this.state.isShuffle) {
      nextIdx = Math.floor(Math.random() * this.state.tracksQueue.length);
    } else if (nextIdx >= this.state.tracksQueue.length) {
      nextIdx = this.state.isRepeat ? 0 : this.state.tracksQueue.length - 1;
    }
    this.playTrackIndex(nextIdx);
  }

  prevTrack() {
    if (this.state.tracksQueue.length === 0) return;

    const currentTime = this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function' 
      ? window.ytPlayer.getCurrentTime() 
      : this.dom.audio.currentTime;

    if (currentTime > 3) {
      if (this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
        window.ytPlayer.seekTo(0, true);
      } else {
        this.dom.audio.currentTime = 0;
      }
      return;
    }

    let prevIdx = this.state.trackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.state.isRepeat ? this.state.tracksQueue.length - 1 : 0;
    }
    this.playTrackIndex(prevIdx);
  }

  handleTrackEnded() {
    if (this.state.isRepeat && !this.state.isShuffle) {
      if (this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
        window.ytPlayer.seekTo(0, true);
        window.ytPlayer.playVideo();
      } else {
        this.dom.audio.currentTime = 0;
        this.dom.audio.play();
      }
    } else {
      this.nextTrack();
    }
  }

  toggleShuffle() {
    this.state.isShuffle = !this.state.isShuffle;
    this.dom.btnShuffle.classList.toggle('active', this.state.isShuffle);
  }

  toggleRepeat() {
    this.state.isRepeat = !this.state.isRepeat;
    this.dom.btnRepeat.classList.toggle('active', this.state.isRepeat);
  }

  updateProgress() {
    if (this.state.isYoutubeActive) return;
    const { currentTime, duration } = this.dom.audio;
    if (isNaN(duration)) return;

    const progressPercent = (currentTime / duration) * 100;
    this.dom.progressFilled.style.width = `${progressPercent}%`;
    this.dom.timeCurrent.textContent = this.formatTime(currentTime);
    this.dom.timeTotal.textContent = this.formatTime(duration);
  }

  seekAudio(event) {
    const { duration } = this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.getDuration === 'function'
      ? { duration: window.ytPlayer.getDuration() }
      : this.dom.audio;

    if (isNaN(duration) || duration <= 0) return;

    const rect = this.dom.progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * duration;
    
    if (this.state.isYoutubeActive && window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
      window.ytPlayer.seekTo(seekTime, true);
    } else {
      this.dom.audio.currentTime = seekTime;
    }
  }

  setVolume(value) {
    this.dom.audio.volume = value;
    if (window.ytPlayer && typeof window.ytPlayer.setVolume === 'function') {
      window.ytPlayer.setVolume(value * 100);
    }
  }

  /**
   * ==========================================================================
   * DUAL-LAYER PERSISTENT PLAYLIST LOGIC
   * ==========================================================================
   */

  async loadPlaylists() {
    let localData = [];
    try {
      const saved = localStorage.getItem('kaset_playlists');
      if (saved) localData = JSON.parse(saved);
    } catch (e) {
      console.error('Error reading localStorage playlists:', e);
    }

    try {
      const response = await fetch('/api/playlists');
      const data = await response.json();
      if (data.success && data.playlists) {
        // Merge or restore
        if (data.playlists.length >= localData.length) {
          this.state.customPlaylists = data.playlists;
          localStorage.setItem('kaset_playlists', JSON.stringify(data.playlists));
        } else {
          // Client has more playlists (maybe created offline), sync with server
          this.state.customPlaylists = localData;
          await this.syncPlaylistsWithBackend(localData);
        }
      } else {
        this.state.customPlaylists = localData;
      }
    } catch (error) {
      console.warn('Backend sync unavailable, using local cache:', error);
      this.state.customPlaylists = localData;
    }
  }

  async syncPlaylistsWithBackend(playlists = this.state.customPlaylists) {
    // 1. Save to Local Storage immediately
    localStorage.setItem('kaset_playlists', JSON.stringify(playlists));

    // 2. Sync to Backend in the background
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlists })
      });
    } catch (e) {
      console.warn('Backend sync failed (network offline):', e);
    }
  }

  createNewPlaylistModal() {
    if (this.dom.createPlaylistModal) {
      this.dom.createPlaylistModal.classList.remove('hidden');
    }
  }

  closeCreatePlaylistModal() {
    if (this.dom.createPlaylistModal) {
      this.dom.createPlaylistModal.classList.add('hidden');
      document.getElementById('playlist-name-input').value = '';
      document.getElementById('playlist-desc-input').value = '';
      document.getElementById('playlist-theme-select').value = 'cyberpunk';
      
      const fileInput = document.getElementById('playlist-cover-file');
      if (fileInput) fileInput.value = '';
      
      const previewImg = document.getElementById('playlist-cover-preview-img');
      const placeholder = document.getElementById('playlist-cover-preview-placeholder');
      if (previewImg) previewImg.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      
      this.state.newPlaylistCoverBase64 = null;
      document.getElementById('playlist-status-msg').classList.add('hidden');
    }
  }

  handlePlaylistCoverUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      this.state.newPlaylistCoverBase64 = base64;
      
      const previewImg = document.getElementById('playlist-cover-preview-img');
      const placeholder = document.getElementById('playlist-cover-preview-placeholder');
      if (previewImg) {
        previewImg.src = base64;
        previewImg.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  async saveNewPlaylist() {
    const nameInput = document.getElementById('playlist-name-input');
    const descInput = document.getElementById('playlist-desc-input');
    const statusMsg = document.getElementById('playlist-status-msg');

    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const theme = 'cyberpunk';

    if (!name) {
      statusMsg.textContent = 'Playlist name is required.';
      statusMsg.className = 'status-msg error';
      statusMsg.classList.remove('hidden');
      return;
    }

    const newPlaylist = {
      id: 'custom_' + Date.now(),
      name: name,
      description: desc || 'Custom user curated playlist.',
      image: this.state.newPlaylistCoverBase64 || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      theme: theme,
      tracks: []
    };

    this.state.customPlaylists.push(newPlaylist);
    await this.syncPlaylistsWithBackend();
    
    this.closeCreatePlaylistModal();
    this.renderCustomPlaylistsGrid();
  }

  async deletePlaylist(playlistId) {
    if (confirm('Apakah Anda yakin ingin menghapus playlist ini? Tindakan ini tidak dapat dibatalkan.')) {
      this.state.customPlaylists = this.state.customPlaylists.filter(p => p.id !== playlistId);
      await this.syncPlaylistsWithBackend();
      this.renderCustomPlaylistsGrid();
      this.showPlaylistsView();
    }
  }

  renderCustomPlaylistsGrid() {
    const grid = this.dom.playlistsGrid;
    if (!grid) return;

    if (this.state.customPlaylists.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-surface); border: 1px dashed var(--border-glass); border-radius: 16px;">
          <p style="color: var(--text-muted); margin-bottom: 16px;">Anda belum memiliki playlist kustom.</p>
          <button class="btn-accent" onclick="app.createNewPlaylistModal()" style="margin: 0 auto;">Buat Playlist Pertama</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.state.customPlaylists.map(pl => `
      <div class="catalog-card" onclick="app.openPlaylist('${pl.id}', '${pl.name.replace(/'/g, "\\'")}', '${pl.description.replace(/'/g, "\\'")}', '${pl.image}', 'custom_playlist')">
        <div class="card-img-container">
          <img src="${pl.image}" alt="${pl.name}" class="card-img">
          <button class="card-play-btn" onclick="event.stopPropagation(); app.playCustomPlaylistDirectly('${pl.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <button class="card-delete-btn" onclick="event.stopPropagation(); app.deletePlaylist('${pl.id}')" title="Hapus Playlist">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <div style="padding: 12px 4px 4px 4px;">
          <h4 class="card-title" style="margin-bottom: 4px; font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pl.name}</h4>
          <p class="card-subtitle" style="font-size: 12px; color: var(--text-muted);">${pl.tracks.length} tracks</p>
        </div>
      </div>
    `).join('');
  }

  playCustomPlaylistDirectly(id) {
    const playlist = this.state.customPlaylists.find(p => p.id === id);
    if (playlist && playlist.tracks.length > 0) {
      this.state.tracksQueue = playlist.tracks;
      this.playTrackIndex(0);
    } else {
      alert('Playlist kustom ini masih kosong.');
    }
  }

  findTrackInQueues(trackId) {
    // 1. Search in current queue
    let track = this.state.tracksQueue.find(t => t.id === trackId);
    if (track) return track;

    // 2. Search in current track
    if (this.state.currentTrack && this.state.currentTrack.id === trackId) {
      return this.state.currentTrack;
    }

    // 3. Search in all custom playlists
    for (const pl of this.state.customPlaylists) {
      track = pl.tracks.find(t => t.id === trackId);
      if (track) return track;
    }

    // 4. Search in viral charts
    if (this.state.viralTracks) {
      track = this.state.viralTracks.find(t => t.id === trackId);
      if (track) return track;
    }

    return null;
  }

  openAddToPlaylistModal(trackId) {
    const track = this.findTrackInQueues(trackId);
    if (!track) {
      console.error('Track not found in any queues:', trackId);
      alert('Gagal menemukan lagu untuk ditambahkan.');
      return;
    }

    this.state.trackAddingToPlaylist = track;
    
    const listContainer = document.getElementById('add-to-playlists-list');
    if (!listContainer) return;

    if (this.state.customPlaylists.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          Kamu belum memiliki playlist kustom.
        </div>
      `;
    } else {
      listContainer.innerHTML = this.state.customPlaylists.map(pl => `
        <div class="track-row" onclick="app.addTrackToPlaylist('${pl.id}')" style="padding: 12px 16px; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <img src="${pl.image}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;">
            <div style="min-width: 0;">
              <div style="font-weight: 600; color: var(--text-main); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${pl.tracks.length} tracks</div>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `).join('');
    }

    if (this.dom.addToPlaylistModal) {
      this.dom.addToPlaylistModal.classList.remove('hidden');
    }
  }

  closeAddToPlaylistModal() {
    if (this.dom.addToPlaylistModal) {
      this.dom.addToPlaylistModal.classList.add('hidden');
      this.state.trackAddingToPlaylist = null;
    }
  }

  async addTrackToPlaylist(playlistId) {
    const track = this.state.trackAddingToPlaylist;
    if (!track) return;

    const playlist = this.state.customPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      // Check if already in playlist
      if (playlist.tracks.some(t => t.id === track.id)) {
        alert('Lagu ini sudah ada di playlist.');
        this.closeAddToPlaylistModal();
        return;
      }
      
      playlist.tracks.push(track);
      await this.syncPlaylistsWithBackend();
      this.closeAddToPlaylistModal();
    }
  }

  async removeTrackFromPlaylist(playlistId, trackId) {
    const playlist = this.state.customPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
      await this.syncPlaylistsWithBackend();
      // Re-render current tracks in this playlist
      this.state.tracksQueue = playlist.tracks;
      this.renderPlaylistTracks(playlist.tracks, true, playlistId);
    }
  }

  triggerEditPlaylistCover() {
    const fileInput = document.getElementById('playlist-detail-cover-file');
    if (fileInput) fileInput.click();
  }

  handleEditPlaylistCover(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran berkas tidak boleh melebihi 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const playlistId = this.state.currentViewedPlaylistId;
      if (!playlistId) return;

      const playlist = this.state.customPlaylists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.image = base64;
        
        // Update view UI immediately
        const detailImg = document.getElementById('playlist-detail-img');
        if (detailImg) detailImg.src = base64;

        const vinylLabel = document.getElementById('vinyl-label-img');
        if (vinylLabel) vinylLabel.src = base64;

        await this.syncPlaylistsWithBackend();
        this.renderCustomPlaylistsGrid();
      }
    };
    reader.readAsDataURL(file);
  }

  async changeCurrentPlaylistTheme(theme) {
    const playlistId = this.state.currentViewedPlaylistId;
    if (!playlistId) return;

    const playlist = this.state.customPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.theme = theme;

      // Update parent view & ambient glow classes to cascade theme styles safely
      const viewEl = document.getElementById('playlist-view');
      if (viewEl) {
        viewEl.classList.remove('theme-cyberpunk', 'theme-sunset', 'theme-emerald', 'theme-ocean', 'theme-gold');
        viewEl.classList.add(`theme-${theme}`);
      }
      const glow = document.getElementById('playlist-ambient-glow');
      if (glow) glow.className = `playlist-ambient-glow theme-${theme}`;

      const vibeBadge = document.getElementById('playlist-detail-vibe-badge');
      if (vibeBadge) {
        vibeBadge.className = `vibe-badge theme-${theme}`;
        vibeBadge.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      }

      // Update Vibe Name in dashboard
      let vibeName = "Chill";
      if (theme === 'cyberpunk') vibeName = "Cyberpunk";
      else if (theme === 'sunset') vibeName = "Sunset";
      else if (theme === 'emerald') vibeName = "Forest Zen";
      else if (theme === 'ocean') vibeName = "Deep Blue";
      else if (theme === 'gold') vibeName = "Gold Jazz";
      
      const energyLabel = document.getElementById('stat-tracks-energy');
      if (energyLabel) energyLabel.textContent = vibeName;

      await this.syncPlaylistsWithBackend();
      this.renderCustomPlaylistsGrid();
    }
  }

  async generatePoeticDescription() {
    const playlistId = this.state.currentViewedPlaylistId;
    if (!playlistId) return;

    const playlist = this.state.customPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    const poetryTemplates = [
      `Sebuah gelombang petualangan audio yang melintasi dimensi ${playlist.theme || 'retro'}. Dirancang khusus untuk menemani ruang sunyi dan mengembara dalam imajinasi nada yang mendalam.`,
      `Alunan frekuensi penuh jiwa. Menggabungkan ketukan ritmis dengan melodi melankolis, menciptakan harmoni sempurna untuk sore yang santai dan malam yang tak berujung.`,
      `Kumpulan melodi pilihan yang mengekspresikan getaran hati. Mengalun indah seperti aliran sungai yang tenang, membawa kedamaian dan membakar kembali semangat yang redup.`,
      `Manifestasi visualisasi audio premium. Setiap trek dipilih secara cermat untuk menciptakan pengalaman mendengarkan yang magis, sinematik, dan penuh kenangan indah.`
    ];

    // Pick a random template
    const randomPoetry = poetryTemplates[Math.floor(Math.random() * poetryTemplates.length)];
    
    // Add visual feedback
    const descEl = document.getElementById('playlist-detail-desc');
    const wandBtn = document.getElementById('playlist-ai-wand-btn');
    
    if (wandBtn) {
      wandBtn.style.transform = 'scale(1.3) rotate(360deg)';
      wandBtn.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      setTimeout(() => {
        wandBtn.style.transform = 'none';
      }, 500);
    }

    if (descEl) {
      descEl.style.opacity = '0';
      descEl.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        playlist.description = randomPoetry;
        descEl.textContent = randomPoetry;
        descEl.style.opacity = '1';
        this.syncPlaylistsWithBackend();
      }, 300);
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

// Instantiate Application on Window Load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new KasetApp();
});
