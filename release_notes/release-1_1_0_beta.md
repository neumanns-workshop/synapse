## 📦 Version 1.1.0-beta

_Release Date: [2025-06-13]_  
_Provisional release notes indicating what is to be done, based on user feedback – thank you for shaping this iteration!_

---

### ✨ Major Additions

- [ ]

---

### 🧠 Gameplay Changes

- [ ] Made some achievements more difficult to get. Minor tweaks.
  - PROSPECTIVE FIX: Make the achievements more difficult to get.

---

### 🧩 UX / Interface Improvements

- [x] Added number of moves to the game report.
  - PROSPECTIVE FIX: Add the number of moves to the game report.

---

### 🎨 Visual / Audio Enhancements

- [ ]

---

### 🪲 Bug Fixes & Technical Improvements

- [ ] Fixed an issue where the Report Screen would show without the theme intact.
  - PROSPECTIVE FIX: Properly separate the Report Screen from the Game Screen.
- [x] Fixed an issue where the graph was not properly displaying in the History item screens.
  - PROSPECTIVE FIX: Re-add the graph the should already be there.
- [ ] Fixed several issues where game or app state was not properly syncing or refreshing, including:
  - [ ] The Contact form would simply hang, perpetually submitting without success.
    - PROSPECTIVE FIX: Is the captcha token refreshing properly?
  - [ ] The daily challenges would not properly redirect to a different game in the player's queue if the player has already completed the current challenge, leading the player to have to play it again or give up to continue.
    - PROSPECTIVE FIX: Re-add logic that might have broken when updating the challenge links.
  - [ ] The date on the challenge link taunts was wrong.
    - PROSPECTIVE FIX: I think they might be using UTC time not CST.
- [ ] Fixed an issue where daily challenges would not properly sync notifications.
  - PROSPECTIVE FIX: Need to fix with the other syncing issues.
- [ ] Fixed an issue where daily challenges would sometimes show the results in the calendar for the wrong day if you complete yesterday's challenge.
  - PROSPECTIVE FIX: you should not be able to play yesterday's challenge without premium, but it should also properly parse and check the link used.

---

### 🧪 Experimental / In-Progress

- [ ] Test game with top-k=4.
  - PROSPECTIVE FIX: Regenerate data files, including heuristic solutions, and add the mode to the Lab Screen.

---

### 📝 Developer Notes

> _What's the focus this cycle? Are you watching feedback on any specific systems?_  
> _Shout out testers, tease future features, or share internal goals._

---
