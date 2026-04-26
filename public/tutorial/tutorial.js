(() => {
  const UNSUPPORTED = new Set(['moonfall_rts', 'moonfall_world_conquest']);
  const params = new URLSearchParams(window.location.search);
  const gameKey = params.get('game') || 'chess';

  const dom = {
    title: document.getElementById('gameTitle'),
    eyebrow: document.getElementById('gameEyebrow'),
    intro: document.getElementById('gameIntro'),
    backBtn: document.getElementById('backBtn'),
    resetBtn: document.getElementById('resetBtn'),
    unsupported: document.getElementById('unsupportedView'),
    tutorial: document.getElementById('tutorialView'),
    stepCount: document.getElementById('stepCount'),
    stepTitle: document.getElementById('stepTitle'),
    progressFill: document.getElementById('progressFill'),
    coachText: document.getElementById('coachText'),
    objectiveText: document.getElementById('objectiveText'),
    rulesList: document.getElementById('rulesList'),
    tipsList: document.getElementById('tipsList'),
    boardLabel: document.getElementById('boardLabel'),
    board: document.getElementById('board'),
    aiLog: document.getElementById('aiLog'),
    choices: document.getElementById('choices'),
    feedback: document.getElementById('feedback'),
    nextBtn: document.getElementById('nextBtn')
  };

  const TUTORIALS = {
    chess: {
      title: 'Chess Tutorial',
      eyebrow: 'Classic duel vs AI',
      intro: 'Play guided positions against a coach AI: control the center, develop safely, and convert an attack.',
      lobby: '/chess/index.html',
      rules: [
        'White moves first. Each piece has a fixed movement pattern.',
        'Check means the king is attacked. Checkmate wins the game.',
        'Time controls in online lobbies decide how much thinking time each player gets.'
      ],
      tips: [
        'Fight for the center before chasing pawns on the side.',
        'Develop knights and bishops, then castle before opening the king.',
        'When ahead, trade pieces but avoid trading into stalemate tricks.'
      ],
      steps: [
        {
          title: 'Claim the center',
          coach: 'The AI gives you a quiet opening. Your first job is not a trick: occupy central space so your pieces have room.',
          objective: 'Choose the move that controls the most central squares.',
          label: 'Opening position',
          board: squareBoard(8, 8, {
            0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜',
            8: '♟', 9: '♟', 10: '♟', 11: '♟', 12: '♟', 13: '♟', 14: '♟', 15: '♟',
            48: '♙', 49: '♙', 50: '♙', 51: '♙', 52: '♙', 53: '♙', 54: '♙', 55: '♙',
            56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 62: '♘', 63: '♖'
          }, [52, 36]),
          after: squareBoard(8, 8, { 0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜', 8: '♟', 9: '♟', 10: '♟', 11: '♟', 13: '♟', 14: '♟', 15: '♟', 28: '♟', 36: '♙', 48: '♙', 49: '♙', 50: '♙', 51: '♙', 53: '♙', 54: '♙', 55: '♙', 56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 62: '♘', 63: '♖' }, [36], [28]),
          choices: [
            choice('1. e4', 'Takes central space and opens the bishop and queen.', true, 'Correct. e4 is principled: space, development, and pressure.'),
            choice('1. h4', 'A wing pawn move before development.', false, 'Too slow. Side pawn attacks are fun, but the center decides the opening.'),
            choice('1. Qh5', 'A quick queen sortie.', false, 'Tempting, but the queen can become a target before your army is ready.')
          ],
          ai: 'AI replies ...e5, matching your central pawn. Now both sides must develop pieces.'
        },
        {
          title: 'Develop with tempo',
          coach: 'The center is shared. Your next move should add a piece, attack something useful, and prepare castling.',
          objective: 'Pick the move that develops while pressuring the AI center.',
          label: 'After 1. e4 e5',
          board: squareBoard(8, 8, { 0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜', 8: '♟', 9: '♟', 10: '♟', 11: '♟', 13: '♟', 14: '♟', 15: '♟', 28: '♟', 36: '♙', 48: '♙', 49: '♙', 50: '♙', 51: '♙', 53: '♙', 54: '♙', 55: '♙', 56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 62: '♘', 63: '♖' }, [62, 45]),
          after: squareBoard(8, 8, { 0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜', 8: '♟', 9: '♟', 10: '♟', 11: '♟', 13: '♟', 14: '♟', 15: '♟', 21: '♞', 28: '♟', 36: '♙', 45: '♘', 48: '♙', 49: '♙', 50: '♙', 51: '♙', 53: '♙', 54: '♙', 55: '♙', 56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 63: '♖' }, [45], [21]),
          choices: [
            choice('2. Nf3', 'Develops a knight and attacks e5.', true, 'Nice. Development with a threat makes the AI answer your plan.'),
            choice('2. f3', 'Protects e4 but weakens the king.', false, 'This protects a pawn, but it opens dangerous lines near your king.'),
            choice('2. a3', 'A waiting move on the edge.', false, 'No urgent reason. In openings, make every tempo build your position.')
          ],
          ai: 'AI replies ...Nc6, defending e5 and developing. Your next big checkpoint is king safety.'
        },
        {
          title: 'Attack after safety',
          coach: 'You are developed and ready. The winning idea is simple: improve your worst piece before launching tactics.',
          objective: 'Choose the move that makes your king safe and connects your rooks.',
          label: 'Development checkpoint',
          board: squareBoard(8, 8, { 0: '♜', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 7: '♜', 8: '♟', 9: '♟', 10: '♟', 11: '♟', 13: '♟', 14: '♟', 15: '♟', 21: '♞', 22: '♞', 26: '♗', 28: '♟', 36: '♙', 45: '♘', 48: '♙', 49: '♙', 50: '♙', 51: '♙', 53: '♙', 54: '♙', 55: '♙', 56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 63: '♖' }, [60, 62]),
          after: squareBoard(8, 8, { 0: '♜', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 7: '♜', 8: '♟', 9: '♟', 10: '♟', 11: '♟', 13: '♟', 14: '♟', 15: '♟', 21: '♞', 22: '♞', 26: '♗', 28: '♟', 36: '♙', 45: '♘', 48: '♙', 49: '♙', 50: '♙', 51: '♙', 53: '♙', 54: '♙', 55: '♙', 56: '♖', 57: '♘', 58: '♗', 59: '♕', 61: '♖', 62: '♔' }, [61, 62], [4]),
          choices: [
            choice('Castle kingside', 'King to safety, rook closer to the center.', true, 'Exactly. Safe king first, then tactics are less risky.'),
            choice('Bxf7+', 'A flashy sacrifice before castling.', false, 'Checks feel powerful, but a premature sacrifice can run out of fuel.'),
            choice('Move the rook pawn', 'Creates luft someday, but solves no current problem.', false, 'Useful later sometimes. Here, castling is the clean strategic move.')
          ],
          ai: 'AI hesitates with ...Be7. You are safe, developed, and ready to attack the center.'
        }
      ]
    },

    othello: {
      title: 'Othello Tutorial',
      eyebrow: 'Disc tactics vs AI',
      intro: 'Learn how to flip discs without giving away corners. The coach AI will punish greedy moves.',
      lobby: '/othello/index.html',
      rules: [
        'A legal move must bracket at least one opponent disc in a straight line.',
        'All bracketed discs flip to your color immediately.',
        'The game ends when neither player can move. Most discs wins.'
      ],
      tips: [
        'Corners are permanent. Fight for them and avoid giving them away.',
        'Edges are strong after corners, but dangerous before corners are secure.',
        'Mobility matters: a good move leaves the AI with fewer legal options.'
      ],
      steps: [
        othelloStep('Start with mobility', 'Pick a standard opening move. The goal is to flip one disc while keeping the position flexible.', [27, 28, 35, 36], [19, 27, 28, 35, 36], [19], [
          choice('Play d3', 'Flips d4 and keeps several options.', true, 'Correct. Small flips are often better than greedy flips early.'),
          choice('Play a corner now', 'Corners are empty but not legal yet.', false, 'Corners are excellent, but only legal moves count.'),
          choice('Play beside a corner', 'An X-square too early can become poison.', false, 'Avoid squares next to empty corners unless you have a clear tactic.')
        ], 'AI answers c3, building a diagonal and testing your mobility.'),
        othelloStep('Refuse the trap', 'The AI offers a tempting edge-adjacent move. Your task is to avoid giving up the corner.', [0, 7, 56, 63, 18, 19, 26, 27, 28, 35, 36, 44], [0, 7, 56, 63, 18, 19, 20, 26, 27, 28, 35, 36, 44], [20], [
          choice('Play e3', 'Builds center control without touching the danger square.', true, 'Good discipline. You improved mobility without gifting a corner.'),
          choice('Play b2', 'Looks active but gives the AI access to a1.', false, 'That is the classic corner trap. The AI would love a1 next.'),
          choice('Pass', 'Passing is only allowed when no legal moves exist.', false, 'You still have legal moves, so choose the safest one.')
        ], 'AI flips back toward the center instead of winning a corner. You kept the danger contained.'),
        othelloStep('Take the corner', 'Now the corner is legal. Convert the stable disc and lock the edge.', [1, 8, 9, 16, 18, 19, 20, 26, 27, 28, 35, 36, 44], [0, 1, 8, 9, 16, 18, 19, 20, 26, 27, 28, 35, 36, 44], [0], [
          choice('Play a1', 'A permanent corner that anchors future edge discs.', true, 'Perfect. Corners cannot be flipped, so your edge plan becomes safe.'),
          choice('Play h8', 'A corner, but not legal in this position.', false, 'Right instinct, wrong corner. Take the legal stable corner.'),
          choice('Flip the most discs now', 'Greedy flips often hand tempo back to the AI.', false, 'Disc count matters at the end. Stability matters right now.')
        ], 'AI has to defend instead of attack. Your stable corner is the foundation of the win.')
      ]
    },

    azul: {
      title: 'Azul Tutorial',
      eyebrow: 'Pattern draft vs AI',
      intro: 'Practice drafting tiles, avoiding floor penalties, and timing endgame bonuses against a coach AI.',
      lobby: '/azul/index.html',
      rules: [
        'Take all tiles of one color from a factory or the center.',
        'Place them on one pattern line that accepts that color. Overflow goes to the floor.',
        'Completed lines score onto the wall at round end. Rows, columns, and color sets give bonuses.'
      ],
      tips: [
        'Choose colors that fit your wall, not just the biggest pile.',
        'Watch the center: taking first player can be worth a small floor penalty.',
        'Build toward columns and color sets for large endgame swings.'
      ],
      steps: [
        azulStep('Draft with purpose', 'Choose a tile group that completes a pattern line without overflow.', 'Factory 2: take 2 blue tiles for your size-2 line.', [
          choice('Take 2 blue from Factory 2', 'Completes the size-2 pattern line cleanly.', true, 'Clean draft. You score soon and waste nothing.'),
          choice('Take 3 red from Factory 1', 'More tiles, but only one fits.', false, 'Bigger is not better if two tiles crash to the floor.'),
          choice('Take yellow from center', 'Keeps options open but misses an immediate completion.', false, 'Playable, but the tutorial target is efficient completion.')
        ], 'AI takes red from Factory 1, leaving a messy center. You forced it into a less efficient choice.'),
        azulStep('Manage the floor', 'The center has the first-player marker. Decide whether tempo is worth the penalty.', 'Take one black plus the marker because it starts the next round and fits your row.', [
          choice('Take black from center', 'Accepts -1 now to control next round.', true, 'Good trade. A small penalty can buy first pick of the next factories.'),
          choice('Take four yellow with no space', 'Huge floor damage.', false, 'That is how Azul games disappear in one draft. Avoid overflow.'),
          choice('Skip the marker forever', 'You may let the AI control the next round.', false, 'Sometimes you must take the marker before the AI gets the perfect first pick.')
        ], 'AI grabs yellow but sends two to the floor. Your tempo choice is already paying off.'),
        azulStep('Play for bonuses', 'Late game scoring is about rows, columns, and color sets. Pick the move that builds a bonus.', 'Take red for the wall column you are close to completing.', [
          choice('Take red for the column', 'Sets up a 7 point column bonus.', true, 'That is the winning mindset: draft for the final scoreboard, not only this round.'),
          choice('Take random blue', 'Scores one tile but does not connect to a bonus.', false, 'Small points are fine, but bonuses decide close Azul games.'),
          choice('Force the game end immediately', 'Ends before your bonus is ready.', false, 'Ending is powerful only when your end bonuses are better than the AI\'s.')
        ], 'AI completes a row, but your column bonus outpaces it. You win the tutorial table.')
      ]
    },

    moonfall_p4: {
      title: 'Power 4 Tutorial',
      eyebrow: 'Connect 4 duel vs AI',
      intro: 'Drop orbs against a coach AI and learn center control, blocking, and forcing two-way threats.',
      lobby: '/moonfall-p4/index.html',
      rules: [
        'Drop one orb into a column. It falls to the lowest empty slot.',
        'Connect four horizontally, vertically, or diagonally to win.',
        'Online mode is a 1v1 lobby; local mode is instant hot-seat play.'
      ],
      tips: [
        'Open near the center because center columns create more winning lines.',
        'Block immediate three-in-a-row threats before building your own slow plan.',
        'The strongest attack creates two winning threats at once.'
      ],
      steps: [
        p4Step('Own the center', 'The empty board favors center play. Pick the column with the most future lines.', [], [], [38], [39], [38], [
          choice('Drop in column 4', 'Maximum horizontal and diagonal potential.', true, 'Correct. Center control creates the most future threats.'),
          choice('Drop in column 1', 'Playable but fewer lines.', false, 'Corners are weaker here. Start where your orb can branch.'),
          choice('Drop in column 7', 'Symmetric edge play.', false, 'The edge gives the AI easier control of the center.')
        ], 'AI drops next to you in column 5 to contest the center.'),
        p4Step('Block the threat', 'The AI has three in a row. You must defend before making your own plan.', [40, 41], [35, 36, 37], [38, 40, 41], [35, 36, 37], [38], [
          choice('Drop in column 4', 'Blocks the horizontal four.', true, 'Exactly. In Connect 4, missing an immediate block loses instantly.'),
          choice('Build your own column', 'Creates a threat later, but the AI wins now.', false, 'Too slow. Always scan for immediate fours first.'),
          choice('Drop far right', 'Does not interact with the threat.', false, 'The AI would complete the line on the next move.')
        ], 'AI switches sides and tries to build vertically. You survived the tactic.'),
        p4Step('Create a fork', 'Now you can make two threats at once. The AI can block only one.', [30, 31, 37, 38], [24, 32], [30, 31, 33, 37, 38], [24, 32], [33], [
          choice('Drop in column 6', 'Creates horizontal and diagonal threats.', true, 'Beautiful. A fork is how you force wins against solid defense.'),
          choice('Drop in column 2', 'Adds material but no forcing line.', false, 'A non-forcing move lets the AI stabilize.'),
          choice('Reset the board', 'No need. You have the initiative.', false, 'Winning positions should be converted, not restarted.')
        ], 'AI blocks one line, but the other remains. Your next orb wins.')
      ]
    },

    hexblitz: {
      title: 'Hexblitz Tutorial',
      eyebrow: 'Path battle vs AI',
      intro: 'Learn to connect your sides across the hex board while the coach AI tries to cut your path.',
      lobby: '/hexblitz_moonfall/index.html',
      rules: [
        'Crimson connects left to right. Lunar connects top to bottom.',
        'Claim one empty hex each turn. Claimed hexes never flip.',
        'A continuous chain touching both of your target edges wins.'
      ],
      tips: [
        'Do not play isolated stones unless they support a future bridge.',
        'Use bridges: two stones with a gap can threaten two connection points.',
        'Block only when the AI threat is urgent; otherwise extend your own path.'
      ],
      steps: [
        hexStep('Build a bridge', 'Your first two stones should threaten connection without being easy to cut.', [22, 23], [22, 23, 24], [24], [
          choice('Claim the bridge hex', 'Connects your stones with flexible paths.', true, 'Good. Hex is a connection game, not a territory count.'),
          choice('Claim a far corner', 'Too isolated to help your chain.', false, 'Corners are not automatically strong. Connection comes first.'),
          choice('Mirror the AI', 'Passive mirroring lets the AI choose the fight.', false, 'Make threats that force the AI to respond.')
        ], 'AI blocks the lower lane, so your upper bridge becomes more important.'),
        hexStep('Block the cut', 'The AI is about to sever your best route. Find the urgent defensive hex.', [16, 17, 23, 24, 31], [16, 17, 18, 23, 24, 31], [18], [
          choice('Claim the cutting point', 'Stops the AI from splitting your chain.', true, 'Yes. Defense is best when it also keeps your own path alive.'),
          choice('Extend elsewhere', 'Creates a new stone but loses the main chain.', false, 'If your chain gets cut, your future stones become separate islands.'),
          choice('Play next to the edge only', 'Touches an edge but ignores the cut.', false, 'Edges matter after the route is secure.')
        ], 'AI has to reroute. You kept one continuous threat on the board.'),
        hexStep('Finish the path', 'You can now connect left to right. Pick the winning link.', [8, 15, 16, 17, 18, 25, 32], [8, 15, 16, 17, 18, 19, 25, 32], [19], [
          choice('Claim the final link', 'Completes the left-to-right chain.', true, 'Path complete. You win by connection, not by total stones.'),
          choice('Capture the center', 'The center is useful, but the win is already available.', false, 'When you see a direct win, take it.'),
          choice('Block the AI top edge', 'Defensive but unnecessary now.', false, 'Your winning move ends the game before the AI can move again.')
        ], 'AI has no reply. Your crimson chain crosses the board.')
      ]
    },

    moonfall_settlers: {
      title: 'Moonfall Settlers Tutorial',
      eyebrow: 'Board economy vs AI clans',
      intro: 'Play guided turns against AI clans: settle strong numbers, trade efficiently, and race to victory points.',
      lobby: '/moonfall-settlers/index.html',
      rules: [
        'Settlements collect resources from adjacent tiles when their number is rolled.',
        'Roads expand reach. Settlements score 1 point; cities score 2 points.',
        'Development cards, ports, trades, Longest Road, and Largest Army can swing the game.'
      ],
      tips: [
        'Prioritize 6 and 8 tiles because they roll most often.',
        'Diversify resources early so one bad dice number does not freeze you.',
        'Upgrade to cities on strong tiles before spreading too thin.'
      ],
      steps: [
        settlersStep('Place for production', 'Choose the first settlement spot. Strong numbers beat pretty map positions.', 'Settle between Wood 6, Wheat 8, and Brick 5.', [
          choice('Wood 6 / Wheat 8 / Brick 5', 'High production and road materials.', true, 'Excellent. Frequent numbers plus key resources create a fast engine.'),
          choice('Ore 12 / Sheep 2 / Desert', 'Low probability and one dead tile.', false, 'That spot will starve. Avoid relying on rare rolls early.'),
          choice('Three sheep tiles', 'Funny, but not enough variety.', false, 'A sheep empire still needs roads, cities, and cards.')
        ], 'AI clan takes an ore port, but your production is faster.'),
        settlersStep('Trade with intent', 'You need clay for a settlement. The bank offers 4:1, but an AI clan offers 1:1 for wheat.', 'Trade one wheat to the AI for one clay, then build.', [
          choice('Accept the 1:1 AI trade', 'Efficiently unlocks a settlement.', true, 'Good negotiation. Trades are strongest when they turn into points immediately.'),
          choice('Use 4:1 bank trade', 'Works, but burns too many resources.', false, 'Bank trades are fallback plans. Use player trades when they are efficient.'),
          choice('Refuse all trades', 'Keeps resources but misses tempo.', false, 'Unused resources are not points. Convert them into board presence.')
        ], 'AI gains wheat, but you gain a new settlement spot. Tempo advantage: you.'),
        settlersStep('Convert the engine', 'You have ore and wheat on strong numbers. Decide how to turn production into points.', 'Upgrade your best settlement into a city.', [
          choice('Build a city on the 6/8 intersection', 'Doubles production and adds a point.', true, 'That is the snowball. Strong cities win long games.'),
          choice('Buy a random card first', 'Could help, but city value is guaranteed.', false, 'Development cards are powerful, but guaranteed production comes first here.'),
          choice('Build a road to nowhere', 'Expansion without a target.', false, 'Roads are plans. If no settlement follows, spend on points instead.')
        ], 'AI buys a knight. Your city doubles income and puts you on pace to win.')
      ]
    }
  };

  let tutorial = TUTORIALS[gameKey];
  let stepIndex = 0;
  let solved = false;

  function squareBoard(rows, cols, pieces = {}, marks = [], ai = []){
    return { kind: 'square', rows, cols, pieces, marks, ai };
  }

  function choice(label, detail, correct, feedback){
    return { label, detail, correct, feedback };
  }

  function othelloStep(title, objective, blackCells, afterBlackCells, marks, choices, ai){
    const pieces = {};
    blackCells.forEach(index => { pieces[index] = '●'; });
    [27, 36].forEach(index => { pieces[index] = '○'; });
    const afterPieces = {};
    afterBlackCells.forEach(index => { afterPieces[index] = '●'; });
    [36].forEach(index => { afterPieces[index] = '○'; });
    return { title, coach: 'In Othello, the best move is often the quiet one that controls what the AI can do next.', objective, label: 'Othello board', board: squareBoard(8, 8, pieces, marks), after: squareBoard(8, 8, afterPieces, marks), choices, ai };
  }

  function p4Step(title, objective, playerCells, aiCells, afterPlayerCells, afterAiCells, marks, choices, ai){
    const pieces = {};
    playerCells.forEach(index => { pieces[index] = '●'; });
    aiCells.forEach(index => { pieces[index] = '○'; });
    const afterPieces = {};
    afterPlayerCells.forEach(index => { afterPieces[index] = '●'; });
    afterAiCells.forEach(index => { afterPieces[index] = '○'; });
    return { title, coach: 'The coach AI is looking for immediate fours and two-way threats. You should scan the board the same way.', objective, label: 'Power 4 board', board: squareBoard(6, 7, pieces, marks), after: squareBoard(6, 7, afterPieces, marks, afterAiCells), choices, ai };
  }

  function hexStep(title, objective, playerCells, afterPlayerCells, marks, choices, ai){
    const cells = Array.from({ length: 49 }, (_, index) => {
      if(playerCells.includes(index)) return 'p1';
      if([10, 11, 30, 37].includes(index)) return 'p2';
      return '';
    });
    const afterCells = Array.from({ length: 49 }, (_, index) => {
      if(afterPlayerCells.includes(index)) return 'p1';
      if([10, 11, 30, 37].includes(index)) return 'p2';
      return '';
    });
    return { title, coach: 'Hex rewards connected threats. The AI can block one lane, but it struggles against flexible bridges.', objective, label: 'Hexblitz map', board: { kind: 'hex', cells, marks }, after: { kind: 'hex', cells: afterCells, marks }, choices, ai };
  }

  function azulStep(title, coach, objective, choices, ai){
    return {
      title,
      coach,
      objective,
      label: 'Azul draft table',
      board: { kind: 'azul' },
      after: { kind: 'azul', advanced: true },
      choices,
      ai
    };
  }

  function settlersStep(title, coach, objective, choices, ai){
    return {
      title,
      coach,
      objective,
      label: 'Moonfall Settlers map',
      board: { kind: 'settlers' },
      after: { kind: 'settlers', advanced: true },
      choices,
      ai
    };
  }

  function escapeHtml(text){
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderList(target, items){
    target.innerHTML = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }

  function renderSquare(board){
    const grid = document.createElement('div');
    grid.className = 'square-grid';
    grid.style.gridTemplateColumns = `repeat(${board.cols}, minmax(0, 1fr))`;

    for(let index = 0; index < board.rows * board.cols; index += 1){
      const row = Math.floor(index / board.cols);
      const col = index % board.cols;
      const cell = document.createElement('div');
      cell.className = `square-cell ${(row + col) % 2 ? 'dark' : 'light'}`;
      if(board.marks?.includes(index)) cell.classList.add('mark');
      if(board.ai?.includes(index)) cell.classList.add('ai');
      cell.textContent = board.pieces?.[index] || '';
      grid.appendChild(cell);
    }

    dom.board.appendChild(grid);
  }

  function renderAzul(board){
    const colors = ['#168aad', '#e05260', '#f0c96b', '#111827', '#f7efe8'];
    const factories = board.advanced
      ? [[1, 1], [2], [3, 3, 3], [0, 4]]
      : [[1, 1, 2, 2], [0, 0, 3, 4], [2, 3, 4, 4], [0, 1, 3, 3]];
    dom.board.innerHTML = `
      <div class="azul-table">
        <div class="factory-row">
          ${factories.map((factory, index) => `<div class="factory"><strong>Factory ${index + 1}</strong><br>${factory.map(color => `<span class="tile-dot" style="background:${colors[color]}"></span>`).join('')}</div>`).join('')}
        </div>
        <div class="pattern-row">
          <div class="pattern-line">Line 2<br><span class="tile-dot" style="background:${colors[0]}"></span><span class="tile-dot" style="background:${colors[0]}"></span></div>
          <div class="pattern-line">Floor<br>${board.advanced ? '<span class="tile-dot" style="background:#111827"></span>' : 'empty'}</div>
        </div>
        <div class="score-row"><span class="score-chip">You 18</span><span class="score-chip">AI 15</span></div>
      </div>
    `;
  }

  function renderHex(board){
    const map = document.createElement('div');
    map.className = 'hex-map';
    board.cells.forEach((value, index) => {
      const cell = document.createElement('div');
      cell.className = `hex-cell ${value || ''}`;
      if(board.marks?.includes(index)) cell.classList.add('good');
      cell.textContent = value === 'p1' ? 'C' : value === 'p2' ? 'L' : '';
      map.appendChild(cell);
    });
    dom.board.appendChild(map);
  }

  function renderSettlers(board){
    const tiles = [
      ['Wood', 6, '#1f6b40'], ['Wheat', 8, '#a37b24'], ['Brick', 5, '#8a3f2c'], ['Sheep', 9, '#415e2a'], ['Ore', 10, '#677173'],
      ['Wood', 4, '#1f6b40'], ['Crater', '-', '#25222d'], ['Wheat', 3, '#a37b24'], ['Ore', 11, '#677173'], ['Brick', 6, '#8a3f2c']
    ];
    dom.board.innerHTML = `
      <div class="settlers-map">
        ${tiles.map((tile, index) => `<div class="resource-tile" style="background:${tile[2]}; ${board.advanced && [0, 1, 2].includes(index) ? 'outline:3px solid #5ed6be;' : ''}">${tile[0]}<br><span>${tile[1]}</span></div>`).join('')}
      </div>
    `;
  }

  function renderBoard(board){
    dom.board.innerHTML = '';
    if(board.kind === 'square') renderSquare(board);
    if(board.kind === 'azul') renderAzul(board);
    if(board.kind === 'hex') renderHex(board);
    if(board.kind === 'settlers') renderSettlers(board);
  }

  function renderStep(){
    const step = tutorial.steps[stepIndex];
    solved = false;
    dom.stepCount.textContent = `Step ${stepIndex + 1} / ${tutorial.steps.length}`;
    dom.stepTitle.textContent = step.title;
    dom.progressFill.style.width = `${(stepIndex / tutorial.steps.length) * 100}%`;
    dom.coachText.textContent = step.coach;
    dom.objectiveText.textContent = step.objective;
    dom.boardLabel.textContent = step.label;
    dom.aiLog.textContent = 'AI is waiting for your move.';
    dom.feedback.textContent = 'Choose the move you would play against the AI.';
    dom.nextBtn.disabled = true;
    dom.nextBtn.textContent = stepIndex === tutorial.steps.length - 1 ? 'Finish tutorial' : 'Next challenge';
    renderBoard(step.board);

    dom.choices.innerHTML = step.choices.map((item, index) => `
      <button type="button" class="choice-btn" data-choice="${index}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </button>
    `).join('');

    dom.choices.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('click', () => chooseMove(Number(button.dataset.choice)));
    });
  }

  function chooseMove(index){
    if(solved) return;
    const step = tutorial.steps[stepIndex];
    const selected = step.choices[index];
    const buttons = [...dom.choices.querySelectorAll('.choice-btn')];
    buttons.forEach(button => button.classList.remove('correct', 'wrong'));

    if(!selected.correct){
      buttons[index].classList.add('wrong');
      dom.feedback.textContent = selected.feedback;
      return;
    }

    solved = true;
    buttons[index].classList.add('correct');
    buttons.forEach(button => { button.disabled = true; });
    dom.feedback.textContent = selected.feedback;
    dom.aiLog.textContent = step.ai;
    renderBoard(step.after || step.board);
    dom.nextBtn.disabled = false;
  }

  function nextStep(){
    if(stepIndex < tutorial.steps.length - 1){
      stepIndex += 1;
      renderStep();
      return;
    }

    dom.progressFill.style.width = '100%';
    dom.stepTitle.textContent = 'Tutorial complete';
    dom.coachText.textContent = `You finished the ${tutorial.title}. The real lobby is ready when you want a full match.`;
    dom.objectiveText.textContent = 'Key habit: explain your move before you play it. If the reason is clear, the move is usually better.';
    dom.feedback.textContent = 'Victory against the coach AI. You can restart the tutorial or return to the lobby.';
    dom.aiLog.textContent = 'AI: Good game. Next time I will not be this generous.';
    dom.nextBtn.disabled = true;
  }

  function reset(){
    stepIndex = 0;
    renderStep();
  }

  function init(){
    if(UNSUPPORTED.has(gameKey) || !tutorial){
      dom.unsupported.hidden = false;
      dom.tutorial.hidden = true;
      dom.title.textContent = 'Tutorial unavailable';
      dom.eyebrow.textContent = 'Coming later';
      dom.intro.textContent = 'Moonfall RTS and Moonfall World Conquest are still in construction, so tutorials are disabled for now.';
      dom.backBtn.addEventListener('click', () => { window.location.href = '/games.html'; });
      return;
    }

    dom.title.textContent = tutorial.title;
    dom.eyebrow.textContent = tutorial.eyebrow;
    dom.intro.textContent = tutorial.intro;
    dom.backBtn.addEventListener('click', () => { window.location.href = tutorial.lobby; });
    dom.resetBtn.addEventListener('click', reset);
    dom.nextBtn.addEventListener('click', nextStep);
    renderList(dom.rulesList, tutorial.rules);
    renderList(dom.tipsList, tutorial.tips);
    renderStep();
  }

  init();
})();
