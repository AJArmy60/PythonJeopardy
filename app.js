// app.js — UI controller for Python Jeopardy
// Depends on game.js (GameState) being loaded first.

(async () => {
  // ── Init ─────────────────────────────────────────────────────────────────
  await GameState.init();
  renderBoard();

  // ── Element refs ─────────────────────────────────────────────────────────
  const setupOverlay    = document.getElementById('setup-overlay');
  const setupTeamsEl    = document.getElementById('setup-teams');
  const setupInput      = document.getElementById('setup-team-input');
  const setupAddBtn     = document.getElementById('setup-add-btn');
  const startGameBtn    = document.getElementById('start-game-btn');

  const addTeamBtn      = document.getElementById('add-team-btn');
  const resetBtn        = document.getElementById('reset-btn');
  const scoreboard      = document.getElementById('scoreboard');
  const turnIndicator   = document.getElementById('turn-indicator');
  const turnTeamEl      = document.getElementById('turn-team');

  const modalOverlay    = document.getElementById('modal-overlay');
  const closeModalBtn   = document.getElementById('close-modal-btn');
  const modalCategory   = document.getElementById('modal-category');
  const modalValue      = document.getElementById('modal-value');
  const modalQuestion   = document.getElementById('modal-question');
  const modalAnswer     = document.getElementById('modal-answer');
  const answerText      = document.getElementById('answer-text');
  const explanationText = document.getElementById('explanation-text');
  const showAnswerBtn   = document.getElementById('show-answer-btn');
  const resultSection   = document.getElementById('result-section');
  const resultTeamName  = document.getElementById('result-team-name');
  const correctBtn      = document.getElementById('correct-btn');
  const incorrectBtn    = document.getElementById('incorrect-btn');

  const finalOverlay    = document.getElementById('final-overlay');
  const finalScores     = document.getElementById('final-scores');
  const playAgainBtn    = document.getElementById('play-again-btn');

  let activeQuestionId = null;
  let currentTeamIndex = 0;

  // ── Setup screen ─────────────────────────────────────────────────────────
  function refreshSetupTeams() {
    setupTeamsEl.innerHTML = '';
    for (const name of GameState.getTeams()) {
      const row = document.createElement('div');
      row.className = 'setup-team-entry';
      row.innerHTML = `<span>${escHtml(name)}</span><button data-team="${escHtml(name)}" aria-label="Remove">✕</button>`;
      row.querySelector('button').addEventListener('click', () => {
        GameState.removeTeam(name);
        refreshSetupTeams();
        startGameBtn.disabled = GameState.getTeams().length === 0;
      });
      setupTeamsEl.appendChild(row);
    }
  }

  function addSetupTeam() {
    const name = setupInput.value.trim();
    if (!name) return;
    if (GameState.addTeam(name)) {
      setupInput.value = '';
      refreshSetupTeams();
      startGameBtn.disabled = false;
    } else {
      setupInput.select();
    }
  }

  setupAddBtn.addEventListener('click', addSetupTeam);
  setupInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSetupTeam(); });

  startGameBtn.addEventListener('click', () => {
    setupOverlay.style.display = 'none';
    currentTeamIndex = 0;
    renderScoreboard();
    renderTurnIndicator();
    renderBoard();
  });

  // ── In-game: add team ─────────────────────────────────────────────────────
  addTeamBtn.addEventListener('click', () => {
    const name = prompt('Enter team name:');
    if (name && name.trim()) {
      if (GameState.addTeam(name.trim())) {
        renderScoreboard();
        renderTurnIndicator();
      }
    }
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset scores and board? Teams will be kept.')) {
      GameState.reset();
      currentTeamIndex = 0;
      renderScoreboard();
      renderTurnIndicator();
      renderBoard();
    }
  });

  // ── Scoreboard ───────────────────────────────────────────────────────────
  function renderScoreboard() {
    const scores = GameState.getScores();
    const teams = GameState.getTeams();
    const currentTeam = teams[currentTeamIndex] ?? null;
    scoreboard.innerHTML = '';
    for (const team of teams) {
      const score = scores[team] || 0;
      const card = document.createElement('div');
      card.className = 'score-card' + (team === currentTeam ? ' active-turn' : '');
      card.dataset.team = team;
      card.innerHTML = `<span class="team-name">${escHtml(team)}</span><span class="team-score">$${score.toLocaleString()}</span>`;
      scoreboard.appendChild(card);
    }
  }

  function updateScoreCard(team) {
    const scores = GameState.getScores();
    const card = scoreboard.querySelector(`[data-team="${CSS.escape(team)}"]`);
    if (card) {
      card.querySelector('.team-score').textContent = '$' + (scores[team] || 0).toLocaleString();
    }
  }

  function getCurrentTeam() {
    const teams = GameState.getTeams();
    if (teams.length === 0) return null;
    if (currentTeamIndex >= teams.length) currentTeamIndex = 0;
    return teams[currentTeamIndex];
  }

  function nextTurn() {
    const teams = GameState.getTeams();
    if (teams.length === 0) return;
    currentTeamIndex = (currentTeamIndex + 1) % teams.length;
  }

  function renderTurnIndicator() {
    const team = getCurrentTeam();
    if (!team) {
      turnIndicator.classList.add('hidden');
      turnTeamEl.textContent = '';
      return;
    }
    turnTeamEl.textContent = team;
    turnIndicator.classList.remove('hidden');
  }

  // ── Board ─────────────────────────────────────────────────────────────────
  function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    const board = GameState.getBoard();

    for (const cat of board) {
      const col = document.createElement('div');
      col.className = 'category-col';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.textContent = cat.name;
      col.appendChild(header);

      for (const clue of cat.clues) {
        const tile = document.createElement('div');
        tile.className = 'clue-tile' + (clue.answered ? ' answered' : '');
        tile.textContent = clue.answered ? '' : '$' + clue.value.toLocaleString();
        tile.dataset.id = clue.id;

        if (!clue.answered) {
          tile.addEventListener('click', () => openQuestion(clue.id));
        }
        col.appendChild(tile);
      }

      boardEl.appendChild(col);
    }
  }

  function markTileAnswered(questionId) {
    const tile = document.querySelector(`.clue-tile[data-id="${CSS.escape(questionId)}"]`);
    if (tile) {
      tile.classList.add('answered');
      tile.textContent = '';
      tile.removeEventListener('click', () => openQuestion(questionId));
    }
  }

  // ── Question Modal ────────────────────────────────────────────────────────
  function openQuestion(questionId) {
    const q = GameState.findQuestion(questionId);
    if (!q) return;
    activeQuestionId = questionId;

    // Find category name for display
    const board = GameState.getBoard();
    const catName = board.find(c => c.clues.some(cl => cl.id === questionId))?.name ?? '';

    modalCategory.textContent = catName;
    modalValue.textContent = '$' + q.value.toLocaleString();
    modalQuestion.textContent = q.question;
    answerText.textContent = q.answer;
    explanationText.textContent = q.explanation;

    // Reset state
    modalAnswer.classList.add('hidden');
    resultSection.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
    resultTeamName.textContent = getCurrentTeam() || 'Current Team';

    modalOverlay.classList.remove('hidden');
  }

  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

  function closeModal() {
    if (activeQuestionId) {
      GameState.markAnswered(activeQuestionId);
      markTileAnswered(activeQuestionId);
    }
    activeQuestionId = null;
    modalOverlay.classList.add('hidden');

    if (GameState.isBoardComplete()) {
      setTimeout(showFinalScores, 400);
    }
  }

  showAnswerBtn.addEventListener('click', () => {
    modalAnswer.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
    resultSection.classList.remove('hidden');
  });

  correctBtn.addEventListener('click', () => {
    const team = getCurrentTeam();
    if (team && activeQuestionId) {
      const q = GameState.findQuestion(activeQuestionId);
      GameState.awardPoints(team, q.value);
      updateScoreCard(team);
    }
    nextTurn();
    renderTurnIndicator();
    renderScoreboard();
    closeModal();
  });

  incorrectBtn.addEventListener('click', () => {
    const team = getCurrentTeam();
    if (team && activeQuestionId) {
      const q = GameState.findQuestion(activeQuestionId);
      GameState.awardPoints(team, -q.value);
      updateScoreCard(team);
    }
    nextTurn();
    renderTurnIndicator();
    renderScoreboard();
    closeModal();
  });

  // ── Game Over ─────────────────────────────────────────────────────────────
  function showFinalScores() {
    const scores = GameState.getScores();
    const leader = GameState.getLeader();
    finalScores.innerHTML = '';

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    for (const [team, score] of sorted) {
      const row = document.createElement('div');
      row.className = 'final-score-row' + (team === leader ? ' winner' : '');
      row.innerHTML = `
        <span>${team === leader ? '<span class="crown">👑</span>' : ''}${escHtml(team)}</span>
        <span>$${score.toLocaleString()}</span>`;
      finalScores.appendChild(row);
    }
    finalOverlay.classList.remove('hidden');
  }

  playAgainBtn.addEventListener('click', () => {
    GameState.reset();
    currentTeamIndex = 0;
    finalOverlay.classList.add('hidden');
    renderTurnIndicator();
    renderScoreboard();
    renderBoard();
  });

  // ── Utility ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
