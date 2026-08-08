(() => {
  "use strict";

  const X = "X";
  const O = "O";

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const boardEl = document.getElementById("board");
  const cells = [...document.querySelectorAll(".cell")];
  const statusEl = document.getElementById("status");
  const modeButtons = [...document.querySelectorAll(".seg-btn[data-mode]")];
  const diffButtons = [...document.querySelectorAll(".seg-btn[data-diff]")];
  const controlsEl = document.querySelector(".controls");
  const playerXNameEl = document.getElementById("player-x-name");
  const playerONameEl = document.getElementById("player-o-name");
  const scoreXEl = document.getElementById("score-x-num");
  const scoreOEl = document.getElementById("score-o-num");
  const scoreDrawEl = document.getElementById("score-draw-num");
  const newGameBtn = document.getElementById("new-game");
  const resetBtn = document.getElementById("reset-scores");

  let board = Array(9).fill(null);
  let current = X;
  let mode = "pvp";
  let difficulty = "hard";
  let gameOver = false;
  let cpuThinking = false;
  let scores = { x: 0, o: 0, draw: 0 };

  function resetBoard() {
    board = Array(9).fill(null);
    current = X;
    gameOver = false;
    cpuThinking = false;
    cells.forEach((cell) => {
      cell.textContent = "";
      cell.dataset.mark = "";
      cell.classList.remove("taken", "win-cell");
    });
    document.querySelectorAll(".cell.win-cell").forEach((c) => c.classList.remove("win-cell"));
    updateScoreHighlight();
    renderStatus();
  }

  function resetScores() {
    scores = { x: 0, o: 0, draw: 0 };
    renderScores();
    resetBoard();
  }

  function renderScores() {
    scoreXEl.textContent = scores.x;
    scoreOEl.textContent = scores.o;
    scoreDrawEl.textContent = scores.draw;
  }

  function updateScoreHighlight() {
    const xCard = document.getElementById("score-x");
    const oCard = document.getElementById("score-o");
    xCard.classList.toggle("active", current === X && !gameOver);
    oCard.classList.toggle("active", current === O && !gameOver);
  }

  function renderStatus() {
    if (gameOver) return;
    const isCpuTurn = mode === "cpu" && current === O;
    const name = current === X ? playerXNameEl.textContent : playerONameEl.textContent;
    const suffix = isCpuTurn ? " is thinking…" : "'s turn";
    statusEl.textContent = `${name} (${current})${suffix}`;
    statusEl.classList.remove("win", "draw");
  }

  function markCell(idx) {
    if (board[idx] !== null || gameOver) return;
    board[idx] = current;
    const cell = cells[idx];
    cell.textContent = current;
    cell.dataset.mark = current;
    cell.classList.add("taken");

    const line = findWin(board, current);
    if (line) {
      gameOver = true;
      highlightWinningLine(line);
      if (current === X) scores.x += 1;
      else scores.o += 1;
      renderScores();
      statusEl.textContent = `${current === X ? playerXNameEl.textContent : playerONameEl.textContent} (${current}) wins!`;
      statusEl.classList.add("win");
      cells.forEach((c) => c.classList.add("disabled"));
      return;
    }

    if (board.every((v) => v !== null)) {
      gameOver = true;
      scores.draw += 1;
      renderScores();
      statusEl.textContent = "It's a draw!";
      statusEl.classList.add("draw");
      return;
    }

    current = current === X ? O : X;
    updateScoreHighlight();
    renderStatus();

    if (mode === "cpu" && current === O && !gameOver) {
      cpuThinking = true;
      setTimeout(cpuMove, 350);
    }
  }

  function cpuMove() {
    if (gameOver) return;
    let move;
    if (difficulty === "hard") {
      move = bestMove(board.slice(), O);
    } else {
      const empties = board.map((v, i) => (v === null ? i : null)).filter((v) => v !== null);
      move = empties.length ? empties[Math.floor(Math.random() * empties.length)] : null;
    }
    cpuThinking = false;
    if (move !== null && move !== undefined) markCell(move);
  }

  function findWin(b, player) {
    for (const [a, c, d] of WIN_LINES) {
      if (b[a] === player && b[c] === player && b[d] === player) return [a, c, d];
    }
    return null;
  }

  function highlightWinningLine(line) {
    line.forEach((idx) => cells[idx].classList.add("win-cell"));
  }

  function evaluate(b) {
    if (findWin(b, O)) return 10;
    if (findWin(b, X)) return -10;
    return 0;
  }

  function minimax(b, depth, isMaximizing) {
    const score = evaluate(b);
    if (score === 10) return score - depth;
    if (score === -10) return score + depth;
    if (b.every((v) => v !== null)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = O;
          best = Math.max(best, minimax(b, depth + 1, false));
          b[i] = null;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = X;
          best = Math.min(best, minimax(b, depth + 1, true));
          b[i] = null;
        }
      }
      return best;
    }
  }

  function bestMove(b, player) {
    let bestScore = -Infinity;
    let moves = [];
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = player;
        const score = minimax(b, 0, false);
        b[i] = null;
        if (score > bestScore) {
          bestScore = score;
          moves = [i];
        } else if (score === bestScore) {
          moves.push(i);
        }
      }
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function setMode(nextMode) {
    mode = nextMode;
    controlsEl.classList.toggle("cpu", mode === "cpu");
    modeButtons.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.setAttribute("aria-pressed", String(active));
    });
    if (mode === "cpu") {
      playerXNameEl.textContent = "You";
      playerONameEl.textContent = "Computer";
    } else {
      playerXNameEl.textContent = "Player 1";
      playerONameEl.textContent = "Player 2";
    }
    resetBoard();
  }

  function setDifficulty(nextDiff) {
    difficulty = nextDiff;
    diffButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.diff === difficulty));
    });
    resetBoard();
  }

  cells.forEach((cell, idx) => {
    cell.addEventListener("click", () => {
      if (mode === "cpu" && current === O) return;
      if (cpuThinking) return;
      markCell(idx);
    });
  });

  modeButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  diffButtons.forEach((btn) => btn.addEventListener("click", () => setDifficulty(btn.dataset.diff)));
  newGameBtn.addEventListener("click", resetBoard);
  resetBtn.addEventListener("click", resetScores);

  resetScores();
})();
