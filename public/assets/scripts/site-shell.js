(function(){
  const PUBLIC_PATHS = ['/login.html', '/register.html'];
  const GAME_LINKS = new Set(['home', 'games', 'leaderboard', 'profile', 'admin', 'logout']);
  let onlineSocket = null;
  let latestOnlineUsers = {};
  let invitePickerOpen = false;

  function getUser(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null');
    }catch(_err){
      return null;
    }
  }

  function escapeHtml(text){
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isPublicPage(){
    const path = window.location.pathname;
    return PUBLIC_PATHS.some(publicPath => path.endsWith(publicPath));
  }

  function goTo(link){
    if(!GAME_LINKS.has(link)) return;
    if(link === 'home') window.location.href = '/';
    if(link === 'games') window.location.href = '/games.html';
    if(link === 'leaderboard') window.location.href = '/leaderboard.html';
    if(link === 'profile') window.location.href = '/profile.html';
    if(link === 'admin') window.location.href = '/admin.html';

    if(link === 'logout'){
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
  }

  function icon(name){
    const icons = {
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-6h4v6h5v-9.5"/>',
      games: '<path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 11h.01"/><path d="M18 13h.01"/><path d="M8.5 7h7c3 0 5.5 2.4 5.5 5.4 0 3.5-1.5 5.6-3.4 5.6-1.2 0-2-1-2.8-2H9.2c-.8 1-1.6 2-2.8 2C4.5 18 3 15.9 3 12.4 3 9.4 5.5 7 8.5 7Z"/>',
      leaderboard: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a4 4 0 0 1-4 4"/><path d="M7 5H4v2a4 4 0 0 0 4 4"/>',
      profile: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
      admin: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-5"/>',
      logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
    };

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.home}</svg>`;
  }

  function getActiveLink(){
    const path = window.location.pathname;
    if(path === '/' || path.endsWith('/index.html')) return 'home';
    if(path.includes('/chess') || path.includes('/othello') || path.includes('/azul') || path.includes('/moonfall') || path.endsWith('/games.html')) return 'games';
    if(path.includes('/leaderboard')) return 'leaderboard';
    if(path.includes('/strategy') || path.includes('/moonfall-world-conquest')) return 'games';
    if(path.includes('/profile')) return 'profile';
    if(path.includes('/admin')) return 'admin';
    return 'home';
  }

  function avatarMarkup(user, className = 'shell-avatar'){
    const avatar = user?.avatar || '';
    if(avatar) return `<img class="${className}" src="${escapeHtml(avatar)}" alt="">`;
    const initial = escapeHtml((user?.username || '?').slice(0, 1).toUpperCase());
    return `<span class="${className} shell-avatar-fallback">${initial}</span>`;
  }

  function navItem(link, label, active, hidden){
    if(hidden) return '';
    return `
      <button class="shell-nav-item ${active === link ? 'active' : ''}" type="button" data-link="${link}" title="${escapeHtml(label)}">
        ${icon(link)}
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }

  function renderShell(){
    const user = getUser();
    if(!user || isPublicPage()) return;

    document.body.classList.add('app-shell-active');
    const active = getActiveLink();
    let container = document.getElementById('navbar-container');
    if(!container){
      container = document.createElement('div');
      container.id = 'navbar-container';
      document.body.prepend(container);
    }

    container.innerHTML = `
      <aside class="app-sidebar-left" aria-label="Main navigation">
        <button class="shell-brand" type="button" data-link="home" title="Strategy League">
          <span>SL</span>
        </button>
        <nav class="shell-nav">
          ${navItem('home', 'Home', active)}
          ${navItem('games', 'Games', active)}
          ${navItem('leaderboard', 'Leaderboard', active)}
          ${navItem('profile', 'Profile', active)}
          ${navItem('admin', 'Admin', active, !user.isAdmin)}
        </nav>
        <button class="shell-nav-item shell-logout" type="button" data-link="logout" title="Logout">
          ${icon('logout')}
          <span>Logout</span>
        </button>
      </aside>

      <aside class="app-sidebar-right" aria-label="Online players">
        <button class="online-tab" type="button" aria-label="Show online players" title="Online players">
          <i></i><b id="onlineCountTab">0</b>
        </button>
        <div class="online-panel">
          <div class="online-head">
            <strong>Online</strong>
            <span><i></i><b id="onlineCount">0</b></span>
            <button id="onlineInviteToggle" class="online-plus hidden" type="button" aria-label="Invite online player" title="Invite online player">+</button>
          </div>
          <div id="onlineInvitePicker" class="online-invite-picker hidden"></div>
          <div id="onlinePlayers" class="online-list">
            <div class="online-empty">Connecting...</div>
          </div>
        </div>
      </aside>

      <div id="shellPlayerCard" class="shell-player-card hidden"></div>
      <div id="shellToastStack" class="shell-toast-stack"></div>
      <div id="activeGameBanner" class="active-game-banner hidden"></div>
    `;

    document.querySelectorAll('[data-link]').forEach(btn => {
      btn.addEventListener('click', ()=> goTo(btn.dataset.link));
    });

    bindOnlinePanelControls();
    bindGlobalProfileClicks();
    bootOnlinePlayers(user);
  }

  function bindOnlinePanelControls(){
    const sidebar = document.querySelector('.app-sidebar-right');
    const tab = document.querySelector('.online-tab');
    const toggle = document.getElementById('onlineInviteToggle');
    if(tab && sidebar){
      tab.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
      });
    }

    if(toggle){
      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openInvitePicker(currentGameKey());
      });
    }

    document.addEventListener('click', event => {
      if(event.target.closest('.app-sidebar-right')) return;
      sidebar?.classList.remove('expanded');
      closeInvitePicker();
    });
  }

  function ensureSocketClient(){
    if(window.io) return Promise.resolve();

    return new Promise((resolve, reject)=>{
      const existing = document.querySelector('script[data-shell-socket]');
      if(existing){
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = '/socket.io/socket.io.js';
      script.dataset.shellSocket = 'true';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function bootOnlinePlayers(user){
    window.addEventListener('site-shell-online-users', event => {
      renderOnlinePlayers(event.detail || {});
    });

    if(isSocketOwnedByPage()){
      waitForPageSocket();
      return;
    }

    ensureSocketClient()
      .then(()=>{
        if(onlineSocket || !window.io) return;
        onlineSocket = window.io();
        onlineSocket.emit('register_online', user.username);
        onlineSocket.on('online_users', renderOnlinePlayers);
        bindSharedSocketEvents(onlineSocket);
      })
      .catch(err => {
        console.error('Online players unavailable:', err);
        const list = document.getElementById('onlinePlayers');
        if(list) list.innerHTML = '<div class="online-empty">Online players unavailable</div>';
      });
  }

  function isSocketOwnedByPage(){
    const path = window.location.pathname;
    return path.includes('/chess') || path.includes('/othello') || path.includes('/azul');
  }

  function waitForPageSocket(){
    const user = getUser();
    let attempts = 0;
    const timer = setInterval(()=>{
      attempts += 1;
      const socket = window.StrategyLeagueSocket;
      if(socket && typeof socket.on === 'function'){
        clearInterval(timer);
        socket.on('online_users', users => {
          window.dispatchEvent(new CustomEvent('site-shell-online-users', { detail: users }));
        });
        bindSharedSocketEvents(socket);
        if(user?.username && typeof socket.emit === 'function'){
          socket.emit('register_online', user.username);
        }
      }

      if(attempts > 40){
        clearInterval(timer);
      }
    }, 125);
  }

  function currentGameKey(){
    const path = window.location.pathname;
    if(path.includes('/chess')) return 'chess';
    if(path.includes('/othello')) return 'othello';
    if(path.includes('/azul')) return 'azul';
    return null;
  }

  function gameUrlFor(gameKey){
    return {
      chess: '/chess/chess-game.html',
      othello: '/othello/game.html',
      azul: '/azul/game.html'
    }[gameKey] || '/games.html';
  }

  function bindSharedSocketEvents(socket){
    if(!socket || socket.__siteShellSharedBound) return;
    socket.__siteShellSharedBound = true;

    socket.on('game_invite', invite => {
      showToast({
        title: invite.label || 'Game invite',
        message: invite.message || 'You received a game invite.',
        actions: [
          { label: 'Accept', onClick: () => { window.location.href = invite.url || '/games.html'; } },
          { label: 'Decline', quiet: true, onClick: () => socket.emit('decline_game_invite', { toUsername: invite.from, gameKey: invite.gameKey }) }
        ]
      });
    });

    socket.on('game_rematch_invite', invite => {
      showToast({
        title: 'Rematch',
        message: invite.message || 'Rematch requested.',
        actions: [
          { label: 'Accept', onClick: () => acceptRematch(socket, invite.gameKey) },
          { label: 'Decline', quiet: true, onClick: () => socket.emit('decline_rematch', { toUsername: invite.from, gameKey: invite.gameKey }) }
        ]
      });
    });

    socket.on('game_notice', notice => {
      showToast({ title: 'Game notice', message: notice?.message || 'Game update.' });
    });

    socket.on('active_game_status', renderActiveGameBanner);
  }

  function acceptRematch(socket, gameKey){
    if(gameKey === 'chess') socket.emit('rematch');
    if(gameKey === 'othello') socket.emit('othello_rematch');
    if(gameKey === 'azul') socket.emit('azul_rematch');
    const url = gameUrlFor(gameKey);
    if(window.location.pathname !== url){
      setTimeout(() => { window.location.href = url; }, 120);
    }
  }

  function showToast({ title, message, actions = [] }){
    const stack = document.getElementById('shellToastStack');
    if(!stack) return;

    const toast = document.createElement('div');
    toast.className = 'shell-toast';
    toast.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      <div class="shell-toast-actions">
        ${actions.map((action, index) => `<button type="button" data-action="${index}" class="${action.quiet ? 'quiet' : ''}">${escapeHtml(action.label)}</button>`).join('')}
      </div>
    `;

    actions.forEach((action, index) => {
      toast.querySelector(`[data-action="${index}"]`)?.addEventListener('click', () => {
        action.onClick?.();
        toast.remove();
      });
    });

    stack.appendChild(toast);
    if(!actions.length) setTimeout(()=>toast.remove(), 4200);
  }

  function renderActiveGameBanner(activeGame){
    const banner = document.getElementById('activeGameBanner');
    if(!banner) return;

    if(!activeGame || window.location.pathname === activeGame.url){
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <span>Active ${escapeHtml(activeGame.label || 'game')} in progress</span>
      <button type="button">Rejoin</button>
    `;
    banner.querySelector('button')?.addEventListener('click', () => {
      window.location.href = activeGame.url || '/games.html';
    });
  }

  function renderOnlinePlayers(users){
    const list = document.getElementById('onlinePlayers');
    const count = document.getElementById('onlineCount');
    const tabCount = document.getElementById('onlineCountTab');
    const inviteToggle = document.getElementById('onlineInviteToggle');
    if(!list) return;
    const user = getUser();
    const gameKey = currentGameKey();
    latestOnlineUsers = users || {};

    const entries = Object.entries(users || {}).map(([username, data]) => ({
      username,
      ...(data || {})
    })).sort((a, b) => (b.xp || 0) - (a.xp || 0));

    if(count) count.textContent = String(entries.length);
    if(tabCount) tabCount.textContent = String(entries.length);
    if(inviteToggle) inviteToggle.classList.toggle('hidden', !gameKey);
    if(!entries.length){
      list.innerHTML = '<div class="online-empty">No players online</div>';
      renderInvitePicker(gameKey, entries);
      return;
    }

    list.innerHTML = entries.map(player => {
      return `
        <div class="online-player-row">
          <button class="online-player" type="button" data-profile-username="${escapeHtml(player.username)}" data-player='${escapeHtml(JSON.stringify(player))}'>
            ${avatarMarkup(player, 'online-avatar')}
            <span class="online-player-copy">
              <strong>${escapeHtml(player.username)}</strong>
            </span>
            <i></i>
          </button>
        </div>
      `;
    }).join('');

    bindPlayerCards();
    renderInvitePicker(gameKey, entries);
  }

  function getSharedSocket(){
    return window.StrategyLeagueSocket || onlineSocket;
  }

  function bindInviteButtons(gameKey){
    document.querySelectorAll('[data-invite-username]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const socket = getSharedSocket();
        const toUsername = button.dataset.inviteUsername;
        if(socket && toUsername && gameKey){
          socket.emit('send_game_invite', { toUsername, gameKey });
          showToast({ title: 'Invite sent', message: `Invite sent to ${toUsername}.` });
          closeInvitePicker();
        }
      });
    });
  }

  function entriesFromLatestUsers(){
    return Object.entries(latestOnlineUsers || {}).map(([username, data]) => ({
      username,
      ...(data || {})
    })).sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }

  function openInvitePicker(gameKey){
    if(!gameKey) return;
    invitePickerOpen = true;
    document.querySelector('.app-sidebar-right')?.classList.add('expanded');
    renderInvitePicker(gameKey, entriesFromLatestUsers());
  }

  function closeInvitePicker(){
    invitePickerOpen = false;
    const picker = document.getElementById('onlineInvitePicker');
    if(picker) picker.classList.add('hidden');
  }

  function renderInvitePicker(gameKey, entries){
    const picker = document.getElementById('onlineInvitePicker');
    if(!picker) return;
    const user = getUser();
    if(!invitePickerOpen || !gameKey){
      picker.classList.add('hidden');
      picker.innerHTML = '';
      return;
    }

    const targets = entries.filter(player => user?.username && player.username !== user.username);
    picker.classList.remove('hidden');
    picker.innerHTML = targets.length
      ? `
        <strong>Invite player</strong>
        <div>
          ${targets.map(player => `
            <button class="online-invite-target" type="button" data-invite-username="${escapeHtml(player.username)}">
              ${avatarMarkup(player, 'online-avatar')}
              <span>${escapeHtml(player.username)}</span>
            </button>
          `).join('')}
        </div>
      `
      : '<div class="online-empty">No invite targets online</div>';
    bindInviteButtons(gameKey);
  }

  function bindPlayerCards(){
    const card = document.getElementById('shellPlayerCard');
    if(!card) return;

    document.querySelectorAll('.online-player').forEach(playerEl => {
      playerEl.addEventListener('mouseenter', event => showPlayerCard(event, playerEl));
      playerEl.addEventListener('mousemove', event => positionPlayerCard(event));
      playerEl.addEventListener('mouseleave', hidePlayerCard);
      playerEl.addEventListener('focus', event => showPlayerCard(event, playerEl));
      playerEl.addEventListener('blur', hidePlayerCard);
    });
  }

  function getPlayerData(playerEl){
    try{
      return JSON.parse(playerEl.dataset.player || '{}');
    }catch(_err){
      return {};
    }
  }

  function showPlayerCard(event, playerEl){
    const card = document.getElementById('shellPlayerCard');
    if(!card) return;
    const player = getPlayerData(playerEl);
    const wins = player.wins || 0;
    const losses = player.losses || 0;
    const draws = player.draws || 0;
    const total = wins + losses + draws;
    const winrate = total ? Math.round((wins / total) * 100) : 0;
    const xp = player.xp || 0;
    const level = Math.floor(xp / 100) + 1;
    const progress = Math.max(8, Math.min(100, xp % 100));

    card.innerHTML = `
      <div class="shell-card-head">
        ${avatarMarkup(player, 'shell-card-avatar')}
        <div>
          <strong>${escapeHtml(player.username)}</strong>
          <span>Level ${level}</span>
        </div>
      </div>
      <div class="shell-xp-line"><span>XP</span><b>${xp}</b></div>
      <div class="shell-xp-bar"><i style="width:${progress}%"></i></div>
      <div class="shell-card-stats">
        <span><b>${wins}</b> Wins</span>
        <span><b>${losses}</b> Losses</span>
        <span><b>${winrate}%</b> WR</span>
      </div>
    `;
    card.classList.remove('hidden');
    positionPlayerCard(event);
  }

  function positionPlayerCard(event){
    const card = document.getElementById('shellPlayerCard');
    if(!card) return;
    const margin = 16;
    const width = card.offsetWidth || 260;
    const height = card.offsetHeight || 180;
    let left = event.clientX - width - margin;
    let top = event.clientY + margin;

    if(left < 8) left = event.clientX + margin;
    if(top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
    card.style.left = `${Math.max(8, left)}px`;
    card.style.top = `${Math.max(8, top)}px`;
  }

  function hidePlayerCard(){
    const card = document.getElementById('shellPlayerCard');
    if(card) card.classList.add('hidden');
  }

  function bindGlobalProfileClicks(){
    if(document.body.dataset.profileClicksBound) return;
    document.body.dataset.profileClicksBound = 'true';
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-profile-username], .username-link[data-username]');
      if(!target) return;

      const username = target.dataset.profileUsername || target.dataset.username;
      if(!username) return;

      event.preventDefault();
      window.location.href = `/profile.html?username=${encodeURIComponent(username)}`;
    });
  }

  window.SiteShell = {
    openProfile(username){
      if(!username) return;
      window.location.href = `/profile.html?username=${encodeURIComponent(username)}`;
    },
    openInvitePicker(gameKey){
      openInvitePicker(gameKey || currentGameKey());
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderShell);
  } else {
    renderShell();
  }
})();
