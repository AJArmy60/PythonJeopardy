// game.js
// All game state and logic for the Python Jeopardy game.
// No server needed — everything runs in the browser.
//
// How to use from your frontend JS:
//
//   GameState.addTeam("Team A");
//   GameState.awardPoints("Team A", 400);
//   GameState.markAnswered("loops_400");
//   GameState.getState();  // returns current scores, teams, answered list
//   GameState.reset();     // wipe scores + answered, keep teams
//   GameState.fullReset(); // wipe everything

const GameState = (() => {
  // Private state
  let teams = [];       // ordered list of team names
  let scores = {};      // { "Team A": 400, "Team B": 200 }
  let answered = new Set(); // set of answered question IDs

  // ── Teams ──────────────────────────────────────────────────────────────────

  /**
   * Add a new team. Returns true on success, false if name is blank or already exists.
   */
  function addTeam(name) {
    name = name.trim();
    if (!name || scores.hasOwnProperty(name)) return false;
    teams.push(name);
    scores[name] = 0;
    return true;
  }

  /**
   * Remove a team by name. Returns true on success, false if not found.
   */
  function removeTeam(name) {
    if (!scores.hasOwnProperty(name)) return false;
    teams = teams.filter((t) => t !== name);
    delete scores[name];
    return true;
  }

  /**
   * Returns the list of team names in order.
   */
  function getTeams() {
    return [...teams];
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  /**
   * Add points to a team. Pass a negative value to deduct (wrong answer penalty).
   * Returns true on success, false if the team doesn't exist.
   */
  function awardPoints(teamName, points) {
    if (!scores.hasOwnProperty(teamName)) return false;
    scores[teamName] += points;
    return true;
  }

  /**
   * Returns a copy of the scores object: { "Team A": 400, ... }
   */
  function getScores() {
    return { ...scores };
  }

  /**
   * Returns the team currently in the lead, or null if no teams exist.
   * In a tie, returns the first team alphabetically.
   */
  function getLeader() {
    if (teams.length === 0) return null;
    return teams.reduce((leader, team) =>
      scores[team] > scores[leader] ? team : leader
    );
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  /**
   * Mark a question ID as answered so it can't be selected again.
   */
  function markAnswered(questionId) {
    answered.add(questionId);
  }

  /**
   * Returns true if the question has already been answered.
   */
  function isAnswered(questionId) {
    return answered.has(questionId);
  }

  /**
   * Returns true if every question on the board has been answered.
   */
  function isBoardComplete() {
    const allIds = Object.values(QUESTIONS)
      .flat()
      .map((q) => q.id);
    return allIds.every((id) => answered.has(id));
  }

  // ── Lookup Helpers ─────────────────────────────────────────────────────────

  /**
   * Find and return a question object by its ID, or null if not found.
   */
  function findQuestion(questionId) {
    for (const categoryQuestions of Object.values(QUESTIONS)) {
      const match = categoryQuestions.find((q) => q.id === questionId);
      if (match) return match;
    }
    return null;
  }

  /**
   * Build the full board structure the frontend needs to render the grid.
   * Returns an array of category objects, each with their clues and answered status.
   *
   * Example return value:
   * [
   *   {
   *     name: "Python Basics",
   *     clues: [
   *       { id: "basics_200", value: 200, answered: false },
   *       ...
   *     ]
   *   },
   *   ...
   * ]
   */
  function getBoard() {
    return CATEGORIES.map((cat) => ({
      name: cat,
      clues: QUESTIONS[cat].map((q) => ({
        id: q.id,
        value: q.value,
        answered: isAnswered(q.id),
      })),
    }));
  }

  // ── State Snapshot ─────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of the full game state.
   * Useful for saving to sessionStorage or passing to a results screen.
   */
  function getState() {
    return {
      teams: getTeams(),
      scores: getScores(),
      answered: [...answered],
      boardComplete: isBoardComplete(),
      leader: getLeader(),
    };
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  /**
   * Soft reset: zero out all scores and clear answered questions.
   * Teams are kept so you can play again without re-entering names.
   */
  function reset() {
    for (const team of teams) {
      scores[team] = 0;
    }
    answered.clear();
  }

  /**
   * Full reset: wipe everything back to a blank slate.
   */
  function fullReset() {
    teams = [];
    scores = {};
    answered.clear();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // Teams
    addTeam,
    removeTeam,
    getTeams,
    // Scoring
    awardPoints,
    getScores,
    getLeader,
    // Questions
    markAnswered,
    isAnswered,
    isBoardComplete,
    findQuestion,
    getBoard,
    // State
    getState,
    // Reset
    reset,
    fullReset,
  };
})();
