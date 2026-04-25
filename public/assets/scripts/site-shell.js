(function(){
  function getUser(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null');
    }catch(_err){
      return null;
    }
  }

  function goTo(link){
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

  function bindNavbar(){
    const container = document.getElementById('navbar-container');
    if(!container) return;

    fetch('/components/navbar.html')
      .then(res => res.text())
      .then(html => {
        container.innerHTML = html;

        const user = getUser();
        if(user?.isAdmin){
          const adminBtn = document.getElementById('adminNav');
          if(adminBtn) adminBtn.style.display = 'inline-block';
        }

        document.querySelectorAll('[data-link]').forEach(btn => {
          btn.addEventListener('click', ()=> goTo(btn.dataset.link));
        });
      })
      .catch(err => console.error('Navbar load error:', err));
  }

  function bindGlobalProfileClicks(){
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
    }
  };

  bindNavbar();
  bindGlobalProfileClicks();
})();
