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

  const modalOverlay    = document.getElementById('modal-overlay');
  const closeModalBtn   = document.getElementById('close-modal-btn');
  const modalCategory   = document.getElementById('modal-category');
  const modalValue      = document.getElementById('modal-value');
  const modalQuestion   = document.getElementById('modal-question');
  const modalAnswer     = document.getElementById('modal-answer');
  const answerText      = document.getElementById('answer-text');
  const explanationText = document.getElementById('explanation-text');
  const showAnswerBtn   = document.getElementById('show-answer-btn');
  const awardSection    = document.getElementById('award-section');
  const teamAwardBtns   = document.getElementById('team-award-buttons');
  const noAwardBtn      = document.getElementById('no-award-btn');

  const finalOverlay    = document.getElementById('final-overlay');
  const finalScores     = document.getElementById('final-scores');
  const playAgainBtn    = document.getElementById('play-again-btn');

  let activeQuestionId = null;

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
    renderScoreboard();
    renderBoard();
  });

  // ── In-game: add team ─────────────────────────────────────────────────────
  addTeamBtn.addEventListener('click', () => {
    const name = prompt('Enter team name:');
    if (name && name.trim()) {
      GameState.addTeam(name.trim());
      renderScoreboard();
    }
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset scores and board? Teams will be kept.')) {
      GameState.reset();
      renderScoreboard();
      renderBoard();
    }
  });

  // ── Scoreboard ───────────────────────────────────────────────────────────
  function renderScoreboard() {
    const scores = GameState.getScores();
    scoreboard.innerHTML = '';
    for (const [team, score] of Object.entries(scores)) {
      const card = document.createElement('div');
      card.className = 'score-card';
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
    awardSection.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');

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
    awardSection.classList.remove('hidden');
    renderAwardButtons();
  });

  function renderAwardButtons() {
    teamAwardBtns.innerHTML = '';
    for (const team of GameState.getTeams()) {
      const btn = document.createElement('button');
      btn.className = 'award-btn';
      btn.textContent = escHtml(team);
      btn.addEventListener('click', () => {
        if (activeQuestionId) {
          const q = GameState.findQuestion(activeQuestionId);
          GameState.awardPoints(team, q.value);
          updateScoreCard(team);
        }
        closeModal();
      });
      teamAwardBtns.appendChild(btn);
    }
  }

  noAwardBtn.addEventListener('click', closeModal);

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
    finalOverlay.classList.add('hidden');
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
