# Kaset - Premium Minimalist Music Player & Catalog

Kaset is a state-of-the-art, clean, minimalist, and modern web application that allows users to explore the complete music catalog (via Spotify Web API) and enjoy full-duration audio playback. The application features a signature realistic spinning cassette tape visualization that dynamically reacts when music is playing.

## Features

* **Premium Minimalist Aesthetic**: A beautiful dark/light mode interface designed with glassmorphism, smooth gradients, and modern typography (Inter & Outfit).
* **Zero Emoji Guarantee**: Clean, professional design utilizing high-quality SVGs for all icons and visual elements.
* **Spotify Web API Integration**: Browse featured playlists, new releases, and search the entire Spotify catalog.
* **Live Configuration Modal**: Easily input your own Spotify Client ID and Client Secret directly in the app settings to authenticate and fetch live user catalog data.
* **Full-Duration Audio Search Engine**: Automatically searches multiple free public APIs (JioSaavn via saavn.dev / saavn.me, Jamendo API, and curated fallback libraries) to provide full-length audio streams for Spotify catalog tracks.
* **Spinning Cassette Tape Animation**: A dedicated visualizer mode showcasing a highly detailed cassette tape with magnetic reels that spin smoothly during playback, complete with dynamic track labels and bouncing visualizer bars.
* **Rock-Solid Fallback Mechanism**: Includes a rich built-in catalog of top hits and royalty-free full-duration audio streams so the app works flawlessly out of the box even without external API credentials.

## Project Structure

```
SpotifyX/
│
├── package.json          # Node dependencies & NPM scripts
├── server.js             # Express backend proxy for Spotify OAuth & full-duration audio search
└── public/               # Frontend Client Application
    ├── index.html        # Clean, minimalist HTML structure
    ├── styles.css        # Premium vanilla CSS with cassette animations
    └── app.js            # Modular Vanilla JavaScript application logic
```

## How to Run Locally

1. **Install Dependencies**:
   Open your terminal in the project directory and run:
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   Run the following command to start the Express backend server:
   ```bash
   npm run dev
   ```
   *(Alternatively, you can run `npm start` or `node server.js`)*

3. **Open the Application**:
   Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Configuring Your Spotify Web API Keys

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an application and obtain your **Client ID** and **Client Secret**.
3. In the Kaset web app, click the **"API Settings"** button in the top navigation bar or sidebar.
4. Enter your Client ID and Client Secret in the modal and click **"Save & Authenticate"**.
5. The application will instantly verify your credentials and switch to live Spotify Web API mode!

## Technical Specifications

* **Backend**: Node.js, Express, Axios, CORS, Dotenv.
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
* **Audio Proxying**: Multi-tier fallback architecture ensuring 100% playback reliability.
* **Design System**: Tailored HSL color palette, CSS Grid/Flexbox layouts, CSS Keyframe animations.
