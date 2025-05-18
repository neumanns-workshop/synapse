# Synapse React Native - Phased Implementation Plan

This document outlines a potential phased approach for building the Synapse React Native application (for iOS, Android, and Web), leveraging the established project structure and dependencies.

## Goal

To incrementally build a robust, user-friendly, and cross-platform word navigation game with features like scoring, persistence, and sharing.

## Key Technologies Utilized

*   Expo SDK
*   React Native & React Native Web
*   TypeScript
*   React Navigation
*   React Native SVG (for graph visualization)
*   React Native Gesture Handler & Reanimated (for interactions/animations)
*   React Native Paper (for UI components)
*   AsyncStorage (for local persistence)
*   React Native Share & ViewShot (for sharing)

---

## Phase 0: Data Generation & Validation (K=5) - ✅ COMPLETE

**Goal:** Generate the core game data (`graph.json`, `definitions.json`) using a moderate number of neighbors (K=5) and validate its quality for gameplay.

1.  **Prerequisites:** Ensure Python environment, required libraries, embeddings, and NLTK data are set up. - ✅
2.  **Generate Graph (K=5):** Run the graph building script (`scripts/build_graph.py`) with `-k 5`. Script also fetches definitions and filters words without definitions or with definitions > 90 chars. - ✅
3.  **Generate Definitions:** Handled within the consolidated `build_graph.py`. - ✅
4.  **Place Data:** Copy the validated `graph.json` and `definitions.json` into `new/src/data/`. - ✅

---

## Phase 1: Foundation & Static Display - ✅ COMPLETE

**Goal:** Establish basic navigation, load the **validated** data, and render a static view of the word graph.

1.  **Navigation Setup:** - ✅ COMPLETE
    *   Configure basic stack navigation (`@react-navigation/native-stack`) for main screens (e.g., `Home`, `Game`, `Settings`). - ✅
    *   Create placeholder screen components. - ✅
2.  **Data Loading:** - ✅ COMPLETE
    *   Implement a service or utility to load and parse the **validated** `graph.json` and `definitions.json` from the project location (e.g., `src/data/`). - ✅
    *   Consider loading data into React Context or state management. - ✅ (Loaded into Zustand store)
3.  **Static Graph Visualization:** - ✅ COMPLETE
    *   In the `Game` screen, implement the `GraphVisualization` component using `react-native-svg`. - ✅
    *   Render nodes and edges based on the loaded data. - ✅
    *   Ensure basic rendering works on all target platforms. - ✅ (Tested on Web)
4.  **Basic UI Structure:** - ✅ COMPLETE
    *   Integrate `react-native-paper`'s `Provider`. - ✅
    *   Use basic Paper components for screen structure. - ✅
    *   Implement custom theming system (SynapseTheme) with color scheme for node types. - ✅

---

## Phase 2: Core Game Mechanics & Interaction - ✅ COMPLETE

**Goal:** Implement the core gameplay loop, allowing users to interact with the graph and play the game.

1.  **Graph Interaction:** - ✅ COMPLETE
    *   Implement panning and zooming for the SVG graph using `react-native-gesture-handler` and `react-native-reanimated`. - ✅ (User decided current state is sufficient)
2.  **Node Selection:** - ✅ COMPLETE
    *   Add touch handlers to the SVG nodes. - ✅
    *   Implement `onSelectWord` logic to handle node presses, appending valid selections to the player's path history. - ✅
3.  **Game Logic & State Management (using Zustand):** - ✅ COMPLETE
    *   **Set up Zustand Store:** ✅ COMPLETE (Initial store with data loading created)
    *   Implement logic for selecting start/end words (placeholder `findValidWordPair` added). - ✅
    *   **Path Calculations:** - ✅
        *   **Global Optimal Path:** Calculate `findShortestPath(startWord, endWord)` once at game start. Store for reference. - ✅
        *   **Suggested Path:** Calculate `findShortestPath(currentWord, endWord)` after each player move. Used for showing waypoints and providing feedback about optimal choices from the previous  position. - ✅
    *   Track the player's actual path (`playerPath` array) in the Zustand store. - ✅
    *   Implement win/lose conditions, updating status in the store. - ✅
4.  **Backtracking Implementation:** - ✅ COMPLETE
    *   Player path words act as potential checkpoints (optimal/suggested moves). - ✅
    *   Clicking a path word shows definition; if it's an unused checkpoint, a "Backtrack" button appears in the dialog. - ✅
    *   Used checkpoints are visually distinct in the player path display. - ✅
    *   Backtrack events are tracked and included in the game report. - ✅
    *   State management (`useGameStore.ts`) handles backtrack logic (updating playerPath, currentWord, marking checkpoint, recalculating suggested path). - ✅
5.  **UI Feedback:** - ✅ COMPLETE
    *   Connect UI components to the Zustand store to display game state. - ✅
    *   Display current game state (start, end, current, path length) using Paper components. - ✅
    *   Highlight `startWord`, `endWord`, and `currentWord` nodes. - ✅
    *   Provide visual feedback for node selection/path updates. - ✅
    *   **Show Word Definitions:** - ✅
        *   Implement interaction (e.g., long press or dedicated button) on graph nodes (including `startWord` and `endWord`) to trigger definition display. - ✅
        *   Display definitions in a Paper `Modal` or `Dialog`. - ✅
        *   **Limit displayed definitions** (e.g., show only the first 3 senses from `definitions.json`). - ✅
        *   Ensure definition text **wraps correctly** within the display component. - ✅
    *   **Available Words Display:** - ✅
        *   Implement `AvailableWordsDisplay` component showing neighboring words as selectable chips - ✅
        *   Color-code words based on similarity (green for high similarity, red for low) - ✅
        *   Add sorting options (by similarity or alphabetical) - ✅
        *   Allow expanding to show all available options - ✅
        *   Integrate component into GameScreen - ✅
    *   Implement accordion-style path display showing player's journey with proper coloring for different path types. - ✅
    *   Show ellipsis with dots representing suggested path length during gameplay. - ✅
        *   Fixed issue with ellipsis dots to ensure the number of dots exactly matches the remaining path length - ✅
        *   Improved visual appearance of dots from periods to circle characters with appropriate spacing - ✅
    *   Made optimal paths only visible after game completion. - ✅
    *   Changed "Hint" button to "Give Up" button to match original game design. - ✅

---

## Phase 3: Scoring, Stats, Achievements, Gamified Events, Persistence & Sharing - 🔄 IN PROGRESS

**Goal:** Add features related to saving progress, tracking scores, achievements, and sharing results.

1.  **Scoring:** - ✅ COMPLETE
    *   Implement logic to calculate scores based on path length, time, or other metrics. (*Current game report metrics address this.*)
2.  **Stats, Achievements & Gamified Events (Adapted from "Future Ideas"):** - ✅ COMPLETE
    *   **Concept:** Introduce systems for tracking broader player statistics, achievements, and potentially themed collection events.
    *   **Statistics Tracking:** Design and implement tracking for persistent player statistics (e.g., games won/lost, average path efficiency, unique words discovered, etc.). - ✅ COMPLETE
    *   **Achievements System:**
        *   Define a set of achievements (e.g., "First Win," "Perfect Game," "Completed X Games," "Found Y Secret Words"). - ✅ COMPLETE
        *   Implement logic to unlock and record achievements. - ✅ COMPLETE
    *   **Collection Events (Based on "Secret Word Hunt" idea):** - ✅ COMPLETE
        *   Implement themed wordlists for collection events. - ✅ COMPLETE
        *   Track "collected" items/words. - ✅ COMPLETE
    *   **Rewards:** Define and link rewards to achievements/collections (e.g., visual badges, UI theme unlocks). - ✅ COMPLETE
    *   **UI Display:** - ✅ COMPLETE
        *   Enhance `StatsModal.tsx` or create a dedicated "Stats & Achievements" screen. - ✅ COMPLETE
        *   Display overall statistics, unlocked achievements, and collected items. - ✅ COMPLETE
        *   Game Report could show items collected in that specific game. - ✅ COMPLETE
3.  **Persistence:** - ✅ COMPLETE
    *   Use `@react-native-async-storage/async-storage` to save/load:
        *   Game state (allowing resuming games). - ✅ COMPLETE
        *   Player statistics and unlocked achievements. - ✅ COMPLETE
        *   Collected items from events. - ✅ COMPLETE
    *   Update `StatsModal.tsx` or the dedicated screen to display persisted data. - ✅ COMPLETE
4.  **Sharing:** - ✅ COMPLETE
    *   **Deep Link Challenges:** - ✅ COMPLETE
        *   Generated deep links (`/challenge?start=[word]&target=[word]`) for sharing specific game pairs. - ✅
        *   Implemented deep link handling in `App.tsx` for app launch and in-app events. - ✅
        *   Added `startChallengeGame` logic in `useGameStore.ts` to initialize games from deep links, including temporary save/restore of ongoing regular games. - ✅
        *   Validated deep link word pairs for existence and path availability in the graph. - ✅
        *   Implemented UI for sharing challenges from the `ReportScreen` (after winning/giving up) and `StatsModal` (for historical games). - ✅
        *   Included graph previews (player's path only) in challenge sharing dialogs. - ✅
        *   Ensured graceful error handling for invalid challenge links, with user feedback (snackbar) and fallback to a new random game. - ✅

---

## Phase 4: Polish & Refinement - 🔄 IN PROGRESS

**Goal:** Enhance the user experience with animations, better UI flow, and additional features.

1.  **Animations & Transitions:**
    *   Use `react-native-reanimated` to add smooth transitions between screens or animations within the game (e.g., highlighting paths, node selection feedback).
2.  **UI/UX Improvements:** - ✅ COMPLETE
    *   Refined UI using `react-native-paper` components: - ✅
        *   Consistent styling for `Dialogs` (`WordDefinitionDialog`, `AboutModal`), `Modal` (`StatsModal`), and `Card` (`GameReportDisplay`) containers (surface background, outline border). - ✅
        *   Standardized title styling (primary color, bold). - ✅
        *   Cohesive button styling (text buttons with primary color for main actions). - ✅
    *   Implement a tutorial or onboarding flow for new users.
    *   ~~Consider adding game difficulty options~~ (**Removed**: No difficulty concept as each word pair has its own intrinsic challenge based on semantic distance). - ✅
3.  **Styling & Theming:** - ✅ COMPLETE
    *   Leveraged `react-native-paper`'s theming capabilities for consistent styling across `WordDefinitionDialog`, `GameReportDisplay`, `AboutModal`, and `StatsModal`. - ✅
    *   Ensured layouts are responsive and look good across different device sizes (mobile and web).
4.  **Repository Cleanup:** (New item)
    *   Review and remove any unused code, comments, or assets.
    *   Ensure consistent formatting and linting across the codebase.
    *   Check for and update outdated dependencies if feasible and safe.
    *   Organize file structure if necessary.

---

## Phase 5: Testing & Deployment

**Goal:** Ensure application stability, performance, and prepare for release.

1.  **Testing:**
    *   Write unit tests (Jest) for critical game logic, utility functions, and storage services.
    *   Write component tests (`@testing-library/react-native`) for key UI components and screens.
    *   Perform manual testing across target platforms (iOS, Android specific versions, various Web browsers).
    *   Consider setting up end-to-end tests (e.g., Maestro, Detox) if desired.
2.  **Performance Optimization:**
    *   Profile the app on native devices and web.
    *   Optimize SVG rendering performance for large graphs if necessary.
    *   Analyze web build bundle size and optimize using Expo build profiles or other techniques.
3.  **Documentation & Finalization:**
    *   Ensure the `README.md` is up-to-date with final build/run instructions.
    *   Add any necessary code comments or documentation.
4.  **Deployment:**
    *   Build release versions for iOS and Android (App Store / Play Store submission).
    *   Build and deploy the final web version to the chosen hosting provider (Vercel, Netlify, etc.).

---

## Additional Optimizations

### Cross-Platform Compatibility Improvements

1. **Shadow Rendering:**
   - Implemented platform-specific shadow styling with `boxShadow` for web
   - Created a `getShadowStyles` utility function in `src/utils/StyleUtils.js` for consistent shadow styling across platforms
   
2. **Pointer Events Handling:**
   - Added a `getPointerEventStyles` utility function to handle pointer events properly on web vs. native platforms
   - This prevents the "props.pointerEvents is deprecated" warning on web

3. **Web Entry Point:**
   - Created a custom `src/index.web.js` entry point for better web support
   - Modified webpack configuration to use the custom web entry point
   - Added `ExpoRoot` wrapper component for cleaner separation between entry points

4. **React Native Web Compatibility:**
   - Updated styling to use web-compatible properties where needed
   - Implemented platform-specific code branching with `Platform.select()`
   - Used consistent style patterns that work across iOS, Android, and Web

### Recent UI/UX Improvements

1. **Path Display:**
   - Changed from chip-based status bar to accordion-style path display showing sequential journey
   - Words are color-coded based on their role (start=green, current=blue, end=red, optimal=orange, suggested=purple)
   - Added ellipsis with dots representing suggested path length
   - All words clickable to view definitions

2. **Game Flow:**
   - Changed "Restart" button to "New Game" for clarity
   - Changed "Hint" button to "Give Up" to match original game philosophy
   - Made optimal paths only visible after game completion
   - Added context-aware PathDisplayConfigurator to only show appropriate options

3. **Button/Icon Improvements:**
   - Used more appropriate icons (play icon for start, flag for end, etc.)
   - Improved button labels to better represent their functions

### Known Development Warnings

Some warnings may appear in development mode but do not affect production builds:

1. **React DOM createRoot Warning:**
   - This is a common warning in React DOM development mode when using frameworks like Expo
   - The warning does not appear in production builds and does not affect functionality
   - "You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot() before."

*This plan provides a structured path, but phases can overlap, and priorities may shift based on development findings.*

--- 

## Post-V1 / Future Enhancements

This section outlines features and improvements planned for after the initial V1 release.

### Advanced Sharing & Discovery

*   **Universal Links (iOS) & App Links (Android):**
    *   Configure `synapse.com` domain to enable deep links (`https://synapse.com/challenge?start=...&target=...`) to open the native mobile app directly if installed.
    *   Utilize Expo's tools and documentation for `app.json` configuration and hosting necessary association files (`apple-app-site-association`, `assetlinks.json`).
*   **App Store Redirection:**
    *   Implement logic or use third-party services to guide users to the App Store/Google Play Store if the app is not installed when a deep link is opened.
    *   Consider smart app banners on a web landing page or redirects.
*   **Basic Text & Screenshot Sharing (General Results/Achievements):** 
    *   Implement text-based sharing using `react-native`'s `Share` API (e.g., sharing scores, completed achievements).
    *   Implement screenshot sharing using `react-native-view-shot` for general results/achievements (distinct from challenge graph previews).
*   **General Share Buttons:**
    *   Add general share buttons to relevant UI sections (e.g., for achievements, overall stats).

### Other Potential Enhancements
*(Placeholder for other future ideas)* 