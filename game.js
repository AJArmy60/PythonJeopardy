// game.js
// All game state and logic for the Python Jeopardy game.
// Loads questions directly from questions.json — no separate questions.js needed.
//
// IMPORTANT: Call GameState.init() once when the page loads before anything else.
// It's async because it fetches the JSON file.
//
// Basic usage:
//
//   await GameState.init();         // load questions.json
//   GameState.addTeam("Team A");
//   GameState.awardPoints("Team A", 400);
//   GameState.markAnswered("loops_400");
//   GameState.getBoard();           // build the grid
//   GameState.getState();           // snapshot of scores, teams, answered
//   GameState.reset();              // wipe scores + board, keep teams
//   GameState.fullReset();          // wipe everything

const GameState = (() => {
  // Private state
  let categories = [];  // ordered category names from JSON
  let questions = {};   // { "Python Basics": [{ id, value, question, answer, explanation }, ...] }
  let teams = [];       // ordered list of team names
  let scores = {};      // { "Team A": 400, "Team B": 200 }
  let answered = new Set(); // set of answered question IDs

  // ── Init ───────────────────────────────────────────────────────────────────

  /**
   * Fetch and parse questions.json, then build the internal question map.
   * Must be awaited before calling getBoard() or findQuestion().
   *
   * The JSON uses "clues" and doesn't have IDs — we generate IDs here from
   * the category name + point value (e.g. "python-basics_200").
   */
  async function init(jsonPath = 'questions.json') {
    const response = await fetch(jsonPath);
    const data = await response.json();

    categories = data.categories.map((cat) => cat.name);

    for (const cat of data.categories) {
      questions[cat.name] = cat.clues.map((clue) => ({
        // Generate a stable ID from category + value
        id: `${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${clue.value}`,
        value: clue.value,
        question: clue.question,
        answer: clue.answer,
        explanation: clue.explanation || "",
      }));
    }
  }

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

  /** Returns the list of team names in order. */
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

  /** Returns a copy of the scores object: { "Team A": 400, ... } */
  function getScores() {
    return { ...scores };
  }

  /**
   * Returns the team currently in the lead, or null if no teams exist.
   * In a tie, returns the first-added team.
   */
  function getLeader() {
    if (teams.length === 0) return null;
    return teams.reduce((leader, team) =>
      scores[team] > scores[leader] ? team : leader
    );
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  /** Mark a question ID as answered so its tile can be greyed out. */
  function markAnswered(questionId) {
    answered.add(questionId);
  }

  /** Returns true if the question has already been answered. */
  function isAnswered(questionId) {
    return answered.has(questionId);
  }

  /** Returns true if every question on the board has been answered. */
  function isBoardComplete() {
    const allIds = Object.values(questions).flat().map((q) => q.id);
    return allIds.every((id) => answered.has(id));
  }

  /**
   * Find and return a full question object by its ID, or null if not found.
   * Returns: { id, value, question, answer, explanation }
   */
  function findQuestion(questionId) {
    for (const clues of Object.values(questions)) {
      const match = clues.find((q) => q.id === questionId);
      if (match) return match;
    }
    return null;
  }

  /**
   * Build the board structure for the frontend to render the grid.
   *
   * Returns:
   * [
   *   {
   *     name: "Python Basics",
   *     clues: [{ id, value, answered }, ...]
   *   },
   *   ...
   * ]
   */
  function getBoard() {
    return categories.map((cat) => ({
      name: cat,
      clues: questions[cat].map((q) => ({
        id: q.id,
        value: q.value,
        answered: isAnswered(q.id),
      })),
    }));
  }

  // ── State Snapshot ─────────────────────────────────────────────────────────

  /** Returns a full snapshot of current game state. */
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
   * Soft reset: zero all scores and clear answered questions.
   * Keeps teams so players can replay without re-entering names.
   */
  function reset() {
    for (const team of teams) scores[team] = 0;
    answered.clear();
  }

  /** Full reset: wipe teams, scores, and answered. Questions stay loaded. */
  function fullReset() {
    teams = [];
    scores = {};
    answered.clear();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
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
