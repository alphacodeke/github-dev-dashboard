// ---------- UTILS ----------
    const toast = (msg, type = 'error') => {
      const container = document.getElementById('toastContainer');
      const toastDiv = document.createElement('div');
      toastDiv.className = `px-5 py-3 rounded-xl shadow-xl backdrop-blur-md text-sm font-medium flex items-center gap-3 transition-all duration-300 transform translate-x-0 ${type === 'error' ? 'bg-red-900/80 border border-red-500' : 'bg-green-900/80 border border-green-500'} text-white`;
      toastDiv.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${msg}`;
      container.appendChild(toastDiv);
      setTimeout(() => { toastDiv.remove(); }, 4000);
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const accountAge = (dateStr) => {
      const years = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 365.25);
      return `${Math.floor(years)} yr ${Math.floor((years % 1) * 12)} mo`;
    };

    let currentUsername = '';
    let currentUserData = null, currentRepos = [], currentEvents = [];
    let langChartInstance = null;

    // Cache with localStorage (1h)
    const cacheGet = (key) => { const item = localStorage.getItem(key); if(item) { const { expiry, data } = JSON.parse(item); if(expiry > Date.now()) return data; else localStorage.removeItem(key); } return null; };
    const cacheSet = (key, data) => { localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + 3600000 })); };

    // API module
    const fetchGitHub = async (endpoint) => {
      const res = await fetch(`https://api.github.com/${endpoint}`, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
      if(res.status === 404) throw new Error('User not found');
      if(res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') throw new Error('API rate limit exceeded. Try later.');
      if(!res.ok) throw new Error(`GitHub error: ${res.status}`);
      return res.json();
    };

    const fetchDeveloperData = async (username) => {
      const user = await fetchGitHub(`users/${username}`);
      const repos = await fetchGitHub(`users/${username}/repos?per_page=50&sort=updated`);
      const events = await fetchGitHub(`users/${username}/events?per_page=100`);
      return { user, repos, events };
    };

    // Helper functions: scores, lang aggregation
    const aggregateLanguages = (repos) => {
      const langMap = new Map();
      let totalBytes = 0;
      repos.forEach(repo => { if(repo.language) { let count = langMap.get(repo.language) || 0; langMap.set(repo.language, count + 1); totalBytes++; } });
      const distribution = Array.from(langMap.entries()).map(([lang, count]) => ({ lang, percent: (count / totalBytes) * 100 || 0, count }));
      distribution.sort((a,b)=>b.percent - a.percent);
      return { distribution, primary: distribution[0]?.lang || 'N/A' };
    };

    const categorizeRepos = (repos) => {
      const now = new Date();
      const active = [], maintained = [], abandoned = [];
      repos.forEach(repo => {
        const updated = new Date(repo.updated_at);
        const diffDays = (now - updated) / (1000 * 3600 * 24);
        if(diffDays <= 30) active.push(repo);
        else if(diffDays <= 180) maintained.push(repo);
        else abandoned.push(repo);
      });
      return { active, maintained, abandoned };
    };

    const computeScore = (user, repos, events) => {
      const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
      const pushEvents = events.filter(e => e.type === 'PushEvent').length;
      const recentActivity = pushEvents;
      const score = (totalStars * 2) + (user.followers * 1.5) + (recentActivity * 1);
      let level = 'Beginner';
      if(score >= 2000) level = 'Elite';
      else if(score >= 800) level = 'Advanced';
      else if(score >= 250) level = 'Intermediate';
      return { score: Math.floor(score), level, totalStars, pushEvents };
    };

    const topProjects = (repos) => {
      const mostStarred = [...repos].sort((a,b)=>b.stargazers_count - a.stargazers_count)[0];
      const recentUpdated = [...repos].sort((a,b)=>new Date(b.updated_at) - new Date(a.updated_at))[0];
      const hiddenGem = [...repos].filter(r => r.stargazers_count < 5 && new Date(r.updated_at) > new Date(Date.now() - 30*24*3600000)).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0];
      return { mostStarred, recentUpdated, hiddenGem };
    };

    const activityInsight = (events) => {
      const pushCount = events.filter(e=>e.type==='PushEvent').length;
      if(pushCount > 30) return 'Highly active';
      if(pushCount > 8) return 'Moderately active';
      return 'Occasionally active';
    };

    // Render UI
    let isCompareVisible = false;
    document.getElementById('compareToggle').addEventListener('click', ()=>{
      const section = document.getElementById('compareSection');
      isCompareVisible = !isCompareVisible;
      section.classList.toggle('hidden', !isCompareVisible);
    });

    async function renderDashboard(username) {
      if(!username) return;
      currentUsername = username;
      document.getElementById('dashboard').classList.add('opacity-50', 'pointer-events-none');
      try {
        const cached = cacheGet(`gh_${username}`);
        let data;
        if(cached) data = cached;
        else { data = await fetchDeveloperData(username); cacheSet(`gh_${username}`, data); }
        currentUserData = data; currentRepos = data.repos; currentEvents = data.events;
        updateProfileUI(data.user);
        updateScoreUI(data.user, data.repos, data.events);
        updateLanguageChart(data.repos);
        updateActivityInsight(data.events);
        updateRepositoriesUI(data.repos);
        updateTopProjectsUI(data.repos);
      } catch(err) {
        toast(err.message, 'error');
        console.error(err);
      } finally {
        document.getElementById('dashboard').classList.remove('opacity-50', 'pointer-events-none');
      }
    }

    function updateProfileUI(user) {
      const container = document.getElementById('profileCard');
      container.innerHTML = `
        <div class="flex flex-col items-center text-center">
          <img src="${user.avatar_url}" alt="avatar" class="w-28 h-28 rounded-full border-4 border-blue-500/50 shadow-xl">
          <h2 class="text-2xl font-bold mt-4">${user.name || user.login}</h2>
          <p class="text-blue-400 text-sm">@${user.login}</p>
          <p class="text-gray-300 text-sm mt-3 px-2">${user.bio || 'No bio provided'}</p>
          <div class="flex gap-6 mt-4 text-sm">
            <div><i class="fas fa-users"></i> <span class="font-bold">${user.followers}</span> followers</div>
            <div><i class="fas fa-user-plus"></i> <span class="font-bold">${user.following}</span> following</div>
            <div><i class="fas fa-code-branch"></i> <span class="font-bold">${user.public_repos}</span> repos</div>
          </div>
          <div class="mt-3 text-gray-400 text-xs"><i class="far fa-calendar-alt"></i> Joined ${formatDate(user.created_at)} · Account age ${accountAge(user.created_at)}</div>
        </div>
      `;
    }

    function updateScoreUI(user, repos, events) {
      const { score, level, totalStars, pushEvents } = computeScore(user, repos, events);
      document.getElementById('scoreCard').innerHTML = `
        <div class="flex flex-col h-full justify-between">
          <div><h3 class="text-xl font-bold flex items-center gap-2"><i class="fas fa-chart-simple"></i> Developer Score</h3></div>
          <div class="flex items-baseline gap-3 mt-2"><span class="text-5xl font-black bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">${score}</span><span class="px-4 py-1 rounded-full text-sm font-semibold bg-gray-800 border border-gray-600">${level}</span></div>
          <div class="grid grid-cols-2 gap-4 mt-4 text-center">
            <div class="bg-black/30 p-3 rounded-2xl"><i class="fas fa-star text-yellow-400"></i> <span class="block text-2xl font-bold">${totalStars}</span><span class="text-xs">Total Stars</span></div>
            <div class="bg-black/30 p-3 rounded-2xl"><i class="fas fa-bolt"></i> <span class="block text-2xl font-bold">${pushEvents}</span><span class="text-xs">Push Events</span></div>
          </div>
          <div class="text-sm text-gray-400 mt-2">Formula: (Stars*2) + (Followers*1.5) + (Activity*1)</div>
        </div>
      `;
    }

    function updateLanguageChart(repos) {
      const { distribution, primary } = aggregateLanguages(repos);
      const card = document.getElementById('langChartCard');
      card.innerHTML = `<h3 class="font-semibold text-lg mb-3"><i class="fas fa-code"></i> Language Intelligence · Primary: ${primary}</h3><div class="relative h-48"><canvas id="langRealCanvas"></canvas></div><p class="text-sm mt-3 text-gray-300">${primary} dominates the stack (${distribution[0]?.percent.toFixed(1) || 0}% of repos).</p>`;
      const canvas = document.getElementById('langRealCanvas');
      if(langChartInstance) langChartInstance.destroy();
      const labels = distribution.map(d=>d.lang).slice(0,5);
      const dataPerc = distribution.map(d=>d.percent).slice(0,5);
      const ctx = canvas.getContext('2d');
      langChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data: dataPerc, backgroundColor: ['#3b82f6','#f97316','#8b5cf6','#10b981','#ef4444'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#ccc' } } } } });
    }

    function updateActivityInsight(events) {
      const insight = activityInsight(events);
      const pushCount = events.filter(e=>e.type==='PushEvent').length;
      document.getElementById('insightCard').innerHTML = `
        <h3 class="font-semibold text-lg"><i class="fas fa-chart-line"></i> Activity Pulse</h3>
        <div class="mt-4 text-center p-4 bg-black/30 rounded-2xl"><span class="text-3xl font-bold">${pushCount}</span><p class="text-sm">Recent Push Events</p><div class="mt-3 text-xl font-medium text-blue-300">${insight}</div></div>
        <div class="mt-4 text-gray-300 text-xs">Based on last 90 events · Push frequency score</div>
      `;
    }

    function updateRepositoriesUI(repos) {
      const { active, maintained, abandoned } = categorizeRepos(repos);
      document.getElementById('reposCard').innerHTML = `
        <h3 class="font-bold text-xl flex items-center gap-2"><i class="fas fa-folder-open"></i> Repo Health</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div class="bg-black/30 p-3 rounded-xl"><span class="text-green-400 font-bold">● Active</span><div class="text-2xl">${active.length}</div><div class="text-xs">Updated last 30 days</div></div>
          <div class="bg-black/30 p-3 rounded-xl"><span class="text-yellow-400 font-bold">● Maintained</span><div class="text-2xl">${maintained.length}</div><div class="text-xs">Updated last 6 months</div></div>
          <div class="bg-black/30 p-3 rounded-xl"><span class="text-red-400 font-bold">● Abandoned</span><div class="text-2xl">${abandoned.length}</div><div class="text-xs">Older than 6 months</div></div>
        </div>
        <div class="mt-4 max-h-64 overflow-y-auto space-y-2">
          ${repos.slice(0,8).map(repo => `<div class="bg-gray-800/40 p-3 rounded-xl flex justify-between items-center flex-wrap"><div><i class="fab fa-github-alt"></i> <span class="font-mono">${repo.name}</span><div class="text-xs text-gray-400">⭐ ${repo.stargazers_count} · 🍴 ${repo.forks_count} · ${repo.language||'?'} · issues ${repo.open_issues_count}</div></div><span class="text-xs">${new Date(repo.updated_at).toLocaleDateString()}</span></div>`).join('')}
          ${repos.length > 8 ? '<p class="text-xs text-gray-400 text-center">+ more repos...</p>' : ''}
        </div>
      `;
      // re-attach top projects after repos card rebuilt
      updateTopProjectsUI(repos);
    }

    function updateTopProjectsUI(repos) {
      const { mostStarred, recentUpdated, hiddenGem } = topProjects(repos);
      const projectsHtml = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-4 rounded-2xl border border-yellow-500/30"><i class="fas fa-trophy text-yellow-400"></i><p class="font-bold mt-1">Most Starred</p><p class="truncate">${mostStarred?.name || 'N/A'}</p><span class="text-xs">⭐ ${mostStarred?.stargazers_count || 0}</span></div>
          <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-4 rounded-2xl border border-blue-500/30"><i class="fas fa-sync-alt"></i><p class="font-bold mt-1">Recent Activity</p><p class="truncate">${recentUpdated?.name || 'N/A'}</p><span class="text-xs">updated ${recentUpdated ? new Date(recentUpdated.updated_at).toLocaleDateString() : ''}</span></div>
          <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-4 rounded-2xl border border-purple-500/30"><i class="fas fa-gem"></i><p class="font-bold mt-1">Hidden Gem</p><p class="truncate">${hiddenGem?.name || 'None found'}</p><span class="text-xs">🔥 recent activity</span></div>
        </div>
      `;
      const reposCard = document.getElementById('reposCard');
      let topDiv = reposCard.querySelector('.top-project-row');
      if(!topDiv) {
        const rowDiv = document.createElement('div'); rowDiv.className = 'mt-5 top-project-row';
        rowDiv.innerHTML = `<div class="text-sm font-semibold mb-2"><i class="fas fa-crown"></i> 🏆 Top Projects</div>${projectsHtml}`;
        reposCard.appendChild(rowDiv);
      } else {
        topDiv.innerHTML = `<div class="text-sm font-semibold mb-2"><i class="fas fa-crown"></i> 🏆 Top Projects</div>${projectsHtml}`;
      }
    }

    // compare logic
    document.getElementById('runCompare').addEventListener('click', async () => {
      const userA = document.getElementById('compareUser1').value.trim();
      const userB = document.getElementById('compareUser2').value.trim();
      if(!userA || !userB) return toast('Enter both usernames');
      try {
        const [dataA, dataB] = await Promise.all([fetchDeveloperData(userA), fetchDeveloperData(userB)]);
        const scoreA = computeScore(dataA.user, dataA.repos, dataA.events);
        const scoreB = computeScore(dataB.user, dataB.repos, dataB.events);
        const langA = aggregateLanguages(dataA.repos).primary;
        const langB = aggregateLanguages(dataB.repos).primary;
        const html = `
          <div class="glass-card p-4"><div class="font-bold text-xl">${userA}</div><div class="mt-2">⭐ Score: ${scoreA.score} (${scoreA.level})<br>👥 Followers: ${dataA.user.followers}<br>📦 Stars: ${scoreA.totalStars}<br>🔤 Main Lang: ${langA}</div></div>
          <div class="glass-card p-4"><div class="font-bold text-xl">${userB}</div><div class="mt-2">⭐ Score: ${scoreB.score} (${scoreB.level})<br>👥 Followers: ${dataB.user.followers}<br>📦 Stars: ${scoreB.totalStars}<br>🔤 Main Lang: ${langB}</div></div>
        `;
        document.getElementById('compareResult').innerHTML = html;
      } catch(e) { toast(`Compare error: ${e.message}`); }
    });

    // Export PNG (canvas generation)
    document.getElementById('exportPngBtn').addEventListener('click', async () => {
      if(!currentUserData) return toast('No developer loaded', 'error');
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 500;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#0a0c10'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.font = 'bold 32px Inter'; ctx.fillStyle = '#ffffff'; ctx.fillText('GitHub DevIQ Report', 40, 70);
      ctx.font = '18px Inter'; ctx.fillStyle = '#b0b3b8'; ctx.fillText(`@${currentUsername} · Score: ${computeScore(currentUserData.user, currentRepos, currentEvents).score}`, 40, 130);
      ctx.font = '14px monospace'; ctx.fillStyle = '#aaa'; 
      ctx.fillText(`Repos: ${currentRepos.length} | Stars: ${currentRepos.reduce((a,b)=>a+b.stargazers_count,0)} | Followers: ${currentUserData.user.followers}`, 40, 190);
      const avatar = new Image(); avatar.crossOrigin = "Anonymous";
      avatar.src = currentUserData.user.avatar_url;
      avatar.onload = () => { ctx.drawImage(avatar, 40, 220, 80, 80); ctx.fillStyle="white"; ctx.font='bold 20px Inter'; ctx.fillText(`${currentUserData.user.name || currentUsername}`, 140, 270); const link = document.createElement('a'); link.download = 'github_dev_card.png'; link.href = canvas.toDataURL(); link.click(); toast('Export ready!', 'success'); };
      avatar.onerror = () => toast('Could not load avatar');
    });

    // Search + enter
    const searchFn = () => { const val = document.getElementById('searchInput').value.trim(); if(val) renderDashboard(val); else toast('Enter username'); };
    document.getElementById('searchBtn').addEventListener('click', searchFn);
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') searchFn(); });
    
    // Typing animation hero
    const heroElem = document.getElementById('heroText');
    const phrases = ['GitHub Intelligence Engine', 'Deep Developer Analytics', 'Score · Compare · Export'];
    let idx=0, charIdx=0; function typeEffect() { if(charIdx <= phrases[idx].length) { heroElem.innerText = phrases[idx].substring(0,charIdx); charIdx++; setTimeout(typeEffect, 80); } else { setTimeout(()=>{ idx=(idx+1)%phrases.length; charIdx=0; typeEffect(); }, 2500); } } typeEffect();
    
    // initial default = alphacodeke
    renderDashboard('alphacodeke');