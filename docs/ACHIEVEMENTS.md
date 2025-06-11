# Synapse Game Achievements & Trophies

This file lists potential achievements and trophies to be implemented in the game. Each item can be checked off as it's developed.

## I. Path & Performance Trophies

- [ ] **The Perfectionist:** Player wins AND their path length exactly matches the optimal path length.
- [ ] **As the Crow Flies:** Player achieves the optimal path on a game where the optimal path length is the minimum possible (e.g., 4 steps).
- [ ] **Master Navigator:** Player successfully navigates a particularly long optimal path (e.g., 7+ steps).
- [ ] **Efficient Explorer:** Player wins with a path length <= optimal path length + 1.
- [ ] **Comeback King/Queen:** Player wins AND their path length is at least N more than optimal (e.g., `playerPath.length >= optimalPath.length + 3`).

## II. Word Choice & Knowledge Trophies

- [ ] **Rare Find:** Player uses a particularly uncommon word in their path. (Note: Requires word frequency data).
- [ ] **Lexicographer's Nod:** Player looks up definitions for a certain number of unique words in a single game (e.g., 5+). (Note: Needs per-game unique definition view count tracking).

## III. Game Completion & Streak Trophies

(Note: All trophies in this section require persistent storage of game history/player stats).

- [ ] **First Victory!:** Awarded for winning their very first game.
- [ ] **Winning Streak (Small):** Win 3 games in a row.
- [ ] **Winning Streak (Medium):** Win 5 games in a row.
- [ ] **Winning Streak (Large):** Win 10 games in a row.
- [ ] **Daily Player:** Play a game on X consecutive days.

## IV. Secret Word Hunt Trophies

(Note: All trophies in this section depend on the Secret Word Hunt system being implemented).

- [ ] **Theme Discoverer: [Theme Name]:** Finding your first secret word in an active theme.
- [ ] **Theme Collector: [Theme Name]:** Finding ALL secret words in an active theme.

## V. Fun & Quirky Trophies

- [ ] **Scenic Router:** Player's path is significantly longer than optimal but still results in a win (e.g., >150% of optimal length).
- [ ] **Alphabet Acrobat:** Player's path consists of X words all starting with the same letter.
- [ ] **The Long & Short of It:** Player's winning path contains at least one very long word (e.g., 12+ letters) AND at least one very short word (e.g., 3-4 letters).
- [ ] **Almost There! (Given Up):** Player chooses to "Give Up" when their current word is only one step away from the target end word. (Note: Requires check during "give up" logic).

## VI. Strategic Play & Decision-Making Trophies

- [ ] **No Backtracking:** Player completes a game without using the backtrack feature at all. (Note: Depends on backtrack feature).
- [ ] **One Shot Wonder:** Player's first choice from the start word is on an optimal path, and they continue optimally to the end.
- [ ] **Playing it Safe:** Player chooses the _most similar_ neighboring word for 3 (or 5) consecutive moves. (Note: Needs tracking of choice rank from available k options).
- [ ] **Bold Gambler:** Player chooses the _least similar_ (among the k displayed) neighboring word for 3 (or 5) consecutive moves. (Note: Needs tracking of choice rank from available k options).
- [ ] **Definition Confirmed:** Player views the definition of a word and _then_ selects that word as their next move. (Note: Needs event sequence tracking; "This Will Do" is a specific version).
- [ ] **This Will Do:** Player views the definition of _only one_ available neighboring word and then immediately selects that specific word. (Note: Needs turn-specific tracking of single definition view vs. choice).
- [ ] **Déjà Vu:** Player's path includes selecting a word that is a direct neighbor of a word visited at least 2 steps prior (but not the immediately preceding word).
- [ ] **Full House Definitions:** Before making a move, player views the definitions of all currently available neighboring words. (Note: Needs turn-specific tracking of all neighbor definitions viewed for current choice set).

## VII. Graph Exploration & Discovery Trophies

- [ ] **Deep Dive:** Player's path length plus unique words revealed in "Available Words" exceeds a certain threshold (e.g., 25) in a single game. (Note: Needs tracking of all unique words shown in AvailableWordsDisplay per game).
- [ ] **Well-Connected:** Player visits a node that has a high number of direct connections (e.g., 7+ neighbors in the graph data).

## VIII. Meta & Engagement Trophies

(Note: All trophies in this section require persistent storage, potentially timestamps, and tracking of other metrics).

- [ ] **Night Owl / Early Bird:** Completing a game during specific late-night or early-morning hours.
- [ ] **Weekend Warrior:** Playing X number of games over a single weekend.
- [ ] **Consistent Improver:** Achieving a better "Path Efficiency Index" (if implemented) than their previous game, for several games in a row.
- [ ] **The Collector:** Successfully earning a certain total number of unique trophies (e.g., 10 different trophies).
