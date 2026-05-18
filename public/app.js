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
      searchQuery: ''
    };

    // DOM Elements Cache
    this.dom = {
      audio: document.getElementById('main-audio-player'),
      appContainer: document.getElementById('app-container'),
      
      // Navigation
      navHome: document.getElementById('nav-home'),
      navExplore: document.getElementById('nav-explore'),
      navCassette: document.getElementById('nav-cassette'),
      
      // Views
      homeView: document.getElementById('home-view'),
      searchView: document.getElementById('search-view'),
      playlistView: document.getElementById('playlist-view'),
      cassetteView: document.getElementById('cassette-view'),
      
      // Grids & Containers
      featuredGrid: document.getElementById('featured-playlists-grid'),
      newReleasesGrid: document.getElementById('new-releases-grid'),
      searchResultsGrid: document.getElementById('search-results-grid'),
      playlistTracksContainer: document.getElementById('playlist-tracks-container'),
      
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
    await this.fetchFeaturedCatalog();
    await this.loadTrending();
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

  /**
   * Open Playlist / Album Detail View
   */
  async openPlaylist(id, name, desc, image, type) {
    this.switchView('playlist-view');
    
    document.getElementById('playlist-detail-name').textContent = name;
    document.getElementById('playlist-detail-desc').textContent = desc;
    document.getElementById('playlist-detail-img').src = image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
    document.getElementById('playlist-detail-type').textContent = type.toUpperCase();

    this.dom.playlistTracksContainer.innerHTML = `<div class="loading-spinner"></div>`;

    try {
      const response = await fetch(`/api/spotify/tracks?id=${id}&type=${type}`);
      const data = await response.json();

      if (data.success) {
        this.state.tracksQueue = data.tracks;
        this.renderPlaylistTracks(data.tracks);
      }
    } catch (error) {
      this.dom.playlistTracksContainer.innerHTML = `<div class="status-msg error">Failed to load playlist tracks.</div>`;
    }
  }

  renderPlaylistTracks(tracks) {
    this.dom.playlistTracksContainer.innerHTML = tracks.map((track, idx) => `
      <div class="track-row ${this.state.currentTrack && this.state.currentTrack.id === track.id ? 'active' : ''}" onclick="app.playTrackIndex(${idx})">
        <span class="track-number">${idx + 1}</span>
        <img src="${track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}" alt="${track.title}" class="track-thumb">
        <div class="track-info">
          <div class="track-title">${track.title}</div>
          <div class="track-artist">${track.artist}</div>
        </div>
        <div class="track-album">${track.album || ''}</div>
        <div class="track-duration">${this.formatTime(track.duration || 210)}</div>
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
              <div class="track-duration">${this.formatTime(track.duration || 210)}</div>
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

    if (viewId === 'home-view') this.dom.navHome.classList.add('active');
    if (viewId === 'cassette-view') this.dom.navCassette.classList.add('active');
  }

  showHomeView() {
    this.switchView('home-view');
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

    // INSTANT PLAYBACK (Zero Delay Guarantee)
    const instantAudio = track.preview_url || 'https://prod-1.storage.jamendo.com/?trackid=1884964&format=mp31&from=app-56d30c95';
    track.audioSource = track.preview_url ? 'Spotify Preview (30s)' : 'Curated Stream';
    this.dom.audio.src = instantAudio;
    this.dom.audio.play().catch(e => console.error('Instant play failed:', e));
    this.updateAudioSourceBadge(`Playing ${track.audioSource} • Searching full stream...`);

    // Background search for full duration audio
    fetch(`/api/audio/search?track=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`)
      .then(res => res.json())
      .then(data => {
        // Only upgrade if the user hasn't switched tracks while waiting
        if (this.state.currentTrack && this.state.currentTrack.id === track.id && data.success && data.audio_url) {
          const currentTime = this.dom.audio.currentTime;
          track.audioSource = data.source || 'Stream';
          this.dom.audio.src = data.audio_url;
          this.dom.audio.load();

          const onCanPlay = () => {
            this.dom.audio.currentTime = currentTime;
            this.dom.audio.play().catch(e => console.error('Full stream play failed:', e));
            this.updateAudioSourceBadge(`Playing full duration (${track.audioSource})`);
            this.dom.audio.removeEventListener('canplay', onCanPlay);
          };
          this.dom.audio.addEventListener('canplay', onCanPlay);
        }
      })
      .catch(err => {
        console.log('Background audio search finished/failed, keeping instant stream:', err);
        this.updateAudioSourceBadge(`Playing ${track.audioSource}`);
      });
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

    if (this.dom.audio.paused) {
      this.dom.audio.play();
    } else {
      this.dom.audio.pause();
    }
  }

  onPlayStateChange(isPlaying) {
    this.state.isPlaying = isPlaying;
    if (isPlaying) {
      this.dom.iconPlay.classList.add('hidden');
      this.dom.iconPause.classList.remove('hidden');
      if (this.dom.popupIconPlay) this.dom.popupIconPlay.classList.add('hidden');
      if (this.dom.popupIconPause) this.dom.popupIconPause.classList.remove('hidden');
      this.dom.spinningCassette.classList.add('playing');
    } else {
      this.dom.iconPlay.classList.remove('hidden');
      this.dom.iconPause.classList.add('hidden');
      if (this.dom.popupIconPlay) this.dom.popupIconPlay.classList.remove('hidden');
      if (this.dom.popupIconPause) this.dom.popupIconPause.classList.add('hidden');
      this.dom.spinningCassette.classList.remove('playing');
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

    if (this.dom.audio.currentTime > 3) {
      this.dom.audio.currentTime = 0;
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
      this.dom.audio.currentTime = 0;
      this.dom.audio.play();
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
    const { currentTime, duration } = this.dom.audio;
    if (isNaN(duration)) return;

    const progressPercent = (currentTime / duration) * 100;
    this.dom.progressFilled.style.width = `${progressPercent}%`;
    this.dom.timeCurrent.textContent = this.formatTime(currentTime);
    this.dom.timeTotal.textContent = this.formatTime(duration);
  }

  seekAudio(event) {
    const { duration } = this.dom.audio;
    if (isNaN(duration)) return;

    const rect = this.dom.progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * duration;
    
    this.dom.audio.currentTime = seekTime;
  }

  setVolume(value) {
    this.dom.audio.volume = value;
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
