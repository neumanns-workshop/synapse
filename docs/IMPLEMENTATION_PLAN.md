# Synapse React Native - Phased Implementation Plan

This document outlines the phased approach for building the Synapse React Native application (for iOS, Android, and Web), leveraging the established project structure and dependencies.

## Goal

To incrementally build a robust, user-friendly, and cross-platform word navigation game with features like scoring, persistence, sharing, daily challenges, seasonal collections, authentication, cloud sync, and monetization.

## Key Technologies Utilized

- Expo SDK
- React Native & React Native Web
- TypeScript
- React Navigation
- React Native SVG (for graph visualization)
- React Native Gesture Handler & Reanimated (for interactions/animations)
- React Native Paper (for UI components)
- AsyncStorage (for local persistence)
- React Native Share & ViewShot (for sharing)
- **Supabase (for authentication, cloud sync, and backend services)**
- **Zustand (for state management)**

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
    - Configure basic stack navigation (`@react-navigation/native-stack`) for main screens (e.g., `Home`, `Game`, `Settings`). - ✅
    - Create placeholder screen components. - ✅
2.  **Data Loading:** - ✅ COMPLETE
    - Implement a service or utility to load and parse the **validated** `graph.json` and `definitions.json` from the project location (e.g., `src/data/`). - ✅
    - Consider loading data into React Context or state management. - ✅ (Loaded into Zustand store)
3.  **Static Graph Visualization:** - ✅ COMPLETE
    - In the `Game` screen, implement the `GraphVisualization` component using `react-native-svg`. - ✅
    - Render nodes and edges based on the loaded data. - ✅
    - Ensure basic rendering works on all target platforms. - ✅ (Tested on Web)
4.  **Basic UI Structure:** - ✅ COMPLETE
    - Integrate `react-native-paper`'s `Provider`. - ✅
    - Use basic Paper components for screen structure. - ✅
    - Implement custom theming system (SynapseTheme) with color scheme for node types. - ✅

---

## Phase 2: Core Game Mechanics & Interaction - ✅ COMPLETE

**Goal:** Implement the core gameplay loop, allowing users to interact with the graph and play the game.

1.  **Graph Interaction:** - ✅ COMPLETE
    - Implement panning and zooming for the SVG graph using `react-native-gesture-handler` and `react-native-reanimated`. - ✅ (User decided current state is sufficient)
2.  **Node Selection:** - ✅ COMPLETE
    - Add touch handlers to the SVG nodes. - ✅
    - Implement `onSelectWord` logic to handle node presses, appending valid selections to the player's path history. - ✅
3.  **Game Logic & State Management (using Zustand):** - ✅ COMPLETE
    - **Set up Zustand Store:** ✅ COMPLETE (Initial store with data loading created)
    - Implement logic for selecting start/end words (placeholder `findValidWordPair` added). - ✅
    - **Path Calculations:** - ✅
      - **Global Optimal Path:** Calculate `findShortestPath(startWord, endWord)` once at game start. Store for reference. - ✅
      - **Suggested Path:** Calculate `findShortestPath(currentWord, endWord)` after each player move. Used for showing waypoints and providing feedback about optimal choices from the previous position. - ✅
    - Track the player's actual path (`playerPath` array) in the Zustand store. - ✅
    - Implement win/lose conditions, updating status in the store. - ✅
4.  **Backtracking Implementation:** - ✅ COMPLETE
    - Player path words act as potential checkpoints (optimal/suggested moves). - ✅
    - Clicking a path word shows definition; if it's an unused checkpoint, a "Backtrack" button appears in the dialog. - ✅
    - Used checkpoints are visually distinct in the player path display. - ✅
    - Backtrack events are tracked and included in the game report. - ✅
    - State management (`useGameStore.ts`) handles backtrack logic (updating playerPath, currentWord, marking checkpoint, recalculating suggested path). - ✅
5.  **UI Feedback:** - ✅ COMPLETE
    - Connect UI components to the Zustand store to display game state. - ✅
    - Display current game state (start, end, current, path length) using Paper components. - ✅
    - Highlight `startWord`, `endWord`, and `currentWord` nodes. - ✅
    - Provide visual feedback for node selection/path updates. - ✅
    - **Show Word Definitions:** - ✅
      - Implement interaction (e.g., long press or dedicated button) on graph nodes (including `startWord` and `endWord`) to trigger definition display. - ✅
      - Display definitions in a Paper `Modal` or `Dialog`. - ✅
      - **Limit displayed definitions** (e.g., show only the first 3 senses from `definitions.json`). - ✅
      - Ensure definition text **wraps correctly** within the display component. - ✅
    - **Available Words Display:** - ✅
      - Implement `AvailableWordsDisplay` component showing neighboring words as selectable chips - ✅
      - Color-code words based on similarity (green for high similarity, red for low) - ✅
      - Add sorting options (by similarity or alphabetical) - ✅
      - Allow expanding to show all available options - ✅
      - Integrate component into GameScreen - ✅
    - Implement accordion-style path display showing player's journey with proper coloring for different path types. - ✅
    - Show ellipsis with dots representing suggested path length during gameplay. - ✅
      - Fixed issue with ellipsis dots to ensure the number of dots exactly matches the remaining path length - ✅
      - Improved visual appearance of dots from periods to circle characters with appropriate spacing - ✅
    - Made optimal paths only visible after game completion. - ✅
    - Changed "Hint" button to "Give Up" button to match original game design. - ✅

---

## Phase 3: Scoring, Stats, Achievements, Gamified Events, Persistence & Sharing - ✅ COMPLETE

**Goal:** Add features related to saving progress, tracking scores, achievements, and sharing results.

1.  **Scoring:** - ✅ COMPLETE
    - Implement logic to calculate scores based on path length, time, or other metrics. (_Current game report metrics address this._)
2.  **Stats, Achievements & Gamified Events (Adapted from "Future Ideas"):** - ✅ COMPLETE
    - **Concept:** Introduce systems for tracking broader player statistics, achievements, and potentially themed collection events.
    - **Statistics Tracking:** Design and implement tracking for persistent player statistics (e.g., games won/lost, average path efficiency, unique words discovered, etc.). - ✅ COMPLETE
    - **Achievements System:**
      - Define a set of achievements (e.g., "First Win," "Perfect Game," "Completed X Games," "Found Y Secret Words"). - ✅ COMPLETE
      - Implement logic to unlock and record achievements. - ✅ COMPLETE
      - **Progressive Achievement System:** - ✅ COMPLETE
        - Implemented tiered achievements with multiple levels (e.g., Seasonal Explorer: Spring Awakener → Eternal Cycle Keeper) - ✅
        - Created Word Collector achievement with 6 tiers based on always-available collection completion - ✅
        - Added achievement tier tracking and display in UI - ✅
    - **Collection Events (Based on "Secret Word Hunt" idea):** - ✅ COMPLETE
      - Implement themed wordlists for collection events. - ✅ COMPLETE
      - **Comprehensive Seasonal Collections System:** - ✅ COMPLETE
        - Created 12 seasonal collections covering the entire year with culturally-sensitive themes - ✅
        - Implemented date-based collection activation (Renewal & Reflection, Affection & Kinship, Greening Earth, etc.) - ✅
        - Added year-round collections (Equinox & Solstice, Gratitude & Gathering) - ✅
        - Replaced old Halloween/Valentine's collections with integrated seasonal approach - ✅
      - Track "collected" items/words. - ✅ COMPLETE
    - **Rewards:** Define and link rewards to achievements/collections (e.g., visual badges, UI theme unlocks). - ✅ COMPLETE
    - **UI Display:** - ✅ COMPLETE
      - Enhance `StatsModal.tsx` or create a dedicated "Stats & Achievements" screen. - ✅ COMPLETE
      - Display overall statistics, unlocked achievements, and collected items. - ✅ COMPLETE
      - Game Report could show items collected in that specific game. - ✅ COMPLETE
    - **Statistics System Refinements:** - ✅ COMPLETE
      - **Semantic Efficiency Removal:** Systematically removed semantic efficiency metrics throughout the app (GameReportDisplay, StatsModal, aggregateStats, difficulty analysis, GameReport interface, tests) - ✅
      - **Enhanced Lifetime Stats:** Added "X of Y total" format for achievements display and separate "Total Semantic Distance" metric - ✅
      - **Optimal Games Tracking:** Replaced efficiency with optimal game count as "badge of honor" - tracks games where player path exactly matches optimal path - ✅
3.  **Persistence:** - ✅ COMPLETE
    - Use `@react-native-async-storage/async-storage` to save/load:
      - Game state (allowing resuming games). - ✅ COMPLETE
      - Player statistics and unlocked achievements. - ✅ COMPLETE
      - Collected items from events. - ✅ COMPLETE
    - Update `StatsModal.tsx` or the dedicated screen to display persisted data. - ✅ COMPLETE
    - **Data Architecture for Supabase:** - ✅ COMPLETE
      - **One-Time Purchase Model:** Updated UnifiedDataStore to support freemium model with one-time purchase (not subscription) - ✅
      - **Enhanced Data Structure:** Added email field for authentication, purchase metadata for validation, privacy settings for social features, cross-platform purchase tracking - ✅
      - **Sync-Ready Design:** Prepared data architecture with conflict resolution fields for future cloud sync - ✅
      - **Debug Utilities:** Added `debugResetAllData()` function for complete player data reset during testing - ✅
4.  **Sharing:** - ✅ COMPLETE
    - **Deep Link Challenges:** - ✅ COMPLETE
      - Generated deep links (`/challenge?start=[word]&target=[word]`) for sharing specific game pairs. - ✅
      - Implemented deep link handling in `App.tsx` for app launch and in-app events. - ✅
      - Added `startChallengeGame` logic in `useGameStore.ts` to initialize games from deep links, including temporary save/restore of ongoing regular games. - ✅
      - Validated deep link word pairs for existence and path availability in the graph. - ✅
      - Implemented UI for sharing challenges from the `ReportScreen` (after winning/giving up) and `StatsModal` (for historical games). - ✅
      - Included graph previews (player's path only) in challenge sharing dialogs. - ✅
      - Ensured graceful error handling for invalid challenge links, with user feedback (snackbar) and fallback to a new random game. - ✅

---

## Phase 4: Daily Challenges & Calendar System - ✅ COMPLETE

**Goal:** Implement daily challenges with calendar interface and monetization features.

1.  **Daily Challenge System:** - ✅ COMPLETE
    - **Core Infrastructure:** - ✅ COMPLETE
      - Implemented `DailyChallenge` interface with date-based IDs and word pairs - ✅
      - Created `generateDailyChallenge` function with deterministic seeded random generation - ✅
      - Added daily challenge state management in Zustand store - ✅
      - Integrated daily challenge completion tracking and persistence - ✅
    - **Calendar Interface:** - ✅ COMPLETE
      - Built comprehensive calendar component with month/year navigation - ✅
      - Implemented challenge status indicators (completed, today, missed, future, locked) - ✅
      - Added visual event indicators for seasonal collections and celestial events - ✅
      - **Seasonal Collection Integration:** - ✅ COMPLETE
        - Added colored timeline bars at bottom of calendar days to show active seasonal collections - ✅
        - Implemented comprehensive legend explaining all calendar indicators - ✅
      - **Celestial Event Integration:** - ✅ COMPLETE
        - Added gold 4-pointed star indicators for equinoxes and solstices - ✅
        - Implemented date-specific celestial event detection for 2025-2026 - ✅
        - Added bold text styling for celestial event dates - ✅
    - **Business Model Integration:** - ✅ COMPLETE
      - Daily challenges are free only on their specific day - ✅
      - Past incomplete challenges require upgrade (locked status) - ✅
      - Completed challenges remain accessible regardless of date - ✅
      - Challenge links bypass free game limits for viral sharing - ✅
    - **Daily Challenge UI Improvements:** - ✅ COMPLETE
      - **Aesthetic Overhaul:** Replaced basic text interface with clean, card-like design matching game reports - ✅
      - **Visual Path Display:** Implemented `start → ●●●●● → target` format showing optimal path length with colored dots - ✅
      - **Color Coding:** Applied consistent color scheme (start=green, target=coral, dots=gray) - ✅
      - **Layout Refinements:** Centered path display, moved AI move count to header, removed verbose prompts - ✅
      - **Path Length Calculation Fix:** Corrected dot count to show full optimal path length (including final target selection) - ✅
      - **Background Transparency:** Made challenge card transparent to match main game aesthetic - ✅
2.  **Monetization & Upgrade System:** - ✅ COMPLETE
    - **Free Game Limits:** - ✅ COMPLETE
      - Implemented 2 free random games per day limit - ✅
      - Added game count tracking and daily reset logic - ✅
      - Integrated upgrade prompts when limits are reached - ✅
    - **Upgrade Dialog:** - ✅ COMPLETE
      - Created comprehensive upgrade prompt with feature list - ✅
      - Added "Access to all past daily challenges" as key premium feature - ✅
      - Integrated upgrade triggers throughout the app (game limits, locked challenges) - ✅
      - Prepared infrastructure for payment processing integration - ✅
    - **Viral Sharing Mechanism:** - ✅ COMPLETE
      - Challenge links bypass recipient's free game limits - ✅
      - Encourages social sharing instead of immediate payment - ✅
      - Creates user acquisition through social networks - ✅
3.  **Daily Challenge Link Generation:** - ✅ COMPLETE
    - **Proper URL Format:** - ✅ COMPLETE
      - Fixed daily challenge links to use `/dailychallenge?id=YYYY-MM-DD&start=...&target=...` format - ✅
      - Added `dailyChallengeId` field to GameReport interface for proper link generation - ✅
      - Updated game store to pass daily challenge ID through completion flow - ✅
      - Modified ReportScreen and StatsModal to generate correct daily challenge links - ✅

---

## Phase 5: News System & User Communication - ✅ COMPLETE

**Goal:** Implement a news system to keep users informed about app updates, features, and events.

1.  **News System Architecture:** - ✅ COMPLETE
    - **Integrated News Tab:** Added news functionality as a tab in the existing AboutModal (book icon) rather than standalone modal - ✅
    - **Article Data Structure:** Created simple, extensible news article structure with title, content, date, and priority - ✅
    - **Folder-Based Organization:** Implemented individual post files in `src/data/news/posts/` for easy addition of new content - ✅
    - **Read/Unread Tracking:** Added persistent storage of read status via UnifiedDataStore - ✅
2.  **Visual Design & UX:** - ✅ COMPLETE
    - **Priority Color Coding:** Applied game color scheme to articles (High=coral/red, Medium=blue, Low=green) - ✅
    - **Notification Badges:** Added unread count badges on book icon and News tab label - ✅
    - **Clean Article Display:** Implemented card-based article layout with priority indicators and read status - ✅
    - **Mark All Read:** Added subtle "Mark All Read" button that only appears when there are unread articles - ✅
3.  **Content Management:** - ✅ COMPLETE
    - **Sample Articles:** Created comprehensive sample content covering app features, updates, and seasonal events - ✅
    - **Easy Content Addition:** Established workflow for adding new posts (create file, add to index, import in main array) - ✅
    - **Tab Reorganization:** Restructured AboutModal tabs (Quickstart, News, About) with merged contact information - ✅
4.  **User Engagement Features:** - ✅ COMPLETE
    - **Upgrade Integration:** Added clickable upgrade encouragement in Quickstart tab with smooth modal transitions - ✅
    - **Scrollable Content:** Fixed modal overflow issues with proper ScrollView implementation - ✅
    - **Dynamic Tab Labels:** Show unread count in tab labels (e.g., "News (3)") for better visibility - ✅

---

## Phase 6: Polish & Refinement - ✅ COMPLETE

**Goal:** Enhance the user experience with animations, better UI flow, and additional features.

1.  **Animations & Transitions:** - ✅ COMPLETE
    - In-game animations (e.g., graph path highlighting, node selection feedback) are considered complete. - ✅
    - Use `react-native-reanimated` to add smooth transitions between screens. - ✅ (User opted to consider current state sufficient)
2.  **UI/UX Improvements:** - ✅ COMPLETE
    - Refined UI using `react-native-paper` components: - ✅
      - Consistent styling for `Dialogs` (`WordDefinitionDialog`, `AboutModal`), `Modal` (`StatsModal`), and `Card` (`GameReportDisplay`) containers (surface background, outline border). - ✅
      - Standardized title styling (primary color, bold). - ✅
      - Cohesive button styling (text buttons with primary color for main actions). - ✅
    - **Calendar UI Refinements:** - ✅ COMPLETE
      - Fixed upgrade dialog positioning and visibility issues - ✅
      - Moved event indicators from conflicting top-right to bottom timeline format - ✅
      - Corrected calendar legend to reflect actual business model - ✅
      - Enhanced visual hierarchy with proper status colors and indicators - ✅
    - Revise `AboutModal` to serve as a tutorial; trigger automatically for new users (no game history) or if last game was > 1 month ago.
    - ~~Consider adding game difficulty options~~ (**Removed**: No difficulty concept as each word pair has its own intrinsic challenge based on semantic distance). - ✅
3.  **Styling & Theming:** - ✅ COMPLETE
    - Leveraged `react-native-paper`'s theming capabilities for consistent styling across `WordDefinitionDialog`, `GameReportDisplay`, `AboutModal`, and `StatsModal`. - ✅
    - Ensured layouts are responsive and look good across different device sizes (mobile and web).
4.  **Repository Cleanup:** (New item) - ✅ COMPLETE
    - Review and remove any unused code, comments, or assets.
    - Ensure consistent formatting and linting across the codebase.
    - Check for and update outdated dependencies if feasible and safe.
    - Organize file structure if necessary.

---

## Phase 7: Final Review & Enhancements - ✅ COMPLETE

**Goal:** Ensure application stability, conduct final reviews, and incorporate any planned pre-deployment enhancements.

1.  **Testing:** - ✅ COMPLETE
    - Write unit tests (Jest) for critical game logic, utility functions, and storage services. - ✅
    - Write component tests (`@testing-library/react-native`) for key UI components and screens. - ✅
    - Perform manual testing across target platforms (iOS, Android specific versions, various Web browsers). - ✅
    - Consider setting up end-to-end tests (e.g., Maestro, Detox) if desired. - ✅
    - **Note:** Replaced placeholder test file (`gameMechanics2.test.ts`) with a proper test file (`gameMechanics.test.ts`). - ✅
2.  **Performance Optimization:** - ✅ COMPLETE
    - Profile the app on native devices and web. - ✅
    - Optimize SVG rendering performance for large graphs if necessary. - ✅
    - Analyze web build bundle size and optimize using Expo build profiles or other techniques. - ✅
3.  **Documentation & Finalization:** - ✅ COMPLETE
    - Ensure the `README.md` is up-to-date with final build/run instructions. - ✅
    - Add any necessary code comments or documentation. - ✅

---

## Phase 8: Supabase Backend Integration - ✅ COMPLETE

**Goal:** Implement full backend integration with user authentication, cloud sync, and account management.

1.  **Authentication System:** - ✅ COMPLETE

    - **Supabase Auth Integration:** - ✅ COMPLETE
      - Implemented comprehensive authentication service (`SupabaseService.ts`) - ✅
      - Added sign-up, sign-in, anonymous sign-in, and password reset functionality - ✅
      - Integrated email/password authentication with proper error handling - ✅
      - Added CAPTCHA support for bot protection - ✅
    - **User Profile Management:** - ✅ COMPLETE
      - Created user profiles table with premium status, privacy settings, and purchase tracking - ✅
      - Implemented profile creation, fetching, and updating - ✅
      - Added email preferences and privacy controls - ✅
    - **Authentication UI:** - ✅ COMPLETE
      - Built comprehensive `AuthScreen` with sign-in/sign-up forms - ✅
      - Added proper error display and validation - ✅
      - Implemented smooth transitions between auth states - ✅
      - Added "Account" button in header that shows user status - ✅

2.  **Cloud Data Synchronization:** - ✅ COMPLETE

    - **Bidirectional Sync:** - ✅ COMPLETE
      - Implemented automatic cloud-to-local sync on sign-in - ✅
      - Added local-to-cloud sync for data backup - ✅
      - Created comprehensive data merging logic for conflicts - ✅
      - Added sync metadata tracking (timestamps, device IDs) - ✅
    - **Data Compression:** - ✅ COMPLETE
      - Implemented data compression for efficient cloud storage - ✅
      - Added compression utilities with debug logging - ✅
      - Optimized sync performance with compressed payloads - ✅
    - **Conflict Resolution:** - ✅ COMPLETE
      - Built intelligent merging for game history, achievements, and stats - ✅
      - Implemented progressive counter merging for achievements - ✅
      - Added timestamp-based conflict resolution - ✅

3.  **Account Management:** - ✅ COMPLETE

    - **Account Deletion:** - ✅ COMPLETE
      - Implemented secure account deletion via Supabase Edge Functions - ✅
      - Added data anonymization on account deletion - ✅
      - Created robust retry logic for authentication failures - ✅
      - Preserved user progress while removing personal data - ✅
    - **Sign-Out Flow:** - ✅ COMPLETE
      - Fixed sign-out UI state management bugs - ✅
      - Implemented proper session cleanup and state reset - ✅
      - Added data preservation for anonymous users after sign-out - ✅
      - Fixed daily challenge completion preservation across sign-out - ✅

4.  **Premium Features & Monetization:** - ✅ COMPLETE
    - **Premium Status Tracking:** - ✅ COMPLETE
      - Integrated premium status with Supabase user profiles - ✅
      - Added premium feature gating throughout the app - ✅
      - Implemented free game limits for non-premium users - ✅
    - **Purchase Integration:** - ✅ COMPLETE
      - Added purchase metadata tracking in user profiles - ✅
      - Prepared infrastructure for cross-platform purchase validation - ✅
      - Implemented upgrade prompts and premium feature messaging - ✅

---

## Phase 9: Critical Bug Fixes & State Management - ✅ COMPLETE

**Goal:** Resolve critical bugs in game state management, authentication flow, and data persistence.

1.  **Game State Management Fixes:** - ✅ COMPLETE

    - **State Leakage Between Games:** - ✅ COMPLETE
      - Fixed ghost path bug where old game state appeared in new games - ✅
      - Implemented comprehensive state reset in `startGame` function - ✅
      - Added proper state clearing while preserving essential data - ✅
    - **Premium User Game Blocking:** - ✅ COMPLETE
      - Fixed bug where premium users couldn't start games due to upgrade prompt logic - ✅
      - Moved premium status check earlier in game start flow - ✅
      - Corrected guard clauses to properly handle premium users - ✅

2.  **Authentication & Sign-Out Fixes:** - ✅ COMPLETE

    - **Sign-Out UI State Bug:** - ✅ COMPLETE
      - Fixed issue where "Account" button didn't change to "Sign In" after sign-out - ✅
      - Implemented proper UI state reset in `useGameStore` - ✅
      - Added conservative reset function that preserves user data - ✅
    - **Daily Challenge Exploit Prevention:** - ✅ COMPLETE
      - Fixed bug where users could replay daily challenges by signing out - ✅
      - Modified `resetForNewAnonymousSession` to preserve daily challenge completion - ✅
      - Maintained proper free game limits while preserving challenge status - ✅
    - **Tutorial State Preservation:** - ✅ COMPLETE
      - Fixed tutorial reappearing after sign-out - ✅
      - Added tutorial completion status preservation in anonymous sessions - ✅
      - Maintained user experience continuity across auth state changes - ✅

3.  **Data Persistence Improvements:** - ✅ COMPLETE
    - **Data Compression Bug Fixes:** - ✅ COMPLETE
      - Fixed free games counter reset bug caused by incorrect logical OR usage - ✅
      - Replaced `||` with `??` (nullish coalescing) for proper zero value handling - ✅
      - Ensured data integrity across compression/decompression cycles - ✅
    - **Anonymous User Data Management:** - ✅ COMPLETE
      - Implemented proper data anonymization vs. session reset distinction - ✅
      - Added intelligent data preservation for anonymous users - ✅
      - Fixed state consistency issues between local and cloud data - ✅

---

## Phase 10: Deployment - 🔄 IN PROGRESS

**Goal:** Prepare and execute the release of the application.

1.  **Deployment Preparation:**
    - Build release versions for iOS and Android (App Store / Play Store submission).
    - Build and deploy the final web version to the chosen hosting provider (Vercel, Netlify, etc.).
2.  **Payment Integration:** - 📋 PLANNED
    - Integrate React Native IAP for mobile app purchases
    - OR implement Supabase-based subscription system for cross-platform consistency
    - Set up App Store Connect and Google Play Console for in-app purchases
    - Implement receipt validation and subscription status management

---

## Phase 11: Guerrilla Marketing System - ✅ COMPLETE

**Goal:** Create standalone marketing materials for physical distribution and viral sharing.

1.  **Professional Marketing Cards:** - ✅ COMPLETE
    - **Design System:** Brand-consistent 350×200px cards with Synapse theming - ✅
    - **QR Code Integration:** API-based QR generation with "Scan to Play" prompts - ✅
    - **Print Optimization:** Ready for cardstock printing and cutting - ✅
2.  **AI Challenge Integration:** - ✅ COMPLETE
    - **Heuristic Solver CLI:** Added command-line interface to `heuristic_solver.py` - ✅
    - **Authentic AI Solutions:** Real AI pathfinding instead of random additions - ✅
    - **User-Friendly Padding:** AI solutions + 2-3 moves for achievable targets - ✅
    - **Two-Line Challenge Format:** "The AI got it in X moves,<br>can you do better?" - ✅
3.  **Content Generation:** - ✅ COMPLETE
    - **Themed Challenges:** OKC → Santa Fe summer road trip word pairs - ✅
    - **Word Deduplication:** Ensures no word appears twice across 50 cards - ✅
    - **Data Validation:** All pairs verified against semantic graph - ✅
4.  **Technical Implementation:** - ✅ COMPLETE
    - **Generation System:** `scripts/generatePrintableCards.ts` - ✅
    - **Enhanced Solver:** `scripts/heuristic_solver.py` with JSON output - ✅
    - **Output Files:** `scripts/printable-cards.html` with print-ready materials - ✅

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

_This plan provides a structured path, but phases can overlap, and priorities may shift based on development findings._

---

## Post-V1 / Future Enhancements

This section outlines features and improvements planned for after the initial V1 release.

### Advanced Sharing & Discovery

- **Universal Links (iOS) & App Links (Android):**
  - Configure `synapse.com` domain to enable deep links (`https://synapse.com/challenge?start=...&target=...`) to open the native mobile app directly if installed.
  - Utilize Expo's tools and documentation for `app.json` configuration and hosting necessary association files (`apple-app-site-association`, `assetlinks.json`).
- **App Store Redirection:**
  - Implement logic or use third-party services to guide users to the App Store/Google Play Store if the app is not installed when a deep link is opened.
  - Consider smart app banners on a web landing page or redirects.
- **Basic Text & Screenshot Sharing (General Results/Achievements):**
  - Implement text-based sharing using `react-native`'s `Share` API (e.g., sharing scores, completed achievements).
  - Implement screenshot sharing using `react-native-view-shot` for general results/achievements (distinct from challenge graph previews).
- **General Share Buttons:**
  - Add general share buttons to relevant UI sections (e.g., for achievements, overall stats).

### Advanced Analytics & Social Features

- **Global Analytics Dashboard:**
  - Track global daily challenge completion rates and statistics
  - Implement leaderboards and social comparison features
  - Collect anonymized gameplay analytics for game improvement
- **Social Features:**
  - Enable friend systems and challenge sharing between users
  - Implement user-to-user challenge creation and sharing
  - Add social achievements and collaborative features

### Other Potential Enhancements

_(Placeholder for other future ideas)_
