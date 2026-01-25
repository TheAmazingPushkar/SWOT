
        document.addEventListener('DOMContentLoaded', () => {
            // --- state keys ---
            const LS_GOALS = 'swot_goals_v1';
            const LS_SESSIONS = 'swot_sessions_v1';
            const LS_JOURNAL = 'swot_journal_v1';
            const LS_PROFILE = 'swot_profile_v1';

            // --- Date & Greeting ---
            const dateEl = document.getElementById('current-date');
            const greetingEl = document.getElementById('greeting');
            const now = new Date();
            if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            const hour = now.getHours();
            let greetText = 'Good Evening';
            if (hour < 12) greetText = 'Good Morning';
            else if (hour < 18) greetText = 'Good Afternoon';
            if (greetingEl) greetingEl.textContent = `${greetText}, Simon`;

            // --- Sidebar toggles ---
            const sidebar = document.getElementById('sidebar');
            const openBtn = document.getElementById('open-sidebar');
            const closeBtn = document.getElementById('close-sidebar');
            if (openBtn) openBtn.addEventListener('click', () => sidebar.classList.add('active'));
            if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('active'));

            // --- Elements ---
            const startBtn = document.getElementById('start-timer');
            const resetBtn = document.getElementById('reset-timer');
            const statusText = document.querySelector('.timer-status');
            const circle = document.querySelector('.progress-ring__circle');
            const minEl = document.getElementById('minutes');
            const secEl = document.getElementById('seconds');

            // --- Goals UI ---
            const addGoalBtn = document.querySelector('.add-btn');
            const goalListEl = document.querySelector('.goal-list');
            const sessionsCountEl = document.getElementById('sessions-count');
            const tasksCompletedEl = document.getElementById('tasks-completed');
            const productivityEl = document.getElementById('productivity-score');

            // Modals
            const goalModal = document.getElementById('goal-modal');
            const goalInput = document.getElementById('goal-input');
            const goalSave = document.getElementById('goal-save');
            const goalCancel = document.getElementById('goal-cancel');
            const settingsModal = document.getElementById('settings-modal');
            const settingsClose = document.getElementById('settings-close');

            // --- Pomodoro state ---
            let timeLeft = 25 * 60;
            let timerInterval = null;
            let isRunning = false;
            const radius = circle ? circle.r.baseVal.value : 60;
            const circumference = radius * 2 * Math.PI;
            if (circle) {
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                circle.style.strokeDashoffset = circumference;
            }

            function setProgress(percent) {
                if (!circle) return;
                const offset = circumference - (percent / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }

            function updateTimerDisplay() {
                const m = Math.floor(timeLeft / 60);
                const s = timeLeft % 60;
                if (minEl) minEl.textContent = m.toString().padStart(2, '0');
                if (secEl) secEl.textContent = s.toString().padStart(2, '0');
                const totalTime = 25 * 60;
                const percent = ((totalTime - timeLeft) / totalTime) * 100;
                setProgress(percent);
            }

            // --- Persistent Goals ---
            let goals = [];
            function loadGoals() {
                const raw = localStorage.getItem(LS_GOALS);
                if (raw) {
                    try { goals = JSON.parse(raw); } catch (e) { goals = []; }
                } else {
                    // seed from DOM if present
                    const nodes = document.querySelectorAll('.goal-list li');
                    nodes.forEach((li, idx) => {
                        const label = li.querySelector('label')?.textContent || `Goal ${idx+1}`;
                        const checked = li.querySelector('input')?.checked || false;
                        goals.push({ id: 'seed-' + idx, text: label.trim(), completed: checked, tag: 'med' });
                    });
                    saveGoals();
                }
            }

            function saveGoals() { localStorage.setItem(LS_GOALS, JSON.stringify(goals)); }

            function renderGoals() {
                if (!goalListEl) return;
                goalListEl.innerHTML = '';
                goals.forEach(g => {
                    const li = document.createElement('li');
                    li.dataset.id = g.id;
                    li.innerHTML = `
                        <input type="checkbox" ${g.completed ? 'checked' : ''} id="${g.id}">
                        <label for="${g.id}">${escapeHtml(g.text)}</label>
                        <span class="tag ${g.tag}">${g.tag.toUpperCase()}</span>
                        <div class="goal-actions" style="margin-left:8px;display:flex;gap:8px">
                            <button class="icon-btn edit-goal" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="icon-btn delete-goal" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                    goalListEl.appendChild(li);
                });
                updateStats();
            }

            function escapeHtml(text){ return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

            function addGoal(text, tag = 'med'){
                const g = { id: 'g-' + Date.now(), text: text.trim(), completed: false, tag };
                goals.unshift(g);
                saveGoals();
                renderGoals();
            }

            function updateStats(){
                const completed = goals.filter(g => g.completed).length;
                const sessions = parseInt(localStorage.getItem(LS_SESSIONS) || '0', 10);
                const score = Math.round(sessions * 8 + completed * 5);
                if (sessionsCountEl) sessionsCountEl.textContent = sessions;
                if (tasksCompletedEl) tasksCompletedEl.textContent = completed;
                if (productivityEl) productivityEl.textContent = score;
                // animate chart roughly based on sessions
                animateChart(sessions);
            }

            // Update analytics page metrics if present
            function updateAnalyticsMetrics(){
                const sessions = parseInt(localStorage.getItem(LS_SESSIONS) || '0', 10);
                const completed = goals.filter(g => g.completed).length;
                const score = Math.round(sessions * 8 + completed * 5);
                const m1 = document.getElementById('mSessions');
                const m2 = document.getElementById('mTasks');
                const m3 = document.getElementById('mScore');
                if (m1) m1.textContent = sessions;
                if (m2) m2.textContent = completed;
                if (m3) m3.textContent = score;
            }

            function animateChart(sessions){
                const bars = document.querySelectorAll('.css-chart .bar');
                if(!bars.length) return;
                bars.forEach((bar,i)=>{
                    // simple distribution: recent day gets sessions mod 100
                    const base = 30 + ((sessions * (i+1)) % 70);
                    bar.style.height = Math.min(90, base) + '%';
                });
            }

            // Delegated click/change events for goals
            if (goalListEl) {
                goalListEl.addEventListener('click', (e) => {
                    const li = e.target.closest('li');
                    if (!li) return;
                    const id = li.dataset.id;
                    if (e.target.closest('.edit-goal')) {
                        const g = goals.find(x => x.id === id);
                        const newText = prompt('Edit goal', g.text);
                        if (newText !== null) { g.text = newText.trim(); saveGoals(); renderGoals(); }
                    } else if (e.target.closest('.delete-goal')) {
                        if (confirm('Delete this goal?')) { goals = goals.filter(x => x.id !== id); saveGoals(); renderGoals(); }
                    }
                });

                goalListEl.addEventListener('change', (e) => {
                    if (e.target.type === 'checkbox') {
                        const li = e.target.closest('li');
                        const id = li.dataset.id;
                        const g = goals.find(x => x.id === id);
                        if (g) { g.completed = e.target.checked; saveGoals(); updateStats(); }
                    }
                });
            }

            // --- Modal logic for adding goals ---
            function openGoalModal(){ 
                if (goalModal){ 
                    goalModal.setAttribute('aria-hidden','false'); 
                    if (goalInput) goalInput.focus(); 
                    return;
                }
                // fallback: simple prompt if modal not present on this page
                const g = prompt('Enter your new goal:');
                if (g && g.trim()) addGoal(g.trim());
            }
            function closeGoalModal(){ if (goalModal) { goalModal.setAttribute('aria-hidden','true'); if (goalInput) goalInput.value = ''; } }
            if (addGoalBtn) addGoalBtn.addEventListener('click', openGoalModal);
            if (goalCancel) goalCancel.addEventListener('click', closeGoalModal);
            if (goalSave) goalSave.addEventListener('click', () => { const v = goalInput.value || ''; if (v.trim()) addGoal(v.trim()); closeGoalModal(); });

            if (settingsClose) settingsClose.addEventListener('click', () => { if (settingsModal) settingsModal.setAttribute('aria-hidden','true'); });

            // --- Settings & menu icon buttons ---
            document.querySelectorAll('.icon-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // open settings modal when ellipsis clicked
                    if (btn.querySelector('.fa-ellipsis') || btn.querySelector('.fa-ellipsis-vertical')) {
                        if (settingsModal) settingsModal.setAttribute('aria-hidden','false');
                    }
                });
            });

            // Logout confirmation
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
                if (!confirm('Are you sure you want to logout? (local demo)')) e.preventDefault();
            });

            // --- Profile dropdown interactions ---
            const profilePic = document.getElementById('profile-pic');
            const profileMenu = document.getElementById('profile-menu');
            const profileView = document.getElementById('profile-view');
            const profileSettings = document.getElementById('profile-settings');
            const profileLogout = document.getElementById('profile-logout');

            function closeProfileMenu(){ if(profileMenu){ profileMenu.setAttribute('aria-hidden','true'); profilePic?.setAttribute('aria-expanded','false'); profileMenu.classList.remove('show'); } }
            function openProfileMenu(){ if(profileMenu){ profileMenu.setAttribute('aria-hidden','false'); profilePic?.setAttribute('aria-expanded','true'); profileMenu.classList.add('show'); } }

            if(profilePic){
                profilePic.addEventListener('click',(e)=>{ const isOpen = profileMenu && profileMenu.getAttribute('aria-hidden') === 'false'; if(isOpen) closeProfileMenu(); else openProfileMenu(); e.stopPropagation(); });
                profilePic.addEventListener('keydown',(e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const isOpen = profileMenu && profileMenu.getAttribute('aria-hidden') === 'false'; if(isOpen) closeProfileMenu(); else openProfileMenu(); } });
            }

            // Close when clicking outside
            document.addEventListener('click',(e)=>{ if(!profilePic) return; if(profileMenu && profileMenu.getAttribute('aria-hidden') === 'false'){ const inside = e.target.closest && (e.target.closest('#profile-pic') || e.target.closest('#profile-menu')); if(!inside) closeProfileMenu(); } });
            // Close on Esc
            document.addEventListener('keydown',(e)=>{ if(e.key === 'Escape') closeProfileMenu(); });

            if(profileView) profileView.addEventListener('click', ()=>{ closeProfileMenu(); window.location.href = 'settings.html'; });
            if(profileSettings) profileSettings.addEventListener('click', ()=>{ closeProfileMenu(); if(settingsModal) settingsModal.setAttribute('aria-hidden','false'); else window.location.href='settings.html'; });
            if(profileLogout) profileLogout.addEventListener('click', ()=>{ closeProfileMenu(); if(confirm('Logout from SWOT?')){ // simple local demo logout
                localStorage.clear(); window.location.href = 'index.html'; } });

            // --- Pomodoro: start/pause/reset and session tracking ---
            if (startBtn) startBtn.addEventListener('click', () => {
                if (isRunning) {
                    clearInterval(timerInterval);
                    startBtn.textContent = 'Start';
                    statusText.textContent = 'Timer Paused';
                    isRunning = false;
                } else {
                    startBtn.textContent = 'Pause';
                    statusText.textContent = 'Stay Focused!';
                    isRunning = true;
                    timerInterval = setInterval(() => {
                        if (timeLeft > 0) { timeLeft--; updateTimerDisplay(); }
                        else {
                            clearInterval(timerInterval);
                            document.getElementById('timer-sound')?.play();
                            statusText.textContent = "Time's Up!";
                            isRunning = false;
                            // increment sessions
                            const prev = parseInt(localStorage.getItem(LS_SESSIONS) || '0',10);
                            localStorage.setItem(LS_SESSIONS, String(prev + 1));
                            updateStats();
                        }
                    }, 1000);
                }
            });

            if (resetBtn) resetBtn.addEventListener('click', () => {
                clearInterval(timerInterval);
                timeLeft = 25 * 60; isRunning = false; if (startBtn) startBtn.textContent = 'Start';
                if (statusText) statusText.textContent = 'Ready to grind?'; updateTimerDisplay(); setProgress(0);
            });

            // --- Quote loader exposed globally ---
            window.fetchNewQuote = async () => {
                const textEl = document.getElementById('quote-text');
                const authorEl = document.getElementById('quote-author');
                if (textEl) textEl.style.opacity = 0;
                try {
                    const res = await fetch('https://api.quotable.io/random?tags=technology,success');
                    const data = await res.json();
                    setTimeout(() => { if (textEl) textEl.textContent = `"${data.content}"`; if (authorEl) authorEl.textContent = `- ${data.author}`; if (textEl) textEl.style.opacity = 1; }, 300);
                } catch (e) {
                    if (textEl) textEl.textContent = '"The only way to do great work is to love what you do."'; if (authorEl) authorEl.textContent = '- Steve Jobs'; if (textEl) textEl.style.opacity = 1;
                }
            };

            // --- Init ---
            loadGoals();
            renderGoals();
            updateTimerDisplay();
            updateStats();
            updateAnalyticsMetrics();

            // --- Growth boxes: habits, learning, mood, reflection ---
            const LS_HABIT = 'swot_habit_v1';
            const LS_LEARN = 'swot_learn_v1';
            const LS_MOOD = 'swot_mood_v1';
            const LS_REFLECT = 'swot_reflect_v1';

            // Habit streak
            function loadHabit(){ const raw = localStorage.getItem(LS_HABIT); return raw? JSON.parse(raw): {streak:0,last:0}; }
            function saveHabit(h){ localStorage.setItem(LS_HABIT, JSON.stringify(h)); }
            function renderHabit(){ const h=loadHabit(); const el=document.getElementById('streak-count'); if(el) el.textContent = h.streak; const doneBtn=document.getElementById('complete-habit'); if(doneBtn){ doneBtn.disabled = false; } }
            document.getElementById('complete-habit')?.addEventListener('click', ()=>{
                const h = loadHabit(); const today = new Date().toDateString();
                if(new Date(h.last).toDateString() === today){ alert('Already marked done today'); return; }
                // if last was yesterday, increase streak, else reset
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
                if(new Date(h.last).toDateString() === yesterday.toDateString()){ h.streak = (h.streak||0) + 1; } else { h.streak = 1; }
                h.last = new Date().toString(); saveHabit(h); renderHabit(); alert('Nice — streak recorded'); updateStats(); updateAnalyticsMetrics();
            });
            document.getElementById('reset-streak')?.addEventListener('click', ()=>{ if(confirm('Reset streak?')){ saveHabit({streak:0,last:0}); renderHabit(); } });

            // Learning minutes
            function loadLearn(){ const raw=localStorage.getItem(LS_LEARN); return raw? JSON.parse(raw): {minutes:0}; }
            function saveLearn(s){ localStorage.setItem(LS_LEARN, JSON.stringify(s)); }
            function renderLearn(){ const s=loadLearn(); const el=document.getElementById('learn-min'); if(el) el.textContent = s.minutes; }
            ['add-5','add-15','add-30'].forEach(id=>{ document.getElementById(id)?.addEventListener('click', ()=>{
                const s=loadLearn(); const amt = id==='add-5'?5:(id==='add-15'?15:30); s.minutes = (s.minutes||0) + amt; saveLearn(s); renderLearn(); alert(`+${amt} minutes added`); updateAnalyticsMetrics(); }); });

            // Mood snapshot
            function loadMood(){ const raw=localStorage.getItem(LS_MOOD); return raw? JSON.parse(raw): []; }
            function saveMood(arr){ localStorage.setItem(LS_MOOD, JSON.stringify(arr)); }
            document.querySelectorAll('.mood-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{
                const mood = btn.dataset.mood; const arr = loadMood(); arr.push({mood,at:Date.now()}); saveMood(arr); const last = document.getElementById('mood-last'); if(last) last.textContent = `Last: ${mood} • ${new Date().toLocaleTimeString()}`; alert('Mood saved'); updateAnalyticsMetrics(); }); });
            (function(){ const arr = loadMood(); if(arr.length){ const last = arr[arr.length-1]; const el = document.getElementById('mood-last'); if(el) el.textContent = `Last: ${last.mood} • ${new Date(last.at).toLocaleTimeString()}`; } })();

            // Quick reflection save
            document.getElementById('save-reflect')?.addEventListener('click', ()=>{
                const txt = document.getElementById('quick-reflect')?.value || ''; if(!txt.trim()){ alert('Add a short reflection'); return; }
                const arr = JSON.parse(localStorage.getItem(LS_REFLECT) || '[]'); arr.push({text:txt,at:Date.now()}); localStorage.setItem(LS_REFLECT, JSON.stringify(arr)); if(document.getElementById('quick-reflect')) document.getElementById('quick-reflect').value=''; alert('Reflection saved');
            });

            // initial renders
            renderHabit(); renderLearn();

            // --- Journal: save & render ---
            function loadJournal(){
                const raw = localStorage.getItem(LS_JOURNAL);
                try { return raw ? JSON.parse(raw) : []; } catch { return []; }
            }
            function saveJournal(entries){ localStorage.setItem(LS_JOURNAL, JSON.stringify(entries)); }
            function renderJournal(){
                const list = document.getElementById('journal-list');
                if(!list) return;
                const entries = loadJournal();
                list.innerHTML = '';
                entries.slice().reverse().forEach(e=>{
                    const div = document.createElement('div');
                    div.className = 'journal-entry';
                    div.innerHTML = `<h4>${escapeHtml(e.title || 'Untitled')}</h4><small style="color:var(--muted)">${new Date(e.created).toLocaleString()} • ${escapeHtml(e.mood)}</small><p>${escapeHtml(e.body)}</p>`;
                    list.appendChild(div);
                });
            }
            // hook save entry button
            document.querySelectorAll('.save-entry').forEach(btn=>{
                btn.addEventListener('click', ()=>{
                    const title = document.getElementById('journal-title')?.value || '';
                    const body = document.getElementById('journal-body')?.value || '';
                    const mood = document.getElementById('journal-mood')?.value || 'neutral';
                    if(!body.trim() && !title.trim()) return alert('Please add a title or some notes');
                    const entries = loadJournal();
                    entries.push({id:'j-'+Date.now(),title:title,body:body,mood:mood,created:Date.now()});
                    saveJournal(entries);
                    renderJournal();
                    // clear inputs
                    if(document.getElementById('journal-title')) document.getElementById('journal-title').value='';
                    if(document.getElementById('journal-body')) document.getElementById('journal-body').value='';
                    alert('Journal saved locally');
                });
            });
            renderJournal();

            // --- SWOT Matrix: interactive board ---
            const LS_MATRIX = 'swot_matrix_v1';
            function defaultMatrix(){ return { strengths:[], weaknesses:[], opportunities:[], threats:[] }; }
            function loadMatrix(){ try{ const raw = localStorage.getItem(LS_MATRIX); return raw? JSON.parse(raw): defaultMatrix(); }catch(e){ return defaultMatrix(); } }
            function saveMatrix(m){ localStorage.setItem(LS_MATRIX, JSON.stringify(m)); }

            function renderMatrix(){ const m = loadMatrix(); ['strengths','weaknesses','opportunities','threats'].forEach(col=>{
                const list = document.getElementById('list-'+col);
                const count = document.getElementById('count-'+col);
                if(!list) return;
                list.innerHTML = '';
                m[col].forEach(item => {
                    const li = document.createElement('li'); li.className='swot-item'; li.dataset.id = item.id; li.dataset.col = col;
                    if(item.highlight) li.classList.add('highlight');
                    li.innerHTML = `
                        <div class="text">${escapeHtml(item.text)}</div>
                        <div class="swot-actions">
                            <button class="icon-btn star" title="Priority">${item.priority?'<i class="fa-solid fa-star" style="color:#FFD166"></i>':'<i class="fa-regular fa-star"></i>'}</button>
                            <button class="icon-btn move-left" title="Move left"><i class="fa-solid fa-arrow-left"></i></button>
                            <button class="icon-btn move-right" title="Move right"><i class="fa-solid fa-arrow-right"></i></button>
                            <button class="icon-btn highlight-btn" title="Highlight">${item.highlight?'<i class="fa-solid fa-highlighter" style="color:#A78BFA"></i>':'<i class="fa-regular fa-highlighter"></i>'}</button>
                            <button class="icon-btn delete-swot" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>`;
                    list.appendChild(li);
                });
                if(count) count.textContent = m[col].length;
            });
                // update metrics
                const total = Object.values(loadMatrix()).reduce((acc,arr)=>acc+arr.length,0);
                const highlights = Object.values(loadMatrix()).reduce((acc,arr)=>acc+arr.filter(i=>i.highlight).length,0);
                const priorities = Object.values(loadMatrix()).reduce((acc,arr)=>acc+arr.filter(i=>i.priority).length,0);
                document.getElementById('swot-total') && (document.getElementById('swot-total').textContent = total);
                document.getElementById('swot-highlight') && (document.getElementById('swot-highlight').textContent = highlights);
                document.getElementById('swot-priority') && (document.getElementById('swot-priority').textContent = priorities);
            }

            function addSwotItem(col, text){ if(!text || !text.trim()) return; const m = loadMatrix(); const item={id:'s-'+Date.now(),text:text.trim(),priority:false,highlight:false}; m[col].unshift(item); saveMatrix(m); renderMatrix(); }

            // wire add buttons and enter key
            document.querySelectorAll('.swot-add-btn').forEach(btn=> btn.addEventListener('click', (e)=>{ const col = btn.dataset.col; const input = document.querySelector('.swot-add[data-col="'+col+'"]'); if(input) { addSwotItem(col, input.value); input.value=''; } }));
            document.querySelectorAll('.swot-add').forEach(inp=> inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ addSwotItem(inp.dataset.col, inp.value); inp.value=''; } }));

            // delegated actions inside lists
            document.addEventListener('click', (e)=>{
                const btn = e.target.closest('button'); if(!btn) return;
                const li = e.target.closest('.swot-item'); if(!li) return;
                const id = li.dataset.id; const col = li.dataset.col; const m = loadMatrix(); const arr = m[col]; const idx = arr.findIndex(x=>x.id===id);
                if(idx<0) return;
                if(btn.classList.contains('delete-swot')){ if(confirm('Delete item?')){ arr.splice(idx,1); saveMatrix(m); renderMatrix(); } }
                else if(btn.classList.contains('star')){ arr[idx].priority = !arr[idx].priority; saveMatrix(m); renderMatrix(); }
                else if(btn.classList.contains('highlight-btn')){ arr[idx].highlight = !arr[idx].highlight; saveMatrix(m); renderMatrix(); }
                else if(btn.classList.contains('move-left')||btn.classList.contains('move-right')){
                    const cols = ['strengths','weaknesses','opportunities','threats']; const pos = cols.indexOf(col);
                    const target = btn.classList.contains('move-left')? cols[Math.max(0,pos-1)]: cols[Math.min(cols.length-1,pos+1)];
                    if(target===col) return; const item = arr.splice(idx,1)[0]; m[target].unshift(item); saveMatrix(m); renderMatrix(); }
            });

            // export / import / clear
            document.getElementById('swot-export')?.addEventListener('click', ()=>{
                const data = JSON.stringify(loadMatrix(),null,2); const blob = new Blob([data],{type:'application/json'}); const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'swot-matrix.json'; a.click(); URL.revokeObjectURL(url);
            });
            document.getElementById('swot-import')?.addEventListener('click', ()=>{
                const raw = prompt('Paste your SWOT JSON'); if(!raw) return; try{ const parsed = JSON.parse(raw); saveMatrix(parsed); renderMatrix(); alert('Imported'); }catch(e){ alert('Invalid JSON'); }
            });
            document.getElementById('swot-clear')?.addEventListener('click', ()=>{ if(confirm('Clear all SWOT items?')){ saveMatrix(defaultMatrix()); renderMatrix(); } });

            // initial render for matrix
            renderMatrix();

            // --- Settings persistence ---
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const profileTheme = document.getElementById('profile-theme');
            const saveProfile = document.getElementById('save-profile');
            function loadProfile(){
                const raw = localStorage.getItem(LS_PROFILE); if(!raw) return null; try{return JSON.parse(raw)}catch{return null}
            }
            function saveProfileData(p){ localStorage.setItem(LS_PROFILE, JSON.stringify(p)); }
            const existingProfile = loadProfile();
            if(existingProfile){ if(profileName) profileName.value = existingProfile.name || profileName.value; if(profileEmail) profileEmail.value = existingProfile.email || profileEmail.value; if(profileTheme) profileTheme.value = existingProfile.theme || profileTheme.value; }
            if(saveProfile){ saveProfile.addEventListener('click', ()=>{
                const p = { name: profileName?.value || '', email: profileEmail?.value || '', theme: profileTheme?.value || 'dark' };
                saveProfileData(p);
                alert('Settings saved locally');
            }); }
            // reveal app-wrapper after initial JS work to reduce visible page flash
            try{ setTimeout(()=>{ document.querySelector('.app-wrapper')?.classList.add('ready'); }, 40); }catch(e){}
        });