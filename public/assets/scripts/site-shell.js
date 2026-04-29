(function(){
  const PUBLIC_PATHS = ['/login.html', '/register.html'];
  const GAME_LINKS = new Set(['home', 'games', 'leaderboard', 'challenges', 'tournaments', 'profile', 'settings', 'admin', 'logout']);
  let onlineSocket = null;
  let latestOnlineUsers = {};
  let invitePickerOpen = false;
  let notificationOpen = false;
  let notificationSequence = 0;
  let notifications = [];
  let friendState = { friends: [], incoming: [], outgoing: [] };

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
    if(link === 'challenges') window.location.href = '/weekly-challenge';
    if(link === 'tournaments') window.location.href = '/coming-soon.html?feature=tournaments';
    if(link === 'profile') window.location.href = '/profile.html';
    if(link === 'settings') window.location.href = '/coming-soon.html?feature=settings';
    if(link === 'admin') window.location.href = '/admin.html';

    if(link === 'logout'){
      fetch('/api/logout', { method: 'POST' })
        .catch(()=>null)
        .finally(()=>{
          localStorage.removeItem('user');
          window.location.href = '/login.html';
        });
    }
  }

  function icon(name){
    const icons = {
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-6h4v6h5v-9.5"/>',
      games: '<path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 11h.01"/><path d="M18 13h.01"/><path d="M8.5 7h7c3 0 5.5 2.4 5.5 5.4 0 3.5-1.5 5.6-3.4 5.6-1.2 0-2-1-2.8-2H9.2c-.8 1-1.6 2-2.8 2C4.5 18 3 15.9 3 12.4 3 9.4 5.5 7 8.5 7Z"/>',
      leaderboard: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a4 4 0 0 1-4 4"/><path d="M7 5H4v2a4 4 0 0 0 4 4"/>',
      challenges: '<path d="M12 3 4.5 6v5.5c0 4.3 3 7.9 7.5 9.5 4.5-1.6 7.5-5.2 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-5"/>',
      tournaments: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a4 4 0 0 1-4 4"/><path d="M7 5H4v2a4 4 0 0 0 4 4"/>',
      profile: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
      settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.6 19.4a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.1-.4H2a2 2 0 1 1 0-4h.09a1.8 1.8 0 0 0 1.51-1A1.8 1.8 0 0 0 3.24 7l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 .6-1V3a2 2 0 1 1 4 0v.09A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 9c.27.32.6.52 1 .6.35.07.72.1 1.1.1H22a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z"/>',
      admin: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-5"/>',
      logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      bell: '<path d="M10 21h4"/><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
      userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'
    };

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.home}</svg>`;
  }

  function getActiveLink(){
    const path = window.location.pathname;
    if(path === '/' || path.endsWith('/index.html')) return 'home';
    if(path.includes('/chess') || path.includes('/othello') || path.includes('/azul') || path.includes('/moonfall') || path.endsWith('/games.html')) return 'games';
    if(path.includes('/leaderboard')) return 'leaderboard';
    if(path.includes('/weekly-challenge')) return 'challenges';
    if(path.includes('/coming-soon')){
      const feature = new URLSearchParams(window.location.search).get('feature') || '';
      if(feature.includes('weekly')) return 'challenges';
      if(feature.includes('tournament')) return 'tournaments';
      if(feature.includes('setting')) return 'settings';
    }
    if(path.includes('/strategy') || path.includes('/moonfall-world-conquest')) return 'games';
    if(path.includes('/profile')) return 'profile';
    if(path.includes('/admin')) return 'admin';
    return 'home';
  }

  function isGameShellPage(){
    const path = window.location.pathname;
    if(path.endsWith('/games.html')) return true;
    return [
      '/chess',
      '/othello',
      '/azul',
      '/moonfall-p4',
      '/hexblitz_moonfall',
      '/moonfall-settlers',
      '/moonfall-world-conquest',
      '/moonfall-rts',
      '/strategy'
    ].some(segment => path.includes(segment));
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
    document.body.classList.toggle('game-shell-active', isGameShellPage());
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
          <img src="/assets/images/games/Logo-SL.webp" alt="" onerror="this.remove()">
          <span>SL</span>
          <b>Strategy<br>League</b>
        </button>
        <nav class="shell-nav">
          ${navItem('home', 'Dashboard', active)}
          ${navItem('games', 'Games', active)}
          ${navItem('leaderboard', 'Leaderboard', active)}
          ${navItem('challenges', 'Weekly Challenge', active)}
          ${navItem('tournaments', 'Tournaments', active)}
          ${navItem('profile', 'Profile', active)}
          ${navItem('settings', 'Settings', active)}
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

      <button id="shellNotificationBell" class="shell-notification-bell" type="button" aria-label="Notifications" title="Notifications">
        ${icon('bell')}
        <b id="shellNotificationCount" class="hidden">0</b>
      </button>
      <div id="shellNotificationPanel" class="shell-notification-panel hidden"></div>
      <button id="shellFullscreenBtn" class="shell-fullscreen-btn ${isGameShellPage() ? '' : 'hidden'}" type="button" aria-label="Fullscreen" title="Fullscreen">
        ${icon('fullscreen')}
      </button>

      <div id="shellPlayerCard" class="shell-player-card hidden"></div>
      <div id="shellToastStack" class="shell-toast-stack"></div>
      <div id="activeGameBanner" class="active-game-banner hidden"></div>
    `;

    document.querySelectorAll('[data-link]').forEach(btn => {
      btn.addEventListener('click', ()=> goTo(btn.dataset.link));
    });

    bindLeftGameSidebarControls();
    bindOnlinePanelControls();
    bindNotificationControls();
    bindFullscreenControls();
    bindGlobalProfileClicks();
    loadFriends();
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

  function bindLeftGameSidebarControls(){
    const sidebar = document.querySelector('.app-sidebar-left');
    if(!sidebar || !document.body.classList.contains('game-shell-active')) return;

    sidebar.addEventListener('click', event => {
      if(event.target.closest('[data-link]') && sidebar.classList.contains('expanded')) return;
      sidebar.classList.add('expanded');
    });

    document.addEventListener('click', event => {
      if(event.target.closest('.app-sidebar-left')) return;
      sidebar.classList.remove('expanded');
    });
  }

  function bindNotificationControls(){
    const bell = document.getElementById('shellNotificationBell');
    const panel = document.getElementById('shellNotificationPanel');
    if(!bell || !panel) return;

    bell.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      notificationOpen = !notificationOpen;
      panel.classList.toggle('hidden', !notificationOpen);
      renderNotificationCenter();
    });

    document.addEventListener('click', event => {
      if(event.target.closest('.shell-notification-bell, .shell-notification-panel')) return;
      notificationOpen = false;
      panel.classList.add('hidden');
    });
  }

  function fullscreenTarget(){
    const selectors = [
      '#gameView:not([hidden])',
      '#gameScreen:not([hidden])',
      '.moonveil-scene',
      '.azul-game',
      '#main',
      'main'
    ];

    for(const selector of selectors){
      const target = document.querySelector(selector);
      if(target && target.offsetWidth > 0 && target.offsetHeight > 0) return target;
    }

    return document.documentElement;
  }

  function bindFullscreenControls(){
    const button = document.getElementById('shellFullscreenBtn');
    if(!button) return;

    button.addEventListener('click', async () => {
      try{
        if(document.fullscreenElement){
          await document.exitFullscreen?.();
        }else{
          await fullscreenTarget().requestFullscreen?.();
        }
      }catch(err){
        showToast({ title: 'Fullscreen', message: 'Fullscreen is not available in this browser.' });
      }
    });

    document.addEventListener('fullscreenchange', () => {
      button.classList.toggle('is-active', Boolean(document.fullscreenElement));
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
        onlineSocket.emit('register_online', { username: user.username });
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
    return path.includes('/chess') || path.includes('/othello') || path.includes('/azul') || path.includes('/moonfall-settlers') || path.includes('/moonfall-p4') || path.includes('/hexblitz_moonfall');
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
          socket.emit('register_online', { username: user.username });
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
    if(path.includes('/moonfall-settlers')) return 'moonfall';
    if(path.includes('/moonfall-p4')) return 'moonfall_p4';
    if(path.includes('/hexblitz_moonfall')) return 'hexblitz';
    if(path.includes('/moonfall-world-conquest')) return 'moonfall_world_conquest';
    if(path.includes('/moonfall-rts')) return 'moonfall_rts';
    return null;
  }

  function gameUrlFor(gameKey){
    return {
      chess: '/chess/chess-game.html',
      othello: '/othello/game.html',
      azul: '/azul/game.html',
      moonfall: '/moonfall-settlers/index.html',
      moonfall_p4: '/moonfall-p4/index.html',
      hexblitz: '/hexblitz_moonfall/index.html',
      moonfall_world_conquest: '/moonfall-world-conquest/index.html',
      moonfall_rts: '/moonfall-rts/index.html'
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

    socket.on('friend_request', request => {
      const from = request?.from || request?.username;
      showToast({
        title: 'Friend request',
        message: request?.message || `${from || 'A player'} wants to add you as a friend.`,
        actions: [
          { label: 'Accept', onClick: () => acceptFriend(from) },
          { label: 'Decline', quiet: true, onClick: () => declineFriend(from) }
        ]
      });
      loadFriends();
    });

    socket.on('friend_update', update => {
      showToast({ title: 'Friends', message: update?.message || 'Friends updated.' });
      loadFriends();
    });

    socket.on('active_game_status', renderActiveGameBanner);
    socket.on('auth_required', () => {
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    });
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
    const notification = addNotification({ title, message, actions });
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
        notification.read = true;
        renderNotificationCenter();
        toast.remove();
      });
    });

    stack.appendChild(toast);
    if(!actions.length) setTimeout(()=>toast.remove(), 4200);
  }

  function addNotification({ title, message, actions = [] }){
    const notification = {
      id: `${Date.now()}-${notificationSequence += 1}`,
      title: title || 'Notification',
      message: message || '',
      actions,
      read: false,
      createdAt: new Date()
    };
    notifications = [notification, ...notifications].slice(0, 20);
    renderNotificationCenter();
    return notification;
  }

  function unreadNotifications(){
    return notifications.filter(notification => !notification.read).length;
  }

  function renderNotificationCenter(){
    const count = document.getElementById('shellNotificationCount');
    const panel = document.getElementById('shellNotificationPanel');
    const unread = unreadNotifications();

    if(count){
      count.textContent = String(unread);
      count.classList.toggle('hidden', unread === 0);
    }

    if(!panel) return;
    panel.innerHTML = `
      <div class="shell-notification-head">
        <strong>Notifications</strong>
        <button type="button" data-clear-notifications>Clear</button>
      </div>
      <div class="shell-notification-list">
        ${notifications.length ? notifications.map(notification => `
          <article class="shell-notification-item ${notification.read ? 'is-read' : ''}" data-notification-id="${escapeHtml(notification.id)}">
            <strong>${escapeHtml(notification.title)}</strong>
            <p>${escapeHtml(notification.message)}</p>
            ${notification.actions?.length ? `
              <div class="shell-notification-actions">
                ${notification.actions.map((action, index) => `<button type="button" data-notification-action="${index}" class="${action.quiet ? 'quiet' : ''}">${escapeHtml(action.label)}</button>`).join('')}
              </div>
            ` : ''}
          </article>
        `).join('') : '<div class="online-empty">No notifications yet</div>'}
      </div>
    `;

    panel.querySelector('[data-clear-notifications]')?.addEventListener('click', () => {
      notifications = [];
      renderNotificationCenter();
    });

    panel.querySelectorAll('.shell-notification-item').forEach(item => {
      const notification = notifications.find(entry => entry.id === item.dataset.notificationId);
      if(!notification) return;
      item.addEventListener('click', () => {
        notification.read = true;
        renderNotificationCenter();
      });
      item.querySelectorAll('[data-notification-action]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          const index = Number(button.dataset.notificationAction);
          notification.actions?.[index]?.onClick?.();
          notification.read = true;
          renderNotificationCenter();
        });
      });
    });
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

  function usernamesFrom(list){
    return new Set((Array.isArray(list) ? list : []).map(entry => entry.username || entry).filter(Boolean));
  }

  function friendRelation(username){
    const user = getUser();
    if(!username || username === user?.username) return 'self';
    if(usernamesFrom(friendState.friends).has(username)) return 'friend';
    if(usernamesFrom(friendState.incoming).has(username)) return 'incoming';
    if(usernamesFrom(friendState.outgoing).has(username)) return 'outgoing';
    return 'none';
  }

  async function loadFriends(){
    try{
      const response = await fetch('/api/friends', { cache: 'no-store' });
      if(!response.ok) return;
      const data = await response.json();
      friendState = {
        friends: Array.isArray(data.friends) ? data.friends : [],
        incoming: Array.isArray(data.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data.outgoing) ? data.outgoing : []
      };
      renderOnlinePlayers(latestOnlineUsers);
      renderInvitePicker(currentGameKey(), entriesFromLatestUsers());
      window.dispatchEvent(new CustomEvent('site-shell-friends-update', { detail: friendState }));
    }catch(err){
      console.error('Friends unavailable:', err);
    }
  }

  async function requestFriend(username){
    if(!username) return;
    try{
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'Friend request unavailable');
      friendState = {
        friends: Array.isArray(data.friends) ? data.friends : friendState.friends,
        incoming: Array.isArray(data.incoming) ? data.incoming : friendState.incoming,
        outgoing: Array.isArray(data.outgoing) ? data.outgoing : friendState.outgoing
      };
      showToast({ title: 'Friends', message: data.status === 'friends' ? `${username} is now your friend.` : `Friend request sent to ${username}.` });
      renderOnlinePlayers(latestOnlineUsers);
      window.dispatchEvent(new CustomEvent('site-shell-friends-update', { detail: friendState }));
    }catch(err){
      showToast({ title: 'Friends', message: err.message || 'Friend request unavailable.' });
    }
  }

  async function acceptFriend(username){
    if(!username) return;
    try{
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'Friend accept unavailable');
      friendState = {
        friends: Array.isArray(data.friends) ? data.friends : friendState.friends,
        incoming: Array.isArray(data.incoming) ? data.incoming : friendState.incoming,
        outgoing: Array.isArray(data.outgoing) ? data.outgoing : friendState.outgoing
      };
      showToast({ title: 'Friends', message: `${username} is now your friend.` });
      renderOnlinePlayers(latestOnlineUsers);
      window.dispatchEvent(new CustomEvent('site-shell-friends-update', { detail: friendState }));
    }catch(err){
      showToast({ title: 'Friends', message: err.message || 'Friend accept unavailable.' });
    }
  }

  async function declineFriend(username){
    if(!username) return;
    try{
      const response = await fetch('/api/friends/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'Friend decline unavailable');
      friendState = {
        friends: Array.isArray(data.friends) ? data.friends : friendState.friends,
        incoming: Array.isArray(data.incoming) ? data.incoming : friendState.incoming,
        outgoing: Array.isArray(data.outgoing) ? data.outgoing : friendState.outgoing
      };
      showToast({ title: 'Friends', message: `Friend request from ${username} declined.` });
      renderOnlinePlayers(latestOnlineUsers);
      window.dispatchEvent(new CustomEvent('site-shell-friends-update', { detail: friendState }));
    }catch(err){
      showToast({ title: 'Friends', message: err.message || 'Friend decline unavailable.' });
    }
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
      const relation = friendRelation(player.username);
      const isMe = relation === 'self';
      const friendAction = relation === 'friend'
        ? (gameKey ? `<button class="online-row-action" type="button" data-invite-username="${escapeHtml(player.username)}" title="Invite friend">${icon('games')}</button>` : '<span class="online-friend-pill">Friend</span>')
        : relation === 'incoming'
          ? `<button class="online-row-action" type="button" data-accept-friend="${escapeHtml(player.username)}" title="Accept friend request">${icon('check')}</button>`
          : relation === 'outgoing'
            ? '<span class="online-friend-pill">Sent</span>'
            : !isMe
              ? `<button class="online-row-action" type="button" data-request-friend="${escapeHtml(player.username)}" title="Add friend">${icon('userPlus')}</button>`
              : '';

      return `
        <div class="online-player-row">
          <button class="online-player" type="button" data-profile-username="${escapeHtml(player.username)}" data-player='${escapeHtml(JSON.stringify(player))}'>
            ${avatarMarkup(player, 'online-avatar')}
            <span class="online-player-copy">
              <strong>${escapeHtml(player.username)}</strong>
            </span>
            <i></i>
          </button>
          ${friendAction}
        </div>
      `;
    }).join('');

    bindPlayerCards();
    bindFriendButtons();
    bindInviteButtons(gameKey);
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

  function bindFriendButtons(){
    document.querySelectorAll('[data-request-friend]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        requestFriend(button.dataset.requestFriend);
      });
    });

    document.querySelectorAll('[data-accept-friend]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        acceptFriend(button.dataset.acceptFriend);
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

    const friends = usernamesFrom(friendState.friends);
    const targets = entries.filter(player => user?.username && player.username !== user.username && friends.has(player.username));
    picker.classList.remove('hidden');
    picker.innerHTML = targets.length
      ? `
        <strong>Invite friend</strong>
        <div>
          ${targets.map(player => `
            <button class="online-invite-target" type="button" data-invite-username="${escapeHtml(player.username)}">
              ${avatarMarkup(player, 'online-avatar')}
              <span>${escapeHtml(player.username)}</span>
            </button>
          `).join('')}
        </div>
      `
      : '<div class="online-empty">No friends online to invite</div>';
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
    const level = player.level || player.levelInfo?.level || 1;
    const progress = Math.max(8, Math.min(100, player.levelInfo?.progress || 0));

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
    },
    requestFriend(username){
      requestFriend(username);
    },
    acceptFriend(username){
      acceptFriend(username);
    },
    declineFriend(username){
      declineFriend(username);
    },
    getFriendState(){
      return friendState;
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderShell);
  } else {
    renderShell();
  }
})();
