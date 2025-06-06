# Synapse: Semantic Pathways

A cross-platform word navigation game built with React Native and Expo, where players find paths between words using semantic similarity. Navigate through a graph of interconnected words, aiming to reach the target word from the start word in the fewest steps.

## Features

### Core Gameplay
- **Semantic Word Navigation**: Find paths between words using semantic similarity
- **Daily Word Challenges**: Engaging Wordle-style daily puzzles to keep you coming back for more.
- **Interactive Graph Visualization**: Beautiful SVG-based graph with color-coded nodes and paths
- **Word Definitions**: Tap any word to see its definition
- **Path History**: Visualize your journey with an accordion-style path display
- **Backtracking**: Click on any word in your path to backtrack and try a different route
- **Optimal Path**: View the optimal path after completing a game

### Advanced Features
- **Unlimited Play Mode**: Unlock random pair generation for endless gameplay (Galaxy Brain feature).
- **Performance Optimized**: Frame rate limiting and efficient rendering
- **Cross-Platform**: Works seamlessly on iOS, Android, and Web
- **Deep Linking**: Share and play specific word challenges
- **Achievements**: Track progress with various achievements
- **Word Collections**: Special themed word collections
- **Statistics**: Track your performance and progress
- **Game History**: View and share past games
- **Responsive Design**: Adapts to different screen sizes and orientations

### Technical Features
- **TypeScript**: Type-safe codebase
- **Zustand**: Efficient state management
- **React Native Paper**: Material Design components
- **React Native SVG**: High-performance graph visualization
- **AsyncStorage**: Local data persistence
- **Performance Monitoring**: Built-in performance tracking and optimization

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) / Android Emulator or physical device
- Web Browser (for web development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/neumanns-workshop/synapse
   cd synapse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator/Device
- Press `w` for Web Browser

### Building for Production

#### Web Build
```bash
npm run build:web
```
This generates a `web-build` directory with static assets ready for deployment.

#### Mobile Builds
```bash
# For iOS
expo build:ios

# For Android
expo build:android
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── features/       # Game features (achievements, collections)
├── screens/        # Main app screens
├── services/       # Data and storage services
├── stores/         # State management
├── theme/          # UI theming
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── data/           # Game data files
```

## Data Files

The game requires the following data files, located in `src/data/`:

- `graph.json`: Contains the word graph structure (nodes, edges, coordinates).
- `definitions.json`: Contains word definitions.

**Data Generation Summary:** The data was generated using Python scripts (`scripts/build_graph.py`) with the following parameters and filters applied:
- **Neighbors (K):** 5
- **Definition Filtering:** Words without definitions in WordNet were excluded.
- **Definition Length:** Only definitions <= 90 characters were kept.
- **Max Definitions:** Max 3 definitions stored per word.
- **Final Count:** The resulting dataset includes ~4970 words.

## Performance Optimization

The app includes several performance optimizations:

1. **Frame Rate Limiting**
   - Configurable target FPS (default: 60)
   - Smart throttling to reduce battery usage
   - Smooth animations with minimal impact on performance

2. **Rendering Optimization**
   - Efficient SVG rendering
   - Memoized components
   - Optimized path calculations

3. **State Management**
   - Efficient Zustand store
   - Selective re-rendering
   - Optimized data structures

## Deployment

### Web Deployment
The web build can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### Mobile Deployment
1. **iOS App Store**
   - Generate certificates and provisioning profiles
   - Submit through App Store Connect

2. **Google Play Store**
   - Generate signed APK/Bundle
   - Submit through Google Play Console

## Troubleshooting

If you encounter issues:

1.  Ensure dependencies are installed correctly (`npm install`).
2.  Run `npx expo doctor --fix-dependencies` to check for common Expo/dependency issues.
3.  Check for TypeScript errors: `npx tsc --noEmit`
4.  React DOM warnings about `createRoot` in development mode are expected with Expo and can be safely ignored for development builds.

## Known Development Warnings

- **React DOM createRoot Warning**: This is a common warning in React DOM development mode when using frameworks like Expo: "You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot() before." This warning does not appear in production builds and does not affect functionality.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
*(Note: The GitHub repository at https://github.com/neumanns-workshop/synapse currently indicates a GPL-3.0 license. Please ensure consistency.)*

## Acknowledgments

- WordNet for semantic data
- React Native community
- Expo team
- All contributors and testers