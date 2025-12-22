# Auranova

A 3D musical universe visualization where your Spotify listening history becomes a navigable galaxy — artists as stars, genres as nebulae, connections as gravitational links.

![Auranova Screenshot](./screenshot.png)

## Features

- **Artists as Stars**: Your top artists become glowing stars in 3D space
- **Genre Nebulae**: Related genres cluster together as colorful nebula clouds
- **Musical Connections**: See how your artists connect through shared genres
- **Time Travel**: Switch between short-term, medium-term, and all-time listening data
- **Interactive Exploration**: Fly through your musical universe with smooth camera controls
- **Audio Previews**: Click on a star to hear a preview of the artist

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict mode)
- **Build**: Vite
- **3D Graphics**: React Three Fiber + Drei + Postprocessing
- **Shaders**: Custom GLSL shaders for stars and nebulae
- **Physics**: D3.js force simulation for layout
- **State**: Zustand
- **API Caching**: TanStack Query
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Spotify account

### Spotify Setup

1. Create a Spotify Developer account at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Create a new app and get your Client ID
3. Add `http://localhost:5173/callback` as a Redirect URI
4. See [SPOTIFY_SETUP.md](./SPOTIFY_SETUP.md) for detailed instructions

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/auranova.git
cd auranova

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Spotify Client ID
# VITE_SPOTIFY_CLIENT_ID=your_client_id_here

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm lint       # Run ESLint
pnpm test       # Run tests
pnpm format     # Format code with Prettier
```

## Project Structure

```
src/
├── api/
│   ├── spotify/      # Spotify API client, auth, endpoints
│   └── hooks/        # TanStack Query hooks
├── components/
│   ├── canvas/       # Three.js scene components
│   ├── ui/           # UI components
│   ├── effects/      # Post-processing effects
│   └── layout/       # Layout components
├── shaders/          # GLSL vertex/fragment shaders
├── simulation/       # D3 force simulation, clustering
├── stores/           # Zustand stores
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the development plan.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for music data
- [Three.js](https://threejs.org/) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for 3D graphics
- [D3.js](https://d3js.org/) for force-directed layouts
