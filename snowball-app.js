// 雪球投资24课 · 核心逻辑

const App = (() => {
  // ====== STATE ======
  let state = {
    currentChapter: null,
    progress: {},   // { id: { completed, score, attempts } }
    xp: 0,
    quizState: null // active quiz state
  };

  const PASS_SCORE = 2; // 3题答对2题通关
  const XP_PER_CHAPTER = 100;
  const STORAGE_KEY = 'snowball_progress_v1';
  const TOTAL_CHAPTERS = CHAPTERS.length; // 关卡总数（动态）

  // ====== INIT ======
  function init() {
    loadProgress();
    renderSidebar();
    updateHeader();
    showWelcome();
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        state.progress = data.progress || {};
        state.xp = data.xp || 0;
      }
    } catch(e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        progress: state.progress,
        xp: state.xp
      }));
    } catch(e) {}
  }

  // ====== SIDEBAR ======
  function renderSidebar() {
    const container = document.getElementById('sidebar-sections');
    container.innerHTML = SECTIONS.map(sec => `
      <div class="sidebar-section ${sec.cls}">
        <div class="sidebar-section-header">
          <div class="sidebar-section-dot"></div>
          ${sec.name} · ${sec.subtitle}
        </div>
        ${sec.chapters.map(cid => renderSidebarChapter(cid)).join('')}
      </div>
    `).join('');
  }

  function renderSidebarChapter(id) {
    const ch = CHAPTERS.find(c => c.id === id);
    const prog = state.progress[id];
    const completed = prog && prog.completed;
    const unlocked = isUnlocked(id);
    const active = state.currentChapter === id;

    let cls = '';
    if (completed) cls = 'completed';
    else if (active) cls = 'active';
    else if (!unlocked) cls = 'locked';

    const statusIcon = completed ? '✅' : (!unlocked ? '🔒' : '');

    return `
      <div class="chapter-item ${cls}" onclick="App.navigate(${id})" id="sidebar-ch-${id}">
        <div class="chapter-num">${id}</div>
        <div class="chapter-title-sidebar">${ch.title}</div>
        ${statusIcon ? `<span class="chapter-status-icon">${statusIcon}</span>` : ''}
      </div>
    `;
  }

  function isUnlocked(id) {
    if (id === 1) return true;
    const prev = state.progress[id - 1];
    return prev && prev.completed;
  }

  // ====== HEADER ======
  function updateHeader() {
    const completed = Object.values(state.progress).filter(p => p.completed).length;
    const fill = document.getElementById('total-progress-fill');
    const text = document.getElementById('total-progress-text');
    const xpEl = document.getElementById('xp-display');
    if (fill) fill.style.width = `${(completed / TOTAL_CHAPTERS) * 100}%`;
    if (text) text.textContent = `${completed}/${TOTAL_CHAPTERS}`;
    if (xpEl) xpEl.textContent = state.xp;
  }

  // ====== NAVIGATION ======
  function navigate(id) {
    if (!isUnlocked(id)) {
      // Shake the lock icon
      const el = document.getElementById(`sidebar-ch-${id}`);
      if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); }
      return;
    }
    state.currentChapter = id;
    state.quizState = null;
    renderSidebar();
    renderChapter(id);
    renderOutline(id);
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('chapter-board').classList.remove('hidden');
    document.getElementById('content').scrollTo(0, 0);
    closeSidebar(); // 手机端：跳转后自动收起抽屉
  }

  // ====== 手机端侧边栏抽屉 ======
  function toggleSidebar() {
    const open = document.body.classList.toggle('sidebar-open');
    document.getElementById('overlay').classList.toggle('hidden', !open);
  }
  function closeSidebar() {
    if (!document.body.classList.contains('sidebar-open')) return;
    document.body.classList.remove('sidebar-open');
    // 仅当解锁弹窗未打开时才隐藏遮罩
    if (document.getElementById('unlock-modal').classList.contains('hidden')) {
      document.getElementById('overlay').classList.add('hidden');
    }
  }

  function showWelcome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('chapter-board').classList.add('hidden');
    state.currentChapter = null;
    renderSidebar();
  }

  // ====== OUTLINE ======
  const OUTLINE_SECTIONS = [
    { label: '核心比喻',  anchor: 'ch-anchor-header'   },
    { label: '核心知识点', anchor: 'ch-anchor-keypoints' },
    { label: '互动图解',  anchor: 'ch-anchor-visual'   },
    { label: '费曼时刻',  anchor: 'ch-anchor-feynman'  },
    { label: '闯关测验',  anchor: 'ch-anchor-quiz'     },
  ];

  function renderOutline(id) {
    const list = document.getElementById('outline-list');
    list.innerHTML = OUTLINE_SECTIONS.map(s => `
      <div class="outline-item" onclick="scrollToSection('${s.anchor}')">
        <div class="outline-dot"></div>
        <div class="outline-text">${s.label}</div>
      </div>
    `).join('');
  }

  // ====== CHAPTER RENDER ======
  function renderChapter(id) {
    const ch = CHAPTERS.find(c => c.id === id);
    const sec = getSection(id);
    const prog = state.progress[id] || {};
    const isCompleted = prog.completed;

    const board = document.getElementById('chapter-board');
    board.innerHTML = `
      ${renderChapterHeader(ch, sec)}
      ${renderKeyPoints(ch, sec)}
      ${renderVisualCard(ch, sec)}
      ${renderFeynman(ch)}
      ${renderQuizCard(ch, isCompleted)}
      ${renderCompleteBanner(id, isCompleted)}
      ${renderChapterNav(id)}
    `;

    // Animate bars/visuals after DOM is ready
    setTimeout(() => initVisuals(ch), 50);
  }

  function renderChapterHeader(ch, sec) {
    return `
      <div class="ch-header ${sec.cls} fade-in" id="ch-anchor-header">
        <div class="ch-section-tag">${sec.icon} ${sec.name} · 第${ch.id}章</div>
        <div class="ch-num-title">
          <span class="ch-num">LEVEL ${ch.id}</span>
          <h2 class="ch-title">${ch.title}</h2>
        </div>
        <span class="ch-icon">${ch.icon}</span>
        <div class="ch-metaphor-box">
          <span class="metaphor-bulb">💡</span>
          <div class="metaphor-text">
            <strong>核心比喻：${ch.metaphor}</strong><br>
            ${ch.metaphorDetail}
          </div>
        </div>
      </div>
    `;
  }

  function renderKeyPoints(ch, sec) {
    return `
      <div class="ch-section-card fade-in" id="ch-anchor-keypoints">
        <div class="section-card-title">核心知识点</div>
        ${ch.keypoints.map((kp, i) => renderKeyPoint(kp, i, ch.id, sec.cls)).join('')}
      </div>
    `;
  }

  function renderKeyPoint(kp, idx, chId, secCls) {
    const detailHtml = kp.detail
      ? `<div class="kp-detail-body">${kp.detail.map(p => `<p class="kp-detail-para">${p}</p>`).join('')}</div>`
      : '';
    if (kp.predict) {
      return `<div class="kp-section">${detailHtml}${renderPredictCard(kp, idx, chId, secCls)}</div>`;
    }
    return `
      <div class="kp-section">
        <div class="kp-section-head ${secCls}">
          <span class="kp-head-icon">${kp.icon}</span>
          <span class="kp-head-label">${kp.label}</span>
        </div>
        ${detailHtml}
        <div class="kp-text-summary">${kp.text}</div>
      </div>
    `;
  }

  function renderPredictCard(kp, idx, chId, secCls) {
    const p = kp.predict;
    const cardId = `predict-${chId}-${idx}`;
    return `
      <div class="predict-card ${secCls}" id="${cardId}">
        <div class="predict-header">
          <span class="predict-icon">${kp.icon}</span>
          <span class="predict-label">${kp.label}</span>
          <span class="predict-badge">猜一猜</span>
        </div>
        <div class="predict-question">${p.q}</div>
        <div class="predict-opts" id="${cardId}-opts">
          ${p.opts.map((opt, j) => `
            <div class="predict-opt" onclick="App.answerPredict('${cardId}', ${j}, ${p.ans}, ${chId}, ${idx})">
              <span class="predict-opt-letter">${'ABCD'[j]}</span>
              <span class="predict-opt-text">${opt}</span>
            </div>
          `).join('')}
        </div>
        <div class="predict-reveal hidden" id="${cardId}-reveal">
          <div class="predict-fact">
            <span class="predict-fact-icon">💡</span>
            <strong>${kp.text}</strong>
          </div>
          <div class="predict-insight">${p.reveal}</div>
        </div>
      </div>
    `;
  }

  function renderVisualCard(ch, sec) {
    return `
      <div class="ch-visual-card fade-in" id="ch-anchor-visual">
        <div class="section-card-title">互动图解</div>
        <div class="visual-inner" id="visual-container">
          ${buildVisualHTML(ch)}
        </div>
      </div>
    `;
  }

  function renderFeynman(ch) {
    return `
      <div class="ch-feynman-card fade-in" id="ch-anchor-feynman">
        <div class="section-card-title">费曼时刻 · 用自己的话说</div>
        <div class="feynman-prompt">
          <span class="feynman-icon">🤔</span>
          <div class="feynman-q">${ch.feynman}</div>
        </div>
        <div class="feynman-hint" onclick="toggleFeynmanHint(this)">
          <span>💬</span> 点击查看提示
        </div>
        <div class="feynman-hint-text" style="display:none;margin-top:8px;font-size:13px;color:#64748B;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
          ${ch.feynmanHint}
        </div>
      </div>
    `;
  }

  function renderQuizCard(ch, isCompleted) {
    if (isCompleted) {
      return `
        <div class="ch-quiz-card fade-in">
          <div class="section-card-title">闯关测验 · 已通关 ✅</div>
          <div style="text-align:center;padding:20px;color:#10B981;font-weight:700;font-size:16px;">
            🎉 本章已通关！经验值 +${XP_PER_CHAPTER}
          </div>
          <div style="display:flex;justify-content:center;">
            <button class="btn-secondary" onclick="App.retakeQuiz(${ch.id})">重新作答</button>
          </div>
        </div>
      `;
    }
    const passNeeded = Math.max(2, Math.ceil(ch.quiz.length * 2 / 3));
    return `
      <div class="ch-quiz-card fade-in" id="quiz-card" data-anchor="ch-anchor-quiz">
        <div id="ch-anchor-quiz" style="scroll-margin-top:12px"></div>
        <div class="section-card-title">闯关测验 · 答对${passNeeded}/${ch.quiz.length}题解锁下一关</div>
        <div id="quiz-body">
          ${renderQuizQuestion(ch, 0)}
        </div>
      </div>
    `;
  }

  function renderQuizQuestion(ch, qi) {
    const q = ch.quiz[qi];
    const totalQ = ch.quiz.length;
    const prog = state.progress[ch.id] || {};
    const answers = (state.quizState && state.quizState.answers) || {};
    const score = (state.quizState && state.quizState.score) || 0;

    const dotHtml = ch.quiz.map((_, i) => {
      let cls = '';
      if (state.quizState && state.quizState.answers[i] !== undefined) {
        cls = state.quizState.answers[i] === ch.quiz[i].ans ? 'correct' : 'wrong';
      } else if (i === qi) cls = 'active';
      return `<div class="quiz-dot ${cls}"></div>`;
    }).join('');

    return `
      <div class="quiz-progress">
        <div class="quiz-dots">${dotHtml}</div>
        <span class="quiz-score">第${qi+1}题 / 共${totalQ}题</span>
      </div>
      <div class="quiz-question">
        <span class="q-num">问题 ${qi + 1}</span>
        ${q.q}
      </div>
      <div class="quiz-options" id="quiz-options">
        ${q.opts.map((opt, i) => `
          <div class="quiz-option" onclick="App.selectAnswer(${ch.id}, ${qi}, ${i})" id="opt-${i}">
            <div class="option-letter">${'ABCD'[i]}</div>
            <div class="option-text">${opt}</div>
            <span class="option-mark"></span>
          </div>
        `).join('')}
      </div>
      <div class="quiz-explanation" id="quiz-explanation">
        <strong>解析：</strong>${q.exp}
      </div>
      <div class="quiz-actions" id="quiz-actions" style="display:none">
        <div class="quiz-result-msg" id="quiz-result-msg"></div>
        <button class="btn-primary" id="quiz-next-btn" onclick="App.nextQuestion(${ch.id}, ${qi})">
          ${qi < totalQ - 1 ? '下一题 →' : '查看结果'}
        </button>
      </div>
    `;
  }

  function renderCompleteBanner(id, isCompleted) {
    const nextId = id + 1;
    const hasNext = nextId <= TOTAL_CHAPTERS;
    return `
      <div class="ch-complete-banner ${isCompleted ? 'show' : ''}" id="complete-banner">
        <div class="complete-emoji">🏆</div>
        <div class="complete-title">第${id}关 通关！</div>
        <div class="complete-xp">⭐ 获得经验值 +${XP_PER_CHAPTER}</div>
        <div class="complete-actions">
          ${hasNext ? `<button class="btn-green" onclick="App.navigate(${nextId})">继续第${nextId}关 →</button>` : ''}
          <button class="btn-secondary" onclick="App.retakeQuiz(${id})">再做一遍</button>
        </div>
      </div>
    `;
  }

  function renderChapterNav(id) {
    const prev = id > 1 ? id - 1 : null;
    const next = id < TOTAL_CHAPTERS ? id + 1 : null;
    const nextUnlocked = next && isUnlocked(next);
    return `
      <div class="ch-nav-bar fade-in">
        <div>
          ${prev ? `<button class="btn-secondary" onclick="App.navigate(${prev})">← 第${prev}章</button>` : ''}
        </div>
        <span class="ch-nav-info">${id} / ${TOTAL_CHAPTERS}</span>
        <div>
          ${next ? `<button class="btn-${nextUnlocked ? 'primary' : 'secondary'}" onclick="App.navigate(${next})" ${!nextUnlocked ? 'title="通关本章才能解锁"' : ''}>
            第${next}章 ${nextUnlocked ? '→' : '🔒'}
          </button>` : '<span style="color:#94A3B8;font-size:13px;">已是最后一章</span>'}
        </div>
      </div>
    `;
  }

  // ====== QUIZ LOGIC ======
  function selectAnswer(chId, qi, selectedIdx) {
    const ch = CHAPTERS.find(c => c.id === chId);
    const q = ch.quiz[qi];
    const opts = document.querySelectorAll('.quiz-option');

    // Prevent re-answering
    if (opts[0] && opts[0].classList.contains('disabled')) return;

    if (!state.quizState) {
      state.quizState = { chId, answers: {}, score: 0 };
    }

    const isCorrect = selectedIdx === q.ans;
    state.quizState.answers[qi] = selectedIdx;
    if (isCorrect) state.quizState.score = (state.quizState.score || 0) + 1;

    // Style options
    opts.forEach((el, i) => {
      el.classList.add('disabled');
      if (i === selectedIdx) {
        el.classList.add(isCorrect ? 'correct' : 'wrong');
        el.querySelector('.option-mark').textContent = isCorrect ? '✅' : '❌';
      }
      if (!isCorrect && i === q.ans) {
        el.classList.add('reveal-correct');
        el.querySelector('.option-mark').textContent = '✅';
      }
    });

    // Show explanation
    const expEl = document.getElementById('quiz-explanation');
    if (expEl) expEl.classList.add('show');

    // Show next button
    const actEl = document.getElementById('quiz-actions');
    if (actEl) actEl.style.display = 'flex';

    const msgEl = document.getElementById('quiz-result-msg');
    if (msgEl) {
      msgEl.textContent = isCorrect ? '✅ 回答正确！' : '❌ 答错了，看看解析吧';
      msgEl.className = 'quiz-result-msg ' + (isCorrect ? 'pass' : 'fail');
    }

    // Update dots
    updateQuizDots(ch, qi);
  }

  function updateQuizDots(ch, currentQi) {
    const dots = document.querySelectorAll('.quiz-dot');
    ch.quiz.forEach((q, i) => {
      if (!dots[i]) return;
      dots[i].className = 'quiz-dot';
      if (state.quizState && state.quizState.answers[i] !== undefined) {
        dots[i].classList.add(state.quizState.answers[i] === q.ans ? 'correct' : 'wrong');
      } else if (i === currentQi) {
        dots[i].classList.add('active');
      }
    });
  }

  function nextQuestion(chId, currentQi) {
    const ch = CHAPTERS.find(c => c.id === chId);
    const nextQi = currentQi + 1;

    if (nextQi < ch.quiz.length) {
      // Render next question
      document.getElementById('quiz-body').innerHTML = renderQuizQuestion(ch, nextQi);
      // If already answered this question (retake), auto-show state
    } else {
      // All questions done - show results
      showQuizResult(chId);
    }
  }

  function showQuizResult(chId) {
    const ch = CHAPTERS.find(c => c.id === chId);
    const score = state.quizState ? state.quizState.score : 0;
    const passNeeded = Math.max(2, Math.ceil(ch.quiz.length * 2 / 3));
    const pass = score >= passNeeded;

    if (pass) {
      // Mark completed
      if (!state.progress[chId]) state.progress[chId] = {};
      state.progress[chId].completed = true;
      state.progress[chId].score = score;
      state.xp += XP_PER_CHAPTER;
      saveProgress();
      updateHeader();
      renderSidebar();

      // Show complete banner
      const banner = document.getElementById('complete-banner');
      if (banner) {
        banner.classList.add('show');
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Replace quiz card header
      const quizCard = document.getElementById('quiz-card');
      if (quizCard) {
        quizCard.querySelector('.section-card-title').textContent = `闯关测验 · ${score}/${ch.quiz.length} 通关！✅`;
      }

      // Show unlock modal after a delay
      setTimeout(() => showUnlockModal(chId), 800);
    } else {
      // Failed - show retry
      const body = document.getElementById('quiz-body');
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:24px;">
            <div style="font-size:48px;margin-bottom:12px;">😅</div>
            <div style="font-size:18px;font-weight:700;color:#EF4444;margin-bottom:8px;">答对 ${score}/${ch.quiz.length} 题，未达到通关标准</div>
            <div style="font-size:14px;color:#64748B;margin-bottom:20px;">需要答对至少 ${passNeeded} 题才能解锁下一章。复习一下再试试！</div>
            <button class="btn-primary" onclick="App.retakeQuiz(${chId})">🔄 重新作答</button>
          </div>
        `;
      }
    }
  }

  function retakeQuiz(chId) {
    state.quizState = null;
    const ch = CHAPTERS.find(c => c.id === chId);
    const isCompleted = state.progress[chId] && state.progress[chId].completed;

    const quizCard = document.getElementById('quiz-card');
    if (quizCard) {
      quizCard.outerHTML = renderQuizCard(ch, false);
    } else {
      // Re-render whole chapter
      navigate(chId);
    }
  }

  function showUnlockModal(chId) {
    const nextId = chId + 1;
    if (nextId > TOTAL_CHAPTERS) return;
    const next = CHAPTERS.find(c => c.id === nextId);

    document.getElementById('unlock-anim-content').textContent = next.icon;
    document.getElementById('unlock-title').textContent = `第${nextId}关已解锁！`;
    document.getElementById('unlock-desc').textContent = next.title;
    document.getElementById('unlock-next-btn').onclick = () => { closeModal(); navigate(nextId); };

    document.getElementById('unlock-modal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('unlock-modal').classList.add('hidden');
    document.body.classList.remove('sidebar-open');
    document.getElementById('overlay').classList.add('hidden');
  }

  // ====== VISUAL BUILDERS ======
  function buildVisualHTML(ch) {
    const t = ch.visual.type;
    switch(t) {
      case 'bull-bear-timeline': return buildBullBear();
      case 'timeline-odds':      return buildBullBear() + buildOddsGame();
      case 'quadrant':           return buildQuadrant();
      case 'quadrant-ev':        return buildQuadrant() + buildEVGame();
      case 'indicators':         return buildIndicatorGame();
      case 'style-bars':         return buildStyleBars();
      case 'policy-events':      return buildPolicyEvents();
      case 'flow-fed':           return buildFlowFed();
      case 'supply-demand':      return buildSupplyDemand();
      case 'supply-demand-cycle':return buildSupplyDemand() + buildCycleGame();
      case 'bar-liquor':         return buildBarLiquor();
      case 'info-cards-pharma':  return buildPharmacyCards();
      case 'cost-curve':         return buildCostCurve();
      case 'before-after':       return buildBeforeAfter();
      case 'semi-chain':         return buildSemiChain();
      case 'radar':              return buildRadar(ch);
      case 'moat-bars':          return buildMoatBars();
      case 'dividend-calc':      return buildDividendCalc();
      case 'dividend-compound':  return buildDividendCalc() + buildCompoundGame();
      case 'pig-cycle':          return buildPigCycle();
      case 'ma-tree':            return buildMATree();
      case 'growth-vs-pe':       return buildGrowthVsPE();
      case 'style-quiz':         return buildStyleQuiz();
      case 'ipo-sim':            return buildIPOSim();
      case 'etf-basket':         return buildETFBasket();
      case 'convertible-payoff': return buildConvertiblePayoff();
      case 'rate-calendar':      return buildRateCalendar();
      case 'options-payoff':     return buildOptionsPayoff();
      case 'psych-bias':         return buildPsychGame('🧠 识破心理陷阱（上）', '看 3 个真实场景，凭直觉选——然后看看你是不是也掉进了人性的陷阱。');
      case 'psych-bias2':        return buildPsychGame('🧠 识破心理陷阱（下）', '群体狂热里，你能保持清醒吗？来挑战 3 个场景。');
      default: return '<p style="color:#94A3B8;font-size:13px;">互动图解加载中…</p>';
    }
  }

  function initVisuals(ch) {
    const t = ch.visual.type;
    if (t === 'bull-bear-timeline') initBullBearChart();
    if (t === 'timeline-odds') { initBullBearChart(); initOddsGame(); }
    if (t === 'quadrant-ev') initEVGame();
    if (t === 'supply-demand-cycle') initCycleGame();
    if (t === 'indicators') initIndicatorGame();
    if (t === 'moat-bars' || t === 'bar-liquor') animateBars();
    if (t === 'cost-curve') animateCostCurve();
    if (t === 'dividend-calc') updateDividendCalc();
    if (t === 'dividend-compound') { updateDividendCalc(); initCompoundGame(); }
    if (t === 'options-payoff') drawOptionsPayoff();
    if (t === 'convertible-payoff') drawConvertiblePayoff();
    if (t === 'pig-cycle') drawPigCycle();
    if (t === 'psych-bias') initPsychGame(PSYCH_ROUNDS_A);
    if (t === 'psych-bias2') initPsychGame(PSYCH_ROUNDS_B);
  }

  function initBullBearChart() {
    // Wire up band click handlers
    document.querySelectorAll('.bb-band').forEach((el, i) => {
      el.addEventListener('click', () => {
        const cycles = window._bbCycles;
        if (!cycles) return;
        const c = cycles[i];
        const icon = c.type==='bull'?'🔴':c.type==='bear'?'🟢':'⬜';
        const detail = document.getElementById('bb-detail');
        if (detail) detail.innerHTML =
          `<strong>${c.years} ${c.label}${icon} &nbsp;${c.pct}</strong><br>${c.detail}`;
        document.querySelectorAll('.bb-band').forEach((b, j) =>
          b.style.opacity = j===i ? '5' : '0.4'
        );
      });
    });
    // Animate line draw
    const path = document.getElementById('bb-line');
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = 'stroke-dashoffset 2.4s ease-in-out';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      path.style.strokeDashoffset = 0;
    }));
  }

  // ==================== 赔率赌局 (Odds Game) ====================
  const ODDS_ROUNDS = [
    {
      tag: '2008年底 · 沪指1664点', mood: '😱 全民恐慌',
      context: '金融危机后股市腰斩再腰斩，新闻天天唱衰，身边人发誓"这辈子再也不碰股票"。',
      down: 20, up: 200, best: 'heavy',
      outcome: '半年后"4万亿"刺激政策出台，沪指反弹到3478点，涨了一倍多。',
      lesson: '底部区域：往下空间小、往上空间大，<strong>赔率极好</strong>。越是没人敢买，赔率往往越高。'
    },
    {
      tag: '2007年中 · 沪指5000+点', mood: '🤑 全民炒股',
      context: '菜场大妈、出租车司机都在聊股票，开户排长队，人人都喊"还能涨到一万点"。',
      down: 65, up: 15, best: 'empty',
      outcome: '几个月后见顶6124点，随后一年暴跌73%，无数人被深套十几年。',
      lesson: '顶部区域：往下空间大、往上空间小，<strong>赔率极差</strong>。越是人人都看好，赔率往往越低。'
    },
    {
      tag: '2014年中 · 沪指2000点', mood: '😐 没人关心',
      context: '股市低迷好几年，大家都跑去买房了——但央行刚刚悄悄开始降息放水。',
      down: 15, up: 150, best: 'heavy',
      outcome: '随后一年，沪指从2000点一路涨到5178点，翻了一倍半。',
      lesson: '低位 + 放水：又一个高赔率窗口。<strong>赔率</strong>不只看价格高低，还要看水龙头（流动性）是不是在变松。'
    },
  ];
  const ODDS_CHOICES = [
    { key:'heavy', label:'重仓上车', sub:'押 70%', icon:'🚀' },
    { key:'light', label:'小仓试探', sub:'押 30%', icon:'🤏' },
    { key:'empty', label:'空仓观望', sub:'押 0%',  icon:'🛡️' },
  ];

  function buildOddsGame() {
    return `
      <div class="odds-game">
        <div class="odds-game-title">🎲 赔率赌局：你敢在什么时候上车？</div>
        <div class="odds-game-intro">不用猜涨跌，只问一句——这一把<strong>"亏得起、赢得多"</strong>吗？玩 3 局，体验赔率的力量。</div>
        <div id="odds-stage"></div>
      </div>`;
  }

  function initOddsGame() {
    window._oddsGame = { round: 0, score: 0, phase: 'choose', lastPick: null };
    renderOdds();
  }

  function oddsScaleHTML(r) {
    const total = r.down + r.up;
    const downPct = (r.down / total * 100).toFixed(0);
    const upPct = (r.up / total * 100).toFixed(0);
    const ratio = (r.up / r.down).toFixed(1);
    return `
      <div class="odds-scale">
        <div class="odds-scale-row">
          <span class="odds-scale-tag down">最多亏 ${r.down}%</span>
          <div class="odds-bar-track"><div class="odds-bar down" style="width:${downPct}%"></div></div>
        </div>
        <div class="odds-scale-row">
          <span class="odds-scale-tag up">最多赚 ${r.up}%</span>
          <div class="odds-bar-track"><div class="odds-bar up" style="width:${upPct}%"></div></div>
        </div>
        <div class="odds-ratio">赔率 ≈ <span class="num">${ratio} : 1</span>（赢面是输面的 ${ratio} 倍）</div>
      </div>`;
  }

  function renderOdds() {
    const g = window._oddsGame;
    const stage = document.getElementById('odds-stage');
    if (!g || !stage) return;
    const total = ODDS_ROUNDS.length;

    if (g.phase === 'done') {
      const max = total * 2;
      let grade, gradeMsg;
      if (g.score >= max) { grade = '🏆 赔率大师'; gradeMsg = '完美！你已经懂得只在赔率站在自己这边时出手。'; }
      else if (g.score >= total) { grade = '👍 渐入佳境'; gradeMsg = '不错！记住：宁可错过，也别在低赔率时追高。'; }
      else { grade = '🌱 新手上路'; gradeMsg = '没关系——多数人都栽在"人人看好时追高"。再玩一次试试？'; }
      stage.innerHTML = `
        <div class="odds-final">
          <div class="odds-final-score">得分 <span class="num">${g.score}</span> / ${max}</div>
          <div class="odds-final-grade">${grade}</div>
          <div class="odds-final-msg">${gradeMsg}</div>
          <div class="odds-final-key">📌 一句话记住：<strong>不必次次猜对，只赌划算的那几把。</strong></div>
          <button class="btn-primary" onclick="App.oddsReplay()">🔄 再玩一次</button>
        </div>`;
      return;
    }

    const r = ODDS_ROUNDS[g.round];

    if (g.phase === 'choose') {
      stage.innerHTML = `
        <div class="odds-progress">第 ${g.round + 1} / ${total} 局　·　累计 ${g.score} 分</div>
        <div class="odds-card">
          <div class="odds-card-tag">${r.tag}</div>
          <div class="odds-card-mood">${r.mood}</div>
          <div class="odds-card-ctx">${r.context}</div>
          ${oddsScaleHTML(r)}
          <div class="odds-card-ask">看清赔率后，你怎么下注？</div>
          <div class="odds-choices">
            ${ODDS_CHOICES.map(c => `
              <button class="odds-choice ${c.key}" onclick="App.oddsPick('${c.key}')">
                <span class="oc-icon">${c.icon}</span>
                <span class="oc-label">${c.label}</span>
                <span class="oc-sub">${c.sub}</span>
              </button>`).join('')}
          </div>
        </div>`;
      return;
    }

    // phase === 'reveal'
    const pick = g.lastPick;
    const gained = oddsRoundScore(r, pick);
    const correct = gained === 2;
    const pickLabel = ODDS_CHOICES.find(c => c.key === pick).label;
    stage.innerHTML = `
      <div class="odds-progress">第 ${g.round + 1} / ${total} 局　·　累计 ${g.score} 分</div>
      <div class="odds-reveal ${correct ? 'good' : (gained === 1 ? 'ok' : 'bad')}">
        <div class="odds-reveal-head">${correct ? '✅ 漂亮！赔率算对了' : (gained === 1 ? '🟡 还算稳健' : '❌ 这一把不划算')}　<span class="odds-reveal-pick">你选了：${pickLabel}（+${gained}）</span></div>
        <div class="odds-reveal-outcome"><strong>后来发生了：</strong>${r.outcome}</div>
        <div class="odds-reveal-lesson">${r.lesson}</div>
        <button class="btn-primary" onclick="App.oddsNext()">${g.round + 1 < total ? '下一局 →' : '看最终成绩 →'}</button>
      </div>`;
  }

  function oddsRoundScore(r, pick) {
    if (pick === r.best) return 2;
    if (pick === 'light') return 1; // 折中仓位永远算稳健
    return 0;
  }

  function oddsPick(key) {
    const g = window._oddsGame;
    if (!g || g.phase !== 'choose') return;
    g.lastPick = key;
    g.score += oddsRoundScore(ODDS_ROUNDS[g.round], key);
    g.phase = 'reveal';
    renderOdds();
  }

  function oddsNext() {
    const g = window._oddsGame;
    if (!g) return;
    g.round += 1;
    g.phase = g.round >= ODDS_ROUNDS.length ? 'done' : 'choose';
    renderOdds();
  }

  function oddsReplay() {
    initOddsGame();
  }

  // ==================== 期望值擂台 (Expected Value Game) ====================
  const EV_ROUNDS = [
    {
      title: '第一桌 · 三种下注方式，你押哪个最划算？',
      bets: [
        { key:'A', name:'🐢 稳妥型', winRate:80, gain:10, loss:10, desc:'小赚就跑，看起来最稳' },
        { key:'B', name:'🚀 赔率型', winRate:20, gain:100, loss:10, desc:'很少赢，但一赢就翻倍' },
        { key:'C', name:'🥬 韭菜型', winRate:60, gain:5,  loss:20, desc:'常赢小钱，一亏就亏大的' },
      ],
    },
    {
      title: '第二桌 · 换一组数字，再算一次',
      bets: [
        { key:'A', name:'🎯 高胜率', winRate:90, gain:5,  loss:50, desc:'几乎每次都赢一点点' },
        { key:'B', name:'⚖️ 均衡型', winRate:50, gain:30, loss:20, desc:'输赢各半，赚多亏少' },
        { key:'C', name:'🎰 搏一把', winRate:10, gain:80, loss:15, desc:'小概率搏大的' },
      ],
    },
  ];

  function evOf(b) { return +(b.winRate/100 * b.gain - (1 - b.winRate/100) * b.loss).toFixed(1); }
  function evBest(bets) { return bets.reduce((a,b) => evOf(b) > evOf(a) ? b : a).key; }

  function buildEVGame() {
    return `
      <div class="ev-game">
        <div class="ev-game-title">🎲 期望值擂台：胜率高 ≠ 赚钱</div>
        <div class="ev-game-intro">别被"胜率"骗了。把<strong>胜率 × 赔率</strong>乘起来算总账，<strong>期望值为正</strong>才值得下注。</div>
        <div id="ev-stage"></div>
      </div>`;
  }

  function initEVGame() {
    window._evGame = { round: 0, score: 0, phase: 'choose', lastPick: null };
    renderEV();
  }

  function renderEV() {
    const g = window._evGame;
    const stage = document.getElementById('ev-stage');
    if (!g || !stage) return;
    const total = EV_ROUNDS.length;

    if (g.phase === 'done') {
      stage.innerHTML = `
        <div class="ev-final">
          <div class="ev-final-score">答对 <span class="num">${g.score}</span> / ${total} 桌</div>
          <div class="ev-final-grade">${g.score === total ? '🏆 期望值高手' : (g.score >= 1 ? '👍 抓到窍门了' : '🌱 再悟一悟')}</div>
          <div class="ev-final-key">📌 记住：<strong>不看胜率高低，只算"赚的钱×概率"够不够大。</strong>赚小钱亏大钱，赢再多次也是亏。</div>
          <button class="btn-primary" onclick="App.evReplay()">🔄 再来一轮</button>
        </div>`;
      return;
    }

    const r = EV_ROUNDS[g.round];

    if (g.phase === 'choose') {
      stage.innerHTML = `
        <div class="ev-progress">第 ${g.round + 1} / ${total} 桌　·　答对 ${g.score}</div>
        <div class="ev-round-title">${r.title}</div>
        <div class="ev-bets">
          ${r.bets.map(b => `
            <button class="ev-bet" onclick="App.evPick('${b.key}')">
              <div class="ev-bet-name">${b.name}</div>
              <div class="ev-bet-stat">胜率 <strong>${b.winRate}%</strong></div>
              <div class="ev-bet-stat win">赢了赚 +${b.gain}%</div>
              <div class="ev-bet-stat lose">输了亏 −${b.loss}%</div>
              <div class="ev-bet-desc">${b.desc}</div>
            </button>`).join('')}
        </div>`;
      return;
    }

    // reveal: show computed EV for all bets
    const best = evBest(r.bets);
    const maxAbs = Math.max(...r.bets.map(b => Math.abs(evOf(b)))) || 1;
    const correct = g.lastPick === best;
    stage.innerHTML = `
      <div class="ev-progress">第 ${g.round + 1} / ${total} 桌　·　答对 ${g.score}</div>
      <div class="ev-round-title">${r.title}</div>
      <div class="ev-results">
        ${r.bets.map(b => {
          const ev = evOf(b);
          const pos = ev >= 0;
          const w = (Math.abs(ev) / maxAbs * 100).toFixed(0);
          const isBest = b.key === best;
          const isPick = b.key === g.lastPick;
          return `
            <div class="ev-result ${isBest ? 'best' : ''} ${isPick ? 'picked' : ''}">
              <div class="ev-result-head">
                <span class="ev-result-name">${b.name}${isBest ? ' 👑' : ''}${isPick ? ' ←你选的' : ''}</span>
                <span class="ev-result-formula">${b.winRate}%×(+${b.gain}) − ${100-b.winRate}%×(−${b.loss})</span>
              </div>
              <div class="ev-bar-row">
                <div class="ev-bar-track ${pos ? 'pos' : 'neg'}"><div class="ev-bar ${pos ? 'pos' : 'neg'}" style="width:${w}%"></div></div>
                <span class="ev-bar-val ${pos ? 'pos' : 'neg'}">期望值 ${pos ? '+' : ''}${ev}%</span>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="ev-verdict ${correct ? 'good' : 'bad'}">
        ${correct
          ? '✅ 答对了！期望值最高的那个，才是长期最赚钱的选择。'
          : '❌ 再看一眼——期望值最高的（👑）才是对的。胜率高的那个，往往栽在"赚小钱、亏大钱"上。'}
      </div>
      <button class="btn-primary" onclick="App.evNext()">${g.round + 1 < total ? '下一桌 →' : '看成绩 →'}</button>`;
  }

  function evPick(key) {
    const g = window._evGame;
    if (!g || g.phase !== 'choose') return;
    g.lastPick = key;
    if (key === evBest(EV_ROUNDS[g.round].bets)) g.score += 1;
    g.phase = 'reveal';
    renderEV();
  }
  function evNext() {
    const g = window._evGame;
    if (!g) return;
    g.round += 1;
    g.phase = g.round >= EV_ROUNDS.length ? 'done' : 'choose';
    renderEV();
  }
  function evReplay() { initEVGame(); }

  // ==================== 周期股估值陷阱 (Cycle PE Trap Game) ====================
  const CYCLE_ROUNDS = [
    {
      tag: '钢铁股 · 行业利润创历史新高', mood: '🤑 PE 仅 5 倍（看起来超便宜）',
      context: '全行业满负荷生产，钢价飞涨，公司赚得盆满钵满，研报都在喊"低估值，买入"。',
      best: 'sell',
      outcome: '一年后新产能投产、需求回落，钢价暴跌，利润腰斩，PE反而"被动"升到20倍，股价跌了60%。',
      lesson: '周期股的<strong>低PE是陷阱</strong>——利润在顶峰时分母最大、PE显得最低，恰恰是最危险的卖点。'
    },
    {
      tag: '钢铁股 · 全行业巨额亏损', mood: '😱 PE 为负 / 高得离谱（没人敢要）',
      context: '钢价跌破成本，工厂大面积停产，报纸都在说"钢铁是夕阳产业，没救了"。',
      best: 'buy',
      outcome: '随后落后产能出清、供给收缩，钢价反弹，利润由亏转盈，股价一年翻倍。',
      lesson: '周期股的<strong>亏损 / 高PE往往是机会</strong>——盈利在谷底时最该埋伏，等周期反转。'
    },
    {
      tag: '茅台 · 盈利每年稳定增长', mood: '😏 PE 20 倍（处于历史低位）',
      context: '注意：这是盈利稳定的消费白马，<strong>不是</strong>周期股，利润不会大起大落。',
      best: 'buy',
      outcome: '稳定成长股的低PE就是真便宜，随后估值修复叠加盈利增长，迎来"戴维斯双击"。',
      lesson: '关键区分：<strong>稳定成长股</strong>低PE = 真便宜；只有<strong>周期股</strong>才要反过来看。别套错公式！'
    },
  ];
  const CYCLE_CHOICES = [
    { key:'buy',   label:'买入',     icon:'🛒' },
    { key:'watch', label:'观望',     icon:'🤔' },
    { key:'sell',  label:'卖出/回避', icon:'🏃' },
  ];

  function buildCycleGame() {
    return `
      <div class="odds-game">
        <div class="odds-game-title">🎢 周期股估值陷阱：便宜 ≠ 该买</div>
        <div class="odds-game-intro">周期股有个反常识的规律：<strong>PE最低时最危险，亏损时反而藏机会</strong>。来辨认 3 个场景。</div>
        <div id="cycle-stage"></div>
      </div>`;
  }

  function initCycleGame() {
    window._cycleGame = { round: 0, score: 0, phase: 'choose', lastPick: null };
    renderCycle();
  }

  function cycleRoundScore(r, pick) {
    if (pick === r.best) return 2;
    if (pick === 'watch') return 1;
    return 0;
  }

  function renderCycle() {
    const g = window._cycleGame;
    const stage = document.getElementById('cycle-stage');
    if (!g || !stage) return;
    const total = CYCLE_ROUNDS.length;

    if (g.phase === 'done') {
      const max = total * 2;
      let grade, msg;
      if (g.score >= max) { grade = '🏆 周期猎手'; msg = '完美！你已经能识破"低PE陷阱"，还分得清周期股和成长股。'; }
      else if (g.score >= total) { grade = '👍 渐入佳境'; msg = '不错！记住口诀：周期股低PE要警惕，亏损时才埋伏。'; }
      else { grade = '🌱 容易踩坑'; msg = '别灰心——"低PE就买"是最常见的周期股陷阱，再玩一次体会一下。'; }
      stage.innerHTML = `
        <div class="odds-final">
          <div class="odds-final-score">得分 <span class="num">${g.score}</span> / ${max}</div>
          <div class="odds-final-grade">${grade}</div>
          <div class="odds-final-msg">${msg}</div>
          <div class="odds-final-key">📌 一句话记住：<strong>周期股反着看PE，但成长股别套这个公式。</strong></div>
          <button class="btn-primary" onclick="App.cycleReplay()">🔄 再玩一次</button>
        </div>`;
      return;
    }

    const r = CYCLE_ROUNDS[g.round];

    if (g.phase === 'choose') {
      stage.innerHTML = `
        <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
        <div class="odds-card">
          <div class="odds-card-tag">${r.tag}</div>
          <div class="odds-card-mood">${r.mood}</div>
          <div class="odds-card-ctx">${r.context}</div>
          <div class="odds-card-ask">这时候你怎么操作？</div>
          <div class="odds-choices">
            ${CYCLE_CHOICES.map(c => `
              <button class="odds-choice" onclick="App.cyclePick('${c.key}')">
                <span class="oc-icon">${c.icon}</span>
                <span class="oc-label">${c.label}</span>
              </button>`).join('')}
          </div>
        </div>`;
      return;
    }

    // reveal
    const pick = g.lastPick;
    const gained = cycleRoundScore(r, pick);
    const correct = gained === 2;
    const pickLabel = CYCLE_CHOICES.find(c => c.key === pick).label;
    stage.innerHTML = `
      <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
      <div class="odds-reveal ${correct ? 'good' : (gained === 1 ? 'ok' : 'bad')}">
        <div class="odds-reveal-head">${correct ? '✅ 火眼金睛！' : (gained === 1 ? '🟡 稳健，但不是最优' : '❌ 掉进陷阱了')}　<span class="odds-reveal-pick">你选了：${pickLabel}（+${gained}）</span></div>
        <div class="odds-reveal-outcome"><strong>后来发生了：</strong>${r.outcome}</div>
        <div class="odds-reveal-lesson">${r.lesson}</div>
        <button class="btn-primary" onclick="App.cycleNext()">${g.round + 1 < total ? '下一题 →' : '看最终成绩 →'}</button>
      </div>`;
  }

  function cyclePick(key) {
    const g = window._cycleGame;
    if (!g || g.phase !== 'choose') return;
    g.lastPick = key;
    g.score += cycleRoundScore(CYCLE_ROUNDS[g.round], key);
    g.phase = 'reveal';
    renderCycle();
  }
  function cycleNext() {
    const g = window._cycleGame;
    if (!g) return;
    g.round += 1;
    g.phase = g.round >= CYCLE_ROUNDS.length ? 'done' : 'choose';
    renderCycle();
  }
  function cycleReplay() { initCycleGame(); }

  // ==================== 复利雪球模拟 (Compound / 72法则) ====================
  const COMPOUND_ROUNDS = [
    {
      rate: 8, options: [3, 6, 9, 18], ans: 9,
      desc: '你买入一只长期年化约 8% 的资产，把每年收益都再投回去。猜猜：本金翻一倍大约需要几年？',
      note: '72 ÷ 8 = 9 年翻倍。10万元 → 9年后20万 → 18年后40万 → 27年后80万。',
      lesson: '8% 看起来不快，但每 9 年就翻一倍——耐心持有 27 年，本金变成 8 倍。'
    },
    {
      rate: 12, options: [4, 6, 12, 24], ans: 6,
      desc: '换一只长期年化约 12% 的优质股，同样把分红再投入。本金翻倍大约要几年？',
      note: '72 ÷ 12 = 6 年翻倍。30年 = 5个翻倍周期，10万 → 320万（翻32倍）。',
      lesson: '收益率从 8% 提到 12%，翻倍时间从 9 年缩到 6 年——长期复利下，几个点的差距会被时间放大成天壤之别。'
    },
    {
      rate: 24, options: [2, 3, 6, 9], ans: 3,
      desc: '假设某段时间你抓到年化约 24% 的高成长股（极难长期维持）。本金翻倍只要几年？',
      note: '72 ÷ 24 = 3 年翻倍。但要警惕：24% 的高增速极难长期持续，别把短期当永久。',
      lesson: '72法则是把双刃剑：它让你看清复利的爆发力，也提醒你——高收益率往往不可持续，别用一时的高增速去幻想几十年复利。'
    },
  ];

  function buildCompoundGame() {
    return `
      <div class="odds-game">
        <div class="odds-game-title">🌱 复利雪球：用「72法则」心算翻倍时间</div>
        <div class="odds-game-intro">口诀：<strong>本金翻倍年数 ≈ 72 ÷ 年化收益率</strong>。来估算 3 个场景，感受复利的威力。</div>
        <div id="compound-stage"></div>
      </div>`;
  }

  function initCompoundGame() {
    window._compoundGame = { round: 0, score: 0, phase: 'choose', lastPick: null };
    renderCompound();
  }

  function renderCompound() {
    const g = window._compoundGame;
    const stage = document.getElementById('compound-stage');
    if (!g || !stage) return;
    const total = COMPOUND_ROUNDS.length;

    if (g.phase === 'done') {
      const max = total * 2;
      let grade, msg;
      if (g.score >= max) { grade = '🏆 复利大师'; msg = '完美！72法则你已经能脱口而出，复利的雪球逻辑也吃透了。'; }
      else if (g.score >= total) { grade = '👍 渐入佳境'; msg = '不错！记住：72 ÷ 收益率 = 翻倍年数，时间越长雪球越大。'; }
      else { grade = '🌱 再练一次'; msg = '别灰心——多算几遍 72÷收益率，复利的直觉很快就建立起来了。'; }
      stage.innerHTML = `
        <div class="odds-final">
          <div class="odds-final-score">得分 <span class="num">${g.score}</span> / ${max}</div>
          <div class="odds-final-grade">${grade}</div>
          <div class="odds-final-msg">${msg}</div>
          <div class="odds-final-key">📌 一句话记住：<strong>尽早开始 + 长期持有 + 收益再投，复利会替你做最重的活。</strong></div>
          <button class="btn-primary" onclick="App.compoundReplay()">🔄 再玩一次</button>
        </div>`;
      return;
    }

    const r = COMPOUND_ROUNDS[g.round];

    if (g.phase === 'choose') {
      stage.innerHTML = `
        <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
        <div class="odds-card">
          <div class="odds-card-tag">年化收益率 ${r.rate}%</div>
          <div class="odds-card-ctx">${r.desc}</div>
          <div class="odds-card-ask">本金翻一倍大约需要几年？</div>
          <div class="odds-choices">
            ${r.options.map(y => `
              <button class="odds-choice" onclick="App.compoundPick(${y})">
                <span class="oc-label">${y} 年</span>
              </button>`).join('')}
          </div>
        </div>`;
      return;
    }

    // reveal
    const pick = g.lastPick;
    const correct = pick === r.ans;
    stage.innerHTML = `
      <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
      <div class="odds-reveal ${correct ? 'good' : 'bad'}">
        <div class="odds-reveal-head">${correct ? '✅ 算对了！' : '❌ 再想想'}　<span class="odds-reveal-pick">你选了：${pick} 年（+${correct ? 2 : 0}）</span></div>
        <div class="odds-reveal-outcome"><strong>正解：约 ${r.ans} 年。</strong>${r.note}</div>
        <div class="odds-reveal-lesson">${r.lesson}</div>
        <button class="btn-primary" onclick="App.compoundNext()">${g.round + 1 < total ? '下一题 →' : '看最终成绩 →'}</button>
      </div>`;
  }

  function compoundPick(year) {
    const g = window._compoundGame;
    if (!g || g.phase !== 'choose') return;
    g.lastPick = year;
    if (year === COMPOUND_ROUNDS[g.round].ans) g.score += 2;
    g.phase = 'reveal';
    renderCompound();
  }
  function compoundNext() {
    const g = window._compoundGame;
    if (!g) return;
    g.round += 1;
    g.phase = g.round >= COMPOUND_ROUNDS.length ? 'done' : 'choose';
    renderCompound();
  }
  function compoundReplay() { initCompoundGame(); }

  // ==================== 心理陷阱识别 (Behavioral Biases) ====================
  const PSYCH_ROUNDS_A = [
    {
      tag: '账户里两只股票', bias: '处置效应',
      context: '你急用钱要卖一只股票：A 已经赚了 30%，B 已经亏了 30%。两家公司未来前景你判断<strong>差不多</strong>。很多人会卖掉 A 留下 B。',
      ask: '更理性的做法是？',
      choices: [
        { key: 'sell_b', label: '看未来前景决定，前景差的就卖', icon: '🧠' },
        { key: 'sell_a', label: '卖掉赚钱的 A，留住亏钱的 B', icon: '🪙' },
        { key: 'keep_all', label: '都不卖，再等等', icon: '😐' },
      ],
      best: 'sell_b',
      outcome: '该不该留，只取决于"未来还会不会涨"，与你赚了还是亏了无关。卖盈留亏=砍掉利润、放任亏损。',
      lesson: '这是<strong>处置效应</strong>：人爱兑现快乐、逃避痛苦。正解是"砍亏损、让利润奔跑"，按未来前景而非买入成本做决定。'
    },
    {
      tag: '套牢之后', bias: '损失厌恶',
      context: '你 50 元买的股票跌到 35 元，基本面已经变差。但你心想"等回到 50 我就走，不然就亏了"。',
      ask: '这时你该？',
      choices: [
        { key: 'reassess', label: '按现在的价值重新评估，该割就割', icon: '🧠' },
        { key: 'hold_even', label: '死扛，回到 50 元成本价再说', icon: '💔' },
        { key: 'add', label: '加倍买入摊低成本，赌反弹', icon: '🎲' },
      ],
      best: 'reassess',
      outcome: '市场不知道也不在乎你的成本是 50。基本面变差还死扛，往往越套越深。',
      lesson: '这是<strong>损失厌恶</strong>在作祟：怕承受亏损的痛，反而冒更大险死扛。止损与否要看未来，而不是"能不能回本"。'
    },
    {
      tag: '"打四折"的诱惑', bias: '锚定效应',
      context: '一只股票从 100 元跌到 40 元。朋友说："打四折了，太便宜，赶紧抄底！"',
      ask: '你怎么判断它贵不贵？',
      choices: [
        { key: 'value', label: '算它现在值多少钱，与历史价无关', icon: '🧠' },
        { key: 'discount', label: '从 100 跌到 40，便宜，买！', icon: '⚓' },
        { key: 'wait_30', label: '等跌到 30 更便宜再说', icon: '⚓' },
      ],
      best: 'value',
      outcome: '40 元贵不贵，只取决于公司现在值多少钱。曾经的 100 元只是一个无意义的"锚"。',
      lesson: '这是<strong>锚定效应</strong>：被历史高价锚住。破解法——每次都问"以现价和现在的基本面，我还会重新买它吗？"'
    },
  ];
  const PSYCH_ROUNDS_B = [
    {
      tag: '全民炒股的盛况', bias: '羊群效应',
      context: '开户排长队、菜场大妈都在荐股、新基金一日售罄，朋友圈人人晒收益。市场一片乐观。',
      ask: '此刻你倾向于？',
      choices: [
        { key: 'cautious', label: '提高警惕，越是人人看多越危险', icon: '🧠' },
        { key: 'all_in', label: '赶紧上车，别错过这波', icon: '🐑' },
        { key: 'leverage', label: '加杠杆满仓，机会难得', icon: '🔥' },
      ],
      best: 'cautious',
      outcome: '2007、2015 两次大顶都伴随"全民炒股"。当最后一个人也冲进来，接盘的钱就快用完了。',
      lesson: '这是<strong>羊群效应</strong>的顶峰。"别人贪婪时我恐惧"——感觉"特别安全、人人都在做"时，恰恰最该警惕。'
    },
    {
      tag: '眼红的焦虑', bias: 'FOMO',
      context: '某板块天天涨停，你没买，看着别人一天赚你一个月工资，焦虑到睡不着，很想冲进去。',
      ask: '更聪明的做法是？',
      choices: [
        { key: 'discipline', label: '只买自己看得懂、算得清价值的', icon: '🧠' },
        { key: 'chase', label: '立刻追进去，不能再错过了', icon: '🔥' },
        { key: 'borrow', label: '借钱也要上，回本快', icon: '🎲' },
      ],
      best: 'discipline',
      outcome: '等"怕错过"蔓延到你时，价格往往已经很高，你接的常是最后一棒。',
      lesson: '这是<strong>FOMO（错失恐惧）</strong>。错过一班车不可怕，市场永远有下一班；本金亏光才再难翻身。靠纪律对抗情绪。'
    },
    {
      tag: '连胜之后', bias: '过度自信',
      context: '你最近连续买中几只都涨了，开始觉得"我对市场很有感觉"，准备重仓、加杠杆、天天交易。',
      ask: '此时你应该？',
      choices: [
        { key: 'humble', label: '分清运气和实力，保持仓位纪律', icon: '🧠' },
        { key: 'heavy', label: '重仓加杠杆，趁手感好多赚', icon: '🦚' },
        { key: 'trade', label: '天天频繁交易，机会不能放过', icon: '⚡' },
      ],
      best: 'humble',
      outcome: '研究显示：交易越频繁，扣掉手续费后收益往往越差。连胜常常只是赶上了大盘普涨。',
      lesson: '这是<strong>过度自信</strong>：把运气当实力，导致过度交易和重仓。承认会犯错、保持谦逊和纪律，才能长期活下来。'
    },
  ];

  function buildPsychGame(title, intro) {
    return `
      <div class="odds-game">
        <div class="odds-game-title">${title}</div>
        <div class="odds-game-intro">${intro}</div>
        <div id="psych-stage"></div>
      </div>`;
  }

  function initPsychGame(rounds) {
    window._psychGame = { rounds, round: 0, score: 0, phase: 'choose', lastPick: null };
    renderPsych();
  }

  function renderPsych() {
    const g = window._psychGame;
    const stage = document.getElementById('psych-stage');
    if (!g || !stage) return;
    const rounds = g.rounds;
    const total = rounds.length;

    if (g.phase === 'done') {
      const max = total * 2;
      let grade, msg;
      if (g.score >= max) { grade = '🏆 心如止水'; msg = '完美！你已经能在第一时间认出人性的陷阱，这比看懂任何一家公司都难得。'; }
      else if (g.score >= total) { grade = '👍 渐有定力'; msg = '不错！知道这些陷阱长什么样，下次它们出现时你就能多一秒清醒。'; }
      else { grade = '🌱 正常的人'; msg = '别灰心——这些都是刻在基因里的本能，能意识到它们，就已经领先大多数人了。'; }
      stage.innerHTML = `
        <div class="odds-final">
          <div class="odds-final-score">得分 <span class="num">${g.score}</span> / ${max}</div>
          <div class="odds-final-grade">${grade}</div>
          <div class="odds-final-msg">${msg}</div>
          <div class="odds-final-key">📌 一句话记住：<strong>投资是反人性的，认识自己的本能，才能不被它操控。</strong></div>
          <button class="btn-primary" onclick="App.psychReplay()">🔄 再玩一次</button>
        </div>`;
      return;
    }

    const r = rounds[g.round];

    if (g.phase === 'choose') {
      stage.innerHTML = `
        <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
        <div class="odds-card">
          <div class="odds-card-tag">${r.tag}</div>
          <div class="odds-card-ctx">${r.context}</div>
          <div class="odds-card-ask">${r.ask}</div>
          <div class="odds-choices">
            ${r.choices.map(c => `
              <button class="odds-choice" onclick="App.psychPick('${c.key}')">
                <span class="oc-icon">${c.icon}</span>
                <span class="oc-label">${c.label}</span>
              </button>`).join('')}
          </div>
        </div>`;
      return;
    }

    // reveal
    const pick = g.lastPick;
    const correct = pick === r.best;
    const pickLabel = r.choices.find(c => c.key === pick).label;
    stage.innerHTML = `
      <div class="odds-progress">第 ${g.round + 1} / ${total} 题　·　累计 ${g.score} 分</div>
      <div class="odds-reveal ${correct ? 'good' : 'bad'}">
        <div class="odds-reveal-head">${correct ? '✅ 清醒！' : `❌ 中招了：${r.bias}`}　<span class="odds-reveal-pick">你选了：${pickLabel}（+${correct ? 2 : 0}）</span></div>
        <div class="odds-reveal-outcome"><strong>会发生什么：</strong>${r.outcome}</div>
        <div class="odds-reveal-lesson">${r.lesson}</div>
        <button class="btn-primary" onclick="App.psychNext()">${g.round + 1 < total ? '下一题 →' : '看最终成绩 →'}</button>
      </div>`;
  }

  function psychPick(key) {
    const g = window._psychGame;
    if (!g || g.phase !== 'choose') return;
    g.lastPick = key;
    if (key === g.rounds[g.round].best) g.score += 2;
    g.phase = 'reveal';
    renderPsych();
  }
  function psychNext() {
    const g = window._psychGame;
    if (!g) return;
    g.round += 1;
    g.phase = g.round >= g.rounds.length ? 'done' : 'choose';
    renderPsych();
  }
  function psychReplay() { initPsychGame(window._psychGame.rounds); }

  // ---- Bull/Bear Line Chart ----
  function buildBullBear() {
    const cycles = [
      { type:'bear', label:'熊市', years:'1994-1996', pct:'-65%', detail:'股改初期，市场信心不足，沪指从325跌至512点附近后长期低迷' },
      { type:'bull', label:'牛市', years:'1996-1997', pct:'+284%', detail:'改革预期升温，史上首轮大牛，沪指从512飙升至1510点' },
      { type:'bear', label:'熊市', years:'1997-2005', pct:'-55%', detail:'亚洲金融危机+国有股减持压力，长达7年漫漫熊市' },
      { type:'bull', label:'牛市', years:'2005-2007', pct:'+371%', detail:'股权分置改革落地，史诗级大牛，沪指从998一路涨到6124点' },
      { type:'bear', label:'熊市', years:'2007-2008', pct:'-73%', detail:'次贷危机引发全球股灾，沪指从6124腰斩再腰斩，跌至1664点' },
      { type:'bull', label:'牛市', years:'2008-2009', pct:'+101%', detail:'4万亿刺激政策出台，V形反转，沪指从1664回升至3478点' },
      { type:'flat', label:'震荡', years:'2009-2014', pct:'-40%', detail:'经济转型阵痛，流动性逐步收紧，指数在2000-3000点间震荡下行' },
      { type:'bull', label:'牛市', years:'2014-2015', pct:'+152%', detail:'场外配资驱动杠杆牛市，沪指从2000快速拉升至5178点后崩塌' },
      { type:'bear', label:'熊市', years:'2015-2019', pct:'-44%', detail:'去杠杆+中美贸易战，漫长调整，沪指从5178跌至2440点' },
      { type:'bull', label:'牛市', years:'2019-2021', pct:'+82%', detail:'疫情大放水推动核心资产行情，茅台、宁德等白马股翻倍' },
      { type:'bear', label:'熊市', years:'2021-2024', pct:'-45%', detail:'政策紧缩+地产风险蔓延，沪指从3715跌至2635点' },
      { type:'bull', label:'牛市', years:'2024-今', pct:'+?', detail:'三部委联合降息降准，沪指一周涨25%，新一轮行情启动中' },
    ];

    // Year ranges for background bands [start, end]
    const bandYears = [
      [1994,1996],[1996,1997],[1997,2005],[2005,2007.7],
      [2007.7,2008.8],[2008.8,2009.8],[2009.8,2014],[2014,2015.5],
      [2015.5,2019],[2019,2021],[2021,2024.2],[2024.2,2025],
    ];

    // Price data [year, index_value] — approximate Shanghai Composite
    const priceData = [
      [1994,330],[1995,700],[1996.5,1250],[1997,1510],
      [1999,1800],[2001.5,2245],[2005,998],[2006.5,2500],
      [2007.7,6124],[2008.8,1664],[2009.8,3478],
      [2012,2100],[2014,2000],[2015.2,5178],
      [2016,2638],[2018.9,2441],[2019.8,3290],
      [2021,3715],[2022.5,2900],[2024.1,2635],[2024.9,3500],
    ];

    const W = 560, H = 160, padT = 10, padB = 8;
    const maxP = 6400, startYr = 1994, endYr = 2025;
    const span = endYr - startYr;
    const tx = yr => +((yr - startYr) / span * W).toFixed(1);
    const ty = p  => +(padT + (1 - p / maxP) * (H - padT - padB)).toFixed(1);

    const typeColor = { bull:'rgba(229,57,53,0.10)', bear:'rgba(67,160,71,0.10)', flat:'rgba(148,163,184,0.12)' };

    const bands = bandYears.map(([y1,y2],i) => {
      const x1=tx(y1), x2=tx(Math.min(y2,endYr)), w=(x2-x1).toFixed(1);
      return `<rect x="${x1}" y="0" width="${w}" height="${H}" fill="${typeColor[cycles[i].type]}"
              class="bb-band" style="cursor:pointer"/>`;
    }).join('');

    const gridLines = [1000,2000,3000,4000,5000,6000].map(p => {
      const y = ty(p);
      return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#E2E8F0" stroke-width="0.5"/>
              <text x="-6" y="${(y+3.5).toFixed(1)}" font-size="10" fill="#94A3B8" text-anchor="end">${(p/1000).toFixed(0)}k</text>`;
    }).join('');

    const pathD = priceData.map(([yr,p],i) => `${i===0?'M':'L'}${tx(yr)},${ty(p)}`).join(' ');
    const areaD = pathD + ` L${W},${H} L0,${H} Z`;

    const yearTicks = [1994,1997,2001,2005,2007,2009,2015,2019,2021,2024].map(yr => {
      const x = tx(yr);
      return `<text x="${x}" y="${H+16}" font-size="10" fill="#94A3B8" text-anchor="middle">${yr}</text>
              <line x1="${x}" y1="${H}" x2="${x}" y2="${H+4}" stroke="#CBD5E1" stroke-width="0.5"/>`;
    }).join('');

    const annots = [
      { yr:2007.7, p:6124, label:'6124', dy:-11, anchor:'middle' },
      { yr:2005,   p:998,  label:'998',  dy:13,  anchor:'start'  },
      { yr:2015.2, p:5178, label:'5178', dy:-11, anchor:'middle' },
    ].map(a => {
      const x=tx(a.yr), y=ty(a.p);
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
              <text x="${x}" y="${(y+a.dy).toFixed(1)}" font-size="10" fill="#F59E0B" text-anchor="${a.anchor}" font-weight="700">${a.label}</text>`;
    }).join('');

    window._bbCycles = cycles;
    return `
      <div class="bb-chart-wrap">
        <svg viewBox="-28 -4 620 ${H+28}" style="height:210px">
          <defs>
            <linearGradient id="bbArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.01"/>
            </linearGradient>
          </defs>
          ${bands}
          ${gridLines}
          <path d="${areaD}" fill="url(#bbArea)"/>
          <path id="bb-line" d="${pathD}" fill="none" stroke="#3B82F6" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
          ${yearTicks}
          ${annots}
        </svg>
        <div class="bb-legend">
          <span class="bbl bull">■ 牛市</span>
          <span class="bbl bear">■ 熊市</span>
          <span class="bbl flat">■ 震荡</span>
          <span class="bbl hint">← 点击色块查看详情</span>
        </div>
        <div class="timeline-detail" id="bb-detail">👆 点击图表中的背景色块，查看该时期的市场情况</div>
      </div>`;
  }

  // ---- Quadrant ----
  function buildQuadrant() {
    const quads = [
      { cls:'q1', pos:'经济强 + 流动性紧', title:'🔴 过热阶段', action:'→ 逐步卖出减仓', arrow:'↗️', detail:'🎉 想象全班同学都在抢同一款球鞋，价格炒到原价5倍——这就是"过热"。股市里，大家都赚了钱、新闻天天报牛市，但央行悄悄开始"收水"（加息）。2007年底就是这个状态：出租车司机在聊股票，之后股市跌了73%。记住：最嗨的时刻，往往是最危险的时刻。' },
      { cls:'q2', pos:'经济弱 + 流动性紧', title:'🟠 衰退阶段', action:'→ 观望为主', arrow:'↘️', detail:'😰 跑完马拉松之后，又没钱买水——又累又渴，两头都不好。经济已经很差了，但央行还没开始放水（还没降息），股市最难熬。这时候最大的错误是恐慌割肉。正确做法：耐心等政策转向信号，等到央行降息那一刻，就是下一阶段的开始。' },
      { cls:'q3', pos:'经济弱 + 流动性宽', title:'🟢 复苏阶段', action:'→ 积极布局买入', arrow:'↙️', detail:'🌱 大家都觉得天要塌了，但央行已经开始大量放水（降息降准）——历史上最好的买入窗口！2009年初，没有人想买股票；但那年年初买入的人，一年赚了100%。2014年底同样如此。反人性，才能赚大钱。' },
      { cls:'q4', pos:'经济强 + 流动性宽', title:'🔵 繁荣阶段', action:'→ 持股享受上涨', arrow:'↖️', detail:'🚀 顺风顺水：经济向好，钱又多，牛市加速。就像风筝碰到顺风，不费力气自然往上飘。2020年就是典型——疫情后大水漫灌+经济复苏，茅台、宁德、招商银行，核心资产轮番暴涨。尽情享受，但心里要有表：繁荣会切换到过热。' },
    ];
    window._quads = quads;

    return `
      <div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;font-size:12px;color:#64748B;">
          <span>↕ 流动性（央行松紧）</span>
          <span style="margin-left:auto">经济增长强弱 →</span>
        </div>
        <div class="quadrant-wrap" id="quadrant-grid">
          ${quads.map((q,i) => `
            <div class="quadrant-cell ${q.cls}" onclick="App.showQuadDetail(${i})">
              <div class="q-corner">${q.pos}</div>
              <div class="q-title">${q.title}</div>
              <div class="q-action">${q.action}</div>
              <div class="q-arrow">${q.arrow}</div>
            </div>
          `).join('')}
        </div>
        <div class="quadrant-detail" id="quad-detail">👆 点击四个象限，了解对应的投资策略</div>
      </div>
    `;
  }

  function showQuadDetail(i) {
    document.querySelectorAll('.quadrant-cell').forEach((el,j) => {
      el.classList.toggle('active', j===i);
    });
    const d = document.getElementById('quad-detail');
    if (d) d.innerHTML = '<strong>' + window._quads[i].title + '</strong><br>' + window._quads[i].detail;
  }

  // ---- Indicator Game ----
  const INDICATOR_SCENARIOS = [
    {
      id: 'bottom-2009', year: '2009年初',
      context: '金融危机最低谷，4万亿刺激刚刚出台',
      verdict: 'buy', verdictLabel: '📈 历史级买入机会',
      verdictExplain: '经济指标全红，但这正是"反人性买入"的时刻——估值已到历史最低，央行开始放水，估值+流动性双重支撑。随后一年沪指涨超100%。记住：当所有人都悲观放弃的时候，往往是历史最好的买点。',
      indicators: [
        { name:'PMI', val:'48.5', cat:'经济', light:'red', reason:'低于50，制造业在收缩，经济还在下行' },
        { name:'M1增速', val:'+3.1%', cat:'经济', light:'red', reason:'企业账上活钱极少，没有投资扩张意愿' },
        { name:'消费信心', val:'88', cat:'经济', light:'red', reason:'低于100基准线，居民悲观、不敢花钱' },
        { name:'巴菲特指标', val:'42%', cat:'估值', light:'green', reason:'股市总值只有GDP的42%，历史极低，便宜到"打折甩卖"' },
        { name:'股债利差', val:'+6.1%', cat:'估值', light:'green', reason:'股票收益率比国债高6%，极度低估信号' },
        { name:'全市场PE', val:'11x', cat:'估值', light:'green', reason:'11倍PE，历史底部区间，相当于"白菜价"' },
        { name:'10年期国债', val:'2.7%', cat:'流动性', light:'green', reason:'利率已开始下行，央行放水信号明确' },
        { name:'北向资金', val:'+85亿', cat:'流动性', light:'green', reason:'聪明外资悄悄买入，已经嗅到底部' },
        { name:'融资余额', val:'0.4万亿', cat:'流动性', light:'green', reason:'杠杆极低，不存在踩踏风险，上涨空间大' },
      ]
    },
    {
      id: 'peak-2007', year: '2007年底',
      context: '史诗级牛市顶点，沪指6124点，全民炒股',
      verdict: 'sell', verdictLabel: '📉 极度危险，果断减仓',
      verdictExplain: '估值三个指标全部爆表，流动性也在收紧——这是泡沫破裂前的典型特征。估值已经到了"荒唐"的程度，即使经济还不错，聪明的投资者也该开始减仓了。随后两年，股市跌去了73%。',
      indicators: [
        { name:'PMI', val:'55.2', cat:'经济', light:'yellow', reason:'经济过热，景气到顶——繁荣本身不是坏事，但顶部就在附近' },
        { name:'M1增速', val:'+22%', cat:'经济', light:'yellow', reason:'增速过高，泡沫特征明显，历史顶部规律' },
        { name:'消费信心', val:'118', cat:'经济', light:'yellow', reason:'所有人都超级乐观——这本身就是危险信号！' },
        { name:'巴菲特指标', val:'163%', cat:'估值', light:'red', reason:'股市总值是GDP的1.6倍，严重泡沫化' },
        { name:'股债利差', val:'-1.2%', cat:'估值', light:'red', reason:'股票收益率比国债还低！买股票还不如买国债稳' },
        { name:'全市场PE', val:'47x', cat:'估值', light:'red', reason:'47倍PE，需要47年才能"回本"，泡沫随时破裂' },
        { name:'10年期国债', val:'4.9%', cat:'流动性', light:'red', reason:'央行已加息至高位，流动性持续收紧' },
        { name:'北向资金', val:'-30亿', cat:'流动性', light:'red', reason:'聪明外资已经悄悄开始撤退了' },
        { name:'融资余额', val:'2.1万亿', cat:'流动性', light:'red', reason:'杠杆极高，一旦下跌会引发连环踩踏' },
      ]
    },
    {
      id: 'recovery-2014', year: '2014年底',
      context: '经济疲软但政策明确转向，牛市刚刚启动',
      verdict: 'buy', verdictLabel: '📈 积极布局，牛市起点',
      verdictExplain: '经济指标偏弱（中性），但估值极低、流动性已经宽松——这是"估值洼地+政策转向"的组合，历史上每次出现这种格局都是好买点。随后沪指从2000点涨到5178点，两年多翻了2.5倍。',
      indicators: [
        { name:'PMI', val:'49.8', cat:'经济', light:'yellow', reason:'略低于50，经济偏弱但没有崩塌，处于温水状态' },
        { name:'M1增速', val:'+3.2%', cat:'经济', light:'yellow', reason:'企业活水偏少，实体经济还比较冷' },
        { name:'消费信心', val:'96', cat:'经济', light:'yellow', reason:'接近中性基准100，不乐观也不悲观' },
        { name:'巴菲特指标', val:'55%', cat:'估值', light:'green', reason:'只有GDP的55%，明显低于合理区间，便宜' },
        { name:'股债利差', val:'+4.2%', cat:'估值', light:'green', reason:'股票比国债划算很多，性价比突出' },
        { name:'全市场PE', val:'12x', cat:'估值', light:'green', reason:'12倍PE，历史低位，安全边际充足' },
        { name:'10年期国债', val:'3.5%', cat:'流动性', light:'yellow', reason:'利率偏高但已开始下行，流动性边际改善' },
        { name:'北向资金', val:'+60亿', cat:'流动性', light:'green', reason:'外资净流入，低估值吸引了全球资金' },
        { name:'融资余额', val:'0.7万亿', cat:'流动性', light:'yellow', reason:'杠杆中等，还有较大上行空间' },
      ]
    },
    {
      id: 'bear-2022', year: '2022年',
      context: '美联储激进加息+疫情+房地产危机三重压力',
      verdict: 'watch', verdictLabel: '🔍 谨慎观望，等待信号',
      verdictExplain: '经济三个指标都亮红，但估值已经回到合理甚至低估区间，流动性也比较宽松。这不是最好的时机（经济还在下行），但已经在孕育机会了。等PMI企稳、北向资金转为净流入，就是布局信号。',
      indicators: [
        { name:'PMI', val:'48.8', cat:'经济', light:'red', reason:'低于50，疫情冲击制造业，经济明显收缩' },
        { name:'M1增速', val:'+4.6%', cat:'经济', light:'red', reason:'企业活水少，实体经济偏弱，扩张意愿低' },
        { name:'消费信心', val:'91', cat:'经济', light:'red', reason:'居民消费意愿很低，疫情严重压制信心' },
        { name:'巴菲特指标', val:'67%', cat:'估值', light:'green', reason:'估值已回到合理区间，经过大跌不再高估' },
        { name:'股债利差', val:'+3.8%', cat:'估值', light:'green', reason:'股票相对国债有一定吸引力' },
        { name:'全市场PE', val:'13x', cat:'估值', light:'green', reason:'13倍PE，低于历史均值，股票便宜了' },
        { name:'10年期国债', val:'2.8%', cat:'流动性', light:'green', reason:'央行降息，国内流动性相对宽松' },
        { name:'北向资金', val:'-45亿', cat:'流动性', light:'red', reason:'美联储加息导致外资持续流出A股' },
        { name:'融资余额', val:'1.5万亿', cat:'流动性', light:'yellow', reason:'杠杆中性，无过热也无过冷迹象' },
      ]
    },
  ];

  function buildIndicatorGame() {
    return `<div class="ind-game" id="ind-game">
      <div id="ind-scenario-bar"></div>
      <div class="indicators-grid" id="ind-grid"></div>
      <div id="ind-panel"><div class="ind-start-hint">👆 点击任意一张牌，翻开后猜猜它对市场是好事还是坏事</div></div>
    </div>`;
  }

  function initIndicatorGame() {
    const usedIds = window._indGame?.usedIds || [];
    const available = INDICATOR_SCENARIOS.filter(s => !usedIds.includes(s.id));
    const pool = available.length ? available : INDICATOR_SCENARIOS;
    const scenario = pool[Math.floor(Math.random() * pool.length)];
    window._indGame = {
      scenario,
      usedIds: [...usedIds, scenario.id],
      states: new Array(9).fill(null),
      active: null,
      phase: 'guess',
      score: 0,
    };
    renderIndGame();
  }

  function renderIndGame() {
    const g = window._indGame;
    if (!g) return;
    const { scenario, states, active, phase, score } = g;
    const judged = states.filter(s => s !== null).length;

    const bar = document.getElementById('ind-scenario-bar');
    if (bar) bar.innerHTML = `
      <div class="ind-scenario-bar">
        <span class="ind-year-tag">📅 ${scenario.year}</span>
        <span class="ind-ctx">${scenario.context}</span>
        <span class="ind-score-tag">已翻 ${judged}/9 · 猜对 ${score}</span>
      </div>`;

    const grid = document.getElementById('ind-grid');
    if (grid) grid.innerHTML = scenario.indicators.map((ind, i) => {
      const st = states[i];
      const isActive = active === i && st === null;
      if (st !== null) {
        const lc = ind.light === 'green' ? '#10B981' : ind.light === 'yellow' ? '#F59E0B' : '#EF4444';
        const bg = ind.light === 'green' ? '#ECFDF5' : ind.light === 'yellow' ? '#FFFBEB' : '#FEF2F2';
        return `<div class="ind-card judged" style="background:${bg};border-color:${lc}20;outline:2px solid ${lc}">
          <div class="ind-card-name">${ind.name}</div>
          <div class="ind-card-val" style="color:${lc}">${ind.val}</div>
          <div class="ind-cat">${ind.cat}</div>
          <div style="font-size:14px;margin-top:2px">${st.correct ? '✅' : '❌'}</div>
        </div>`;
      }
      if (isActive) {
        return `<div class="ind-card active-card">
          <div class="ind-card-name">${ind.name}</div>
          <div class="ind-card-val">${ind.val}</div>
          <div class="ind-cat">${ind.cat}</div>
          <div class="ind-card-pulse">判断↓</div>
        </div>`;
      }
      return `<div class="ind-card unflipped" onclick="App.indFlip(${i})">
        <div class="ind-card-name">${ind.name}</div>
        <div class="ind-card-q">？</div>
        <div class="ind-cat">${ind.cat}</div>
      </div>`;
    }).join('');

    const panel = document.getElementById('ind-panel');
    if (!panel) return;

    if (phase === 'done') {
      const total = score;
      const emoji = total >= 8 ? '🏆' : total >= 6 ? '🎉' : total >= 4 ? '👍' : '📚';
      const comment = total >= 8 ? '指标专家！' : total >= 6 ? '掌握得不错！' : total >= 4 ? '继续练习！' : '多玩几局就熟了！';
      panel.innerHTML = `<div class="ind-done-panel">
        <div class="ind-final-score">${emoji} 最终得分 <strong>${total}/10</strong>（9个指标 + 1道综合题） · ${comment}</div>
        <div class="ind-verdict-box ${scenario.verdict}">
          <div class="ind-verdict-label">${scenario.verdictLabel}</div>
          <div class="ind-verdict-explain">${scenario.verdictExplain}</div>
        </div>
        <button class="btn-secondary" style="margin-top:10px" onclick="App.indReplay()">🎲 换一个年份再玩</button>
      </div>`;
      return;
    }

    if (phase === 'verdict-q') {
      panel.innerHTML = `<div class="ind-verdict-q-panel">
        <div class="ind-score-summary">指标判断完毕！猜对了 <strong>${score}/9</strong> 个。来做最后一道综合题：</div>
        <div class="ind-verdict-question">综合以上9个指标，<strong>${scenario.year}</strong> 的A股市场最适合？</div>
        <div class="ind-verdict-opts">
          <button class="ind-verdict-btn buy" onclick="App.indVerdictGuess('buy')">📈 积极买入</button>
          <button class="ind-verdict-btn watch" onclick="App.indVerdictGuess('watch')">🔍 谨慎观望</button>
          <button class="ind-verdict-btn sell" onclick="App.indVerdictGuess('sell')">📉 减仓警惕</button>
        </div>
      </div>`;
      return;
    }

    if (active !== null && states[active] !== null) {
      const ind = scenario.indicators[active];
      const st = states[active];
      const lightName = ind.light === 'green' ? '🟢 健康' : ind.light === 'yellow' ? '🟡 中性' : '🔴 风险';
      const nextIdx = states.findIndex(s => s === null);
      panel.innerHTML = `<div class="ind-feedback-panel ${st.correct ? 'correct' : 'wrong'}">
        <div class="ind-feedback-msg">${st.correct ? '✅ 答对了！' : `❌ 没猜到，正确答案是 ${lightName}`}</div>
        <div class="ind-feedback-reason">📌 ${ind.reason}</div>
        <button class="btn-primary" onclick="App.indNext()">${nextIdx >= 0 ? '下一张 →' : '查看综合结论 →'}</button>
      </div>`;
      return;
    }

    if (active !== null && states[active] === null) {
      const ind = scenario.indicators[active];
      panel.innerHTML = `<div class="ind-guess-panel">
        <div class="ind-guess-label">「${ind.name}」当前值：<strong>${ind.val}</strong>（${ind.cat}类指标）</div>
        <div class="ind-guess-sub">这个数值对股市来说是…</div>
        <div class="ind-guess-btns">
          <button class="ind-guess-btn green" onclick="App.indGuess('green')">🟢 健康</button>
          <button class="ind-guess-btn yellow" onclick="App.indGuess('yellow')">🟡 中性</button>
          <button class="ind-guess-btn red" onclick="App.indGuess('red')">🔴 风险</button>
        </div>
      </div>`;
      return;
    }

    panel.innerHTML = `<div class="ind-start-hint">👆 点击任意一张牌，翻开后猜猜它对市场是好事还是坏事</div>`;
  }

  function indFlip(idx) {
    const g = window._indGame;
    if (!g || g.states[idx] !== null || g.phase !== 'guess') return;
    g.active = idx;
    renderIndGame();
  }

  function indGuess(color) {
    const g = window._indGame;
    if (!g || g.active === null || g.states[g.active] !== null) return;
    const correct = color === g.scenario.indicators[g.active].light;
    if (correct) g.score++;
    g.states[g.active] = { guess: color, correct };
    renderIndGame();
  }

  function indNext() {
    const g = window._indGame;
    if (!g) return;
    const nextIdx = g.states.findIndex(s => s === null);
    if (nextIdx >= 0) {
      g.active = nextIdx;
    } else {
      g.active = null;
      g.phase = 'verdict-q';
    }
    renderIndGame();
  }

  function indVerdictGuess(choice) {
    const g = window._indGame;
    if (!g) return;
    if (choice === g.scenario.verdict) g.score++;
    g.phase = 'done';
    renderIndGame();
  }

  function indReplay() {
    const usedIds = window._indGame?.usedIds || [];
    window._indGame = { usedIds };
    initIndicatorGame();
  }

  // ---- Style Bars ----
  function buildStyleBars() {
    const periods = [
      { years:'2001-2007', big:'+266%', small:'+48%', winner:'big', reason:'基建+银行主导，大盘蓝筹稳赢' },
      { years:'2008-2015', big:'+42%', small:'+380%', winner:'small', reason:'互联网+创业板崛起，小盘大爆发' },
      { years:'2016-2020', big:'+60%', small:'+15%', winner:'big', reason:'贵州茅台、白酒消费升级，核心资产行情' },
      { years:'2021-2024', big:'+8%', small:'+35%', winner:'small', reason:'科创板+专精特新，小盘科技回归' },
    ];

    return `
      <div>
        <div style="display:flex;gap:16px;margin-bottom:12px;font-size:12px;">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#3B82F6;border-radius:3px;display:inline-block"></span>大盘股</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#10B981;border-radius:3px;display:inline-block"></span>小盘股</span>
        </div>
        ${periods.map(p => `
          <div style="margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">${p.years}</div>
            <div class="bar-chart-row">
              <div class="bar-label">大盘</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.min(100,Math.abs(parseInt(p.big))/4)}%;background:${p.winner==='big'?'#3B82F6':'#CBD5E1'}">${p.big}</div>
              </div>
            </div>
            <div class="bar-chart-row">
              <div class="bar-label">小盘</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.min(100,Math.abs(parseInt(p.small))/4)}%;background:${p.winner==='small'?'#10B981':'#CBD5E1'}">${p.small}</div>
              </div>
            </div>
            <div style="font-size:11px;color:#94A3B8;margin-top:2px">📌 ${p.reason}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- Policy Events ----
  function buildPolicyEvents() {
    const events = [
      { year:'1998', title:'应对亚洲金融危机', tag:'bull-tag', tagText:'利好', desc:'货币+财政双宽松，降息扩大内需，A股反弹' },
      { year:'2001', title:'国有股市价减持', tag:'bear-tag', tagText:'利空', desc:'宣布国有股按市价减持，市场信心崩塌，五年熊市开始' },
      { year:'2005', title:'股权分置改革', tag:'bull-tag', tagText:'利好', desc:'解决历史遗留问题，流动性大幅改善，史诗级牛市启动（+371%）' },
      { year:'2008', title:'4万亿经济刺激', tag:'bull-tag', tagText:'利好', desc:'金融危机后大规模财政刺激，A股快速V形反转' },
      { year:'2014', title:'降准降息周期启动', tag:'bull-tag', tagText:'利好', desc:'多次降准降息，加杠杆牛市启动（沪指从2000到5000+）' },
      { year:'2018', title:'去杠杆+贸易战', tag:'bear-tag', tagText:'利空', desc:'金融去杠杆叠加中美贸易摩擦，全年跌幅约25%' },
      { year:'2020', title:'疫情特别国债', tag:'bull-tag', tagText:'利好', desc:'大规模财政+货币双宽松应对疫情，核心资产暴涨' },
      { year:'2024', title:'三部委联合降息', tag:'bull-tag', tagText:'利好', desc:'央行+财政+证监会联合出手，A股一周涨25%' },
    ];
    window._policyEvents = events;

    return `
      <div class="policy-timeline">
        <div class="policy-events">
          ${events.map((e,i) => `
            <div class="policy-event" id="pe-${i}" onclick="App.showPolicyEvent(${i})">
              <div class="policy-year">${e.year}</div>
              <div class="policy-content">
                <span class="policy-tag ${e.tag}">${e.tagText}</span>
                <div class="policy-title">${e.title}</div>
                <div class="policy-desc">${e.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function showPolicyEvent(i) {
    document.querySelectorAll('.policy-event').forEach((el,j) => {
      el.classList.toggle('active', j===i);
    });
  }

  // ---- Fed Flow ----
  function buildFlowFed() {
    return `
      <div style="display:flex;flex-direction:column;gap:20px">
        <div style="text-align:center;font-size:13px;font-weight:700;color:#475569;margin-bottom:4px">美联储利率与全球资金流向</div>

        <div style="background:#EFF6FF;border-radius:10px;padding:16px">
          <div style="font-size:13px;font-weight:700;color:#1E40AF;margin-bottom:10px">🌊 降息周期（热钱环流）</div>
          <div class="flow-wrap" style="flex-wrap:wrap;gap:4px">
            <div class="flow-node blue">美联储降息</div>
            <div class="flow-arrow">→</div>
            <div class="flow-node green">美元走弱<div class="flow-node-sub">外资收益↓</div></div>
            <div class="flow-arrow">→</div>
            <div class="flow-node purple">资金流向新兴市场</div>
            <div class="flow-arrow">→</div>
            <div class="flow-node green">A股涨 📈<div class="flow-node-sub">北向资金流入</div></div>
          </div>
        </div>

        <div style="background:#FEF2F2;border-radius:10px;padding:16px">
          <div style="font-size:13px;font-weight:700;color:#991B1B;margin-bottom:10px">❄️ 加息周期（冷钱环流）</div>
          <div class="flow-wrap" style="flex-wrap:wrap;gap:4px">
            <div class="flow-node red">美联储加息</div>
            <div class="flow-arrow">→</div>
            <div class="flow-node red">美元走强<div class="flow-node-sub">美元资产收益↑</div></div>
            <div class="flow-arrow">→</div>
            <div class="flow-node gray">资金回流美国</div>
            <div class="flow-arrow">→</div>
            <div class="flow-node red">A股承压 📉<div class="flow-node-sub">北向资金流出</div></div>
          </div>
        </div>

        <div style="background:#F8FAFC;border-radius:8px;padding:12px;font-size:12px;color:#64748B">
          📡 <strong>关注信号：</strong>美联储议息会议（每年8次）、美国CPI数据（每月）、美联储主席讲话——提前预判加降息转向
        </div>
      </div>
    `;
  }

  // ---- Supply Demand ----
  function buildSupplyDemand() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
        <svg width="380" height="200" viewBox="0 0 380 200" style="max-width:100%">
          <!-- Grid -->
          <line x1="40" y1="10" x2="40" y2="170" stroke="#E2E8F0" stroke-width="1.5"/>
          <line x1="40" y1="170" x2="370" y2="170" stroke="#E2E8F0" stroke-width="1.5"/>
          <!-- Labels -->
          <text x="5" y="90" font-size="11" fill="#94A3B8" transform="rotate(-90,5,90)">价格</text>
          <text x="200" y="192" font-size="11" fill="#94A3B8" text-anchor="middle">数量</text>
          <!-- Supply curve -->
          <path d="M60,160 Q200,80 360,30" stroke="#EF4444" stroke-width="2.5" fill="none"/>
          <text x="355" y="26" font-size="11" fill="#EF4444" font-weight="700">供给</text>
          <!-- Demand curve -->
          <path d="M60,30 Q200,90 360,155" stroke="#3B82F6" stroke-width="2.5" fill="none"/>
          <text x="355" y="165" font-size="11" fill="#3B82F6" font-weight="700">需求</text>
          <!-- Equilibrium -->
          <circle cx="210" cy="95" r="5" fill="#10B981"/>
          <line x1="210" y1="95" x2="210" y2="170" stroke="#10B981" stroke-dasharray="4,3" stroke-width="1.5"/>
          <line x1="40" y1="95" x2="210" y2="95" stroke="#10B981" stroke-dasharray="4,3" stroke-width="1.5"/>
          <text x="215" y="90" font-size="11" fill="#10B981" font-weight="700">均衡点</text>
          <!-- Annotations -->
          <text x="45" y="30" font-size="10" fill="#EF4444">供给减少→</text>
          <text x="250" y="158" font-size="10" fill="#3B82F6">←需求增加</text>
        </svg>
        <div style="font-size:12px;color:#64748B;text-align:center;max-width:360px">
          当<span style="color:#EF4444;font-weight:700">供给减少</span>（如供给侧改革关停产能）或<span style="color:#3B82F6;font-weight:700">需求增加</span>（如新能源爆发），均衡价格上涨，企业利润改善，股价上涨。
        </div>
      </div>
    `;
  }

  // ---- Bar Liquor ----
  function buildBarLiquor() {
    const data = [
      { name:'茅台', roe:'35%', pe:'30x', width:88, color:'#3B82F6' },
      { name:'五粮液', roe:'28%', pe:'25x', width:70, color:'#6366F1' },
      { name:'洋河', roe:'19%', pe:'18x', width:48, color:'#8B5CF6' },
      { name:'普通白酒', roe:'8%', pe:'12x', width:20, color:'#94A3B8' },
    ];
    return `
      <div>
        <div style="font-size:12px;color:#64748B;margin-bottom:12px">白酒行业ROE对比（ROE越高=护城河越深）</div>
        ${data.map(d => `
          <div class="bar-chart-row">
            <div class="bar-label">${d.name}</div>
            <div class="bar-track">
              <div class="bar-fill bar-anim" data-w="${d.width}" style="width:0%;background:${d.color}">${d.roe}</div>
            </div>
            <div class="bar-val">PE ${d.pe}</div>
          </div>
        `).join('')}
        <div style="font-size:12px;color:#94A3B8;margin-top:10px">💡 茅台ROE长期35%+，远超同行，护城河最深</div>
      </div>
    `;
  }

  function animateBars() {
    document.querySelectorAll('.bar-anim').forEach(el => {
      const w = el.getAttribute('data-w');
      if (w) setTimeout(() => { el.style.width = w + '%'; }, 100);
    });
  }

  // ---- Pharmacy Cards ----
  function buildPharmacyCards() {
    const cards = [
      { icon:'🏭', title:'仿制药', risk:'高', desc:'集采大幅压价，利润空间被严重压缩。价格从数百元→几元。', color:'#FEF2F2', border:'#FCA5A5' },
      { icon:'🔬', title:'创新药', risk:'低', desc:'专利保护期内享有定价权，集采影响小，是未来方向。', color:'#ECFDF5', border:'#6EE7B7' },
      { icon:'🏥', title:'医疗服务', risk:'中', desc:'民营医院受政策限制，但老龄化带来长期需求增长。', color:'#EFF6FF', border:'#93C5FD' },
      { icon:'🩺', title:'医疗器械', risk:'中', desc:'高端器械国产替代空间大，但也面临集采压力。', color:'#F5F3FF', border:'#A78BFA' },
    ];
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${cards.map(c => `
          <div style="background:${c.color};border:1.5px solid ${c.border};border-radius:10px;padding:14px">
            <div style="font-size:24px;margin-bottom:6px">${c.icon}</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">${c.title}</div>
            <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:${c.risk==='高'?'#EF4444':c.risk==='中'?'#F59E0B':'#10B981'}">政策风险：${c.risk}</div>
            <div style="font-size:12px;color:#64748B">${c.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- Cost Curve ----
  function buildCostCurve() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <svg width="380" height="180" viewBox="0 0 380 180" id="cost-svg" style="max-width:100%">
          <line x1="40" y1="10" x2="40" y2="155" stroke="#E2E8F0" stroke-width="1.5"/>
          <line x1="40" y1="155" x2="370" y2="155" stroke="#E2E8F0" stroke-width="1.5"/>
          <text x="5" y="85" font-size="10" fill="#94A3B8" transform="rotate(-90,5,85)">成本</text>
          <text x="200" y="175" font-size="10" fill="#94A3B8" text-anchor="middle">年份</text>
          <!-- X labels -->
          <text x="60" y="168" font-size="9" fill="#94A3B8" text-anchor="middle">2010</text>
          <text x="160" y="168" font-size="9" fill="#94A3B8" text-anchor="middle">2015</text>
          <text x="260" y="168" font-size="9" fill="#94A3B8" text-anchor="middle">2020</text>
          <text x="350" y="168" font-size="9" fill="#94A3B8" text-anchor="middle">2025</text>
          <!-- Y labels -->
          <text x="35" y="20" font-size="9" fill="#94A3B8" text-anchor="end">高</text>
          <text x="35" y="155" font-size="9" fill="#94A3B8" text-anchor="end">低</text>
          <!-- Cost curve path (animated) -->
          <path id="cost-path" d="M60,18 C100,25 130,55 160,80 C200,110 240,130 280,140 C310,147 340,150 360,152"
                stroke="#F59E0B" stroke-width="3" fill="none" stroke-dasharray="500" stroke-dashoffset="500"/>
          <!-- Data points -->
          <circle cx="60"  cy="18"  r="4" fill="#EF4444"><title>光伏成本：2元/W</title></circle>
          <circle cx="160" cy="80"  r="4" fill="#F59E0B"><title>光伏成本：0.8元/W</title></circle>
          <circle cx="260" cy="135" r="4" fill="#10B981"><title>光伏成本：0.25元/W</title></circle>
          <circle cx="355" cy="151" r="4" fill="#3B82F6"><title>光伏成本：0.15元/W</title></circle>
          <!-- Labels -->
          <text x="65" y="15" font-size="9" fill="#EF4444">2元/W</text>
          <text x="165" y="77" font-size="9" fill="#F59E0B">0.8元/W</text>
          <text x="265" y="132" font-size="9" fill="#10B981">0.25元/W</text>
          <text x="305" y="165" font-size="9" fill="#3B82F6">0.15元/W</text>
          <!-- Shade area under -->
          <path d="M60,18 C100,25 130,55 160,80 C200,110 240,130 280,140 C310,147 340,150 360,152 L360,155 L60,155 Z"
                fill="url(#costGrad)" opacity="0.3"/>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F59E0B"/>
              <stop offset="100%" stop-color="#10B981"/>
            </linearGradient>
          </defs>
        </svg>
        <div style="font-size:12px;color:#64748B;text-align:center">光伏组件成本15年下降超90%，打开了万亿市场空间</div>
      </div>
    `;
  }

  function animateCostCurve() {
    const path = document.getElementById('cost-path');
    if (!path) return;
    let offset = 500;
    const timer = setInterval(() => {
      offset -= 10;
      path.style.strokeDashoffset = offset;
      if (offset <= 0) clearInterval(timer);
    }, 20);
  }

  // ---- Before/After ----
  function buildBeforeAfter() {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#FEF2F2;border-radius:10px;padding:16px;border:1.5px solid #FCA5A5">
          <div style="font-size:14px;font-weight:800;color:#991B1B;margin-bottom:12px">❌ 改革前（2015年）</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#7F1D1D">
            <div>📉 煤炭产能：<strong>40亿吨/年</strong></div>
            <div>💸 煤价：<strong>跌至200元/吨</strong></div>
            <div>🏭 行业亏损：<strong>大面积亏损</strong></div>
            <div>📊 股价：<strong>历史最低</strong></div>
            <div>😢 市场情绪：<strong>极度悲观</strong></div>
          </div>
        </div>
        <div style="background:#ECFDF5;border-radius:10px;padding:16px;border:1.5px solid #6EE7B7">
          <div style="font-size:14px;font-weight:800;color:#065F46;margin-bottom:12px">✅ 改革后（2021年）</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#064E3B">
            <div>📈 煤炭产能：<strong>减少10亿吨</strong></div>
            <div>💰 煤价：<strong>涨至1900元/吨</strong></div>
            <div>🏆 行业盈利：<strong>利润创历史新高</strong></div>
            <div>📊 股价：<strong>部分涨幅5-8倍</strong></div>
            <div>😄 市场情绪：<strong>重新关注</strong></div>
          </div>
        </div>
      </div>
      <div style="background:#FFFBEB;border-radius:8px;padding:12px;margin-top:12px;font-size:12px;color:#92400E">
        💡 <strong>核心逻辑：</strong>产能出清（供给减少40%）→ 需求相对稳定 → 价格大幅上涨 → 利润暴增 → 股价随之大涨
      </div>
    `;
  }

  // ---- Semi Chain ----
  function buildSemiChain() {
    const nodes = [
      { name:'EDA软件', eg:'新思/概伦', color:'#8B5CF6', barrier:'⭐⭐⭐⭐⭐' },
      { name:'芯片设计', eg:'海思/寒武纪', color:'#3B82F6', barrier:'⭐⭐⭐⭐' },
      { name:'光刻设备', eg:'ASML/中微', color:'#EF4444', barrier:'⭐⭐⭐⭐⭐' },
      { name:'晶圆制造', eg:'台积电/中芯', color:'#F59E0B', barrier:'⭐⭐⭐⭐⭐' },
      { name:'封装测试', eg:'长电/华天', color:'#10B981', barrier:'⭐⭐⭐' },
      { name:'终端应用', eg:'手机/汽车', color:'#6366F1', barrier:'⭐⭐' },
    ];
    return `
      <div>
        <div style="font-size:12px;color:#64748B;margin-bottom:12px">半导体产业链全景（技术壁垒：⭐越多越难替代）</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${nodes.map((n,i) => `
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:28px;height:28px;border-radius:50%;background:${n.color};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i+1}</div>
              <div style="flex:1;background:#F8FAFC;border-radius:8px;padding:10px 12px;border-left:3px solid ${n.color}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:13px;font-weight:700">${n.name}</span>
                  <span style="font-size:11px;color:#94A3B8">${n.barrier}</span>
                </div>
                <div style="font-size:11px;color:#94A3B8;margin-top:2px">代表：${n.eg}</div>
              </div>
              ${i < nodes.length-1 ? '<div style="font-size:16px;color:#CBD5E1;flex-shrink:0">↓</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ---- Radar ----
  function buildRadar(ch) {
    const dims = [
      { label:'盈利能力', val:0.9 }, { label:'成长性', val:0.7 },
      { label:'护城河', val:0.85 }, { label:'商业模式', val:0.8 },
      { label:'管理团队', val:0.7 }, { label:'财务健康', val:0.9 },
      { label:'产业地位', val:0.85 }, { label:'估值合理', val:0.65 },
    ];
    const n = dims.length;
    const cx = 160, cy = 130, r = 100;
    const angles = dims.map((_, i) => (i * 2 * Math.PI / n) - Math.PI / 2);

    const gridLines = [0.25,0.5,0.75,1].map(f => {
      const pts = angles.map(a => `${cx + f*r*Math.cos(a)},${cy + f*r*Math.sin(a)}`).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="#E2E8F0" stroke-width="1"/>`;
    }).join('');

    const axisLines = angles.map(a =>
      `<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(a)}" y2="${cy+r*Math.sin(a)}" stroke="#E2E8F0" stroke-width="1"/>`
    ).join('');

    const valuePts = dims.map((d,i) =>
      `${cx + d.val*r*Math.cos(angles[i])},${cy + d.val*r*Math.sin(angles[i])}`
    ).join(' ');

    const labels = dims.map((d,i) => {
      const lx = cx + (r+18)*Math.cos(angles[i]);
      const ly = cy + (r+18)*Math.sin(angles[i]);
      return `<text x="${lx}" y="${ly}" font-size="10" fill="#64748B" text-anchor="middle" dominant-baseline="middle">${d.label}</text>`;
    }).join('');

    const scores = dims.map((d,i) => {
      const px = cx + d.val*r*Math.cos(angles[i]);
      const py = cy + d.val*r*Math.sin(angles[i]);
      return `<circle cx="${px}" cy="${py}" r="3" fill="#3B82F6"/>`;
    }).join('');

    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <div style="font-size:12px;color:#64748B">优质公司8维度体检雷达图（以茅台为示例）</div>
        <svg width="320" height="270" viewBox="0 0 320 270" style="max-width:100%">
          ${gridLines}
          ${axisLines}
          ${labels}
          <polygon points="${valuePts}" fill="rgba(59,130,246,0.2)" stroke="#3B82F6" stroke-width="2"/>
          ${scores}
        </svg>
        <div style="font-size:12px;color:#94A3B8">8个维度都强的公司极少存在，理解各维度的权重很重要</div>
      </div>
    `;
  }

  // ---- Moat Bars ----
  function buildMoatBars() {
    const companies = [
      { name:'茅台', dims:[{d:'品牌',v:98},{d:'渠道',v:85},{d:'产能限制',v:95},{d:'定价权',v:99}] },
      { name:'宁德时代', dims:[{d:'技术',v:88},{d:'规模',v:90},{d:'客户绑定',v:80},{d:'成本',v:85}] },
      { name:'普通公司', dims:[{d:'品牌',v:30},{d:'渠道',v:40},{d:'壁垒',v:25},{d:'定价权',v:20}] },
    ];

    return `
      <div>
        ${companies.map(co => `
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">${co.name}</div>
            ${co.dims.map(d => `
              <div class="moat-row" style="margin-bottom:6px">
                <div class="moat-label">${d.d}</div>
                <div class="moat-track">
                  <div class="moat-fill bar-anim" data-w="${d.v}" style="width:0%;background:${d.v>80?'#10B981':d.v>50?'#F59E0B':'#EF4444'}">${d.v}</div>
                </div>
                <div class="moat-score">${d.v}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- Dividend Calc ----
  function buildDividendCalc() {
    return `
      <div>
        <div style="font-size:12px;color:#64748B;margin-bottom:14px">股息率计算器（以长江电力为例）</div>
        <div class="calc-form">
          <div class="calc-row">
            <div class="calc-label">股票价格</div>
            <input class="calc-input" type="number" id="div-price" value="28" oninput="updateDividendCalc()">
            <span class="calc-unit">元</span>
          </div>
          <div class="calc-row">
            <div class="calc-label">每股年分红</div>
            <input class="calc-input" type="number" id="div-amount" value="1.2" step="0.1" oninput="updateDividendCalc()">
            <span class="calc-unit">元</span>
          </div>
          <div class="calc-row">
            <div class="calc-label">持股数量</div>
            <input class="calc-input" type="number" id="div-shares" value="1000" oninput="updateDividendCalc()">
            <span class="calc-unit">股</span>
          </div>
          <div class="calc-result" id="div-result">计算中…</div>
          <div style="font-size:12px;color:#94A3B8">💡 对比：2024年银行存款利率约1.5%，长江电力股息率约4.3%</div>
        </div>
      </div>
    `;
  }

  function updateDividendCalc() {
    const price = parseFloat(document.getElementById('div-price').value)||0;
    const div = parseFloat(document.getElementById('div-amount').value)||0;
    const shares = parseInt(document.getElementById('div-shares').value)||0;
    const rate = price > 0 ? (div/price*100).toFixed(2) : 0;
    const annual = (div * shares).toFixed(0);
    const el = document.getElementById('div-result');
    if (el) el.innerHTML = `📊 股息率：<strong>${rate}%</strong> · 每年分红：<strong>${annual}元</strong>（持有${shares}股）`;
  }

  // ---- Pig Cycle ----
  function buildPigCycle() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <canvas id="pig-canvas" width="380" height="160" style="max-width:100%"></canvas>
        <div style="display:flex;gap:16px;font-size:12px;color:#64748B;flex-wrap:wrap;justify-content:center">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:20px;height:3px;background:#EF4444;display:inline-block"></span>猪肉价格</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:20px;height:3px;background:#10B981;display:inline-block"></span>母猪存栏（领先指标）</span>
        </div>
        <div style="background:#FFFBEB;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E;width:100%">
          🐷 <strong>最佳买入点：</strong>猪价跌到最低、养猪户大亏损、母猪存栏大幅减少时 → 距离下一轮上涨通常只有6-12个月
        </div>
      </div>
    `;
  }

  function drawPigCycle() {
    const canvas = document.getElementById('pig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { l:40, r:20, t:20, b:30 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

    // Generate sine waves
    const pts = 100;
    ctx.clearRect(0,0,W,H);

    // Grid
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    for (let i=0;i<=4;i++) {
      const y = pad.t + (h/4)*i;
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    }

    // Price curve (sin wave)
    ctx.beginPath(); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2.5;
    for (let i=0;i<pts;i++) {
      const x = pad.l + (i/pts)*w;
      const y = pad.t + h/2 - Math.sin(i/pts*4*Math.PI)*h*0.38;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Sow inventory (leading by phase shift)
    ctx.beginPath(); ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2.5;
    for (let i=0;i<pts;i++) {
      const x = pad.l + (i/pts)*w;
      const y = pad.t + h/2 - Math.sin((i/pts*4*Math.PI) - 0.8)*h*0.28;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px sans-serif';
    ctx.fillText('高', pad.l-28, pad.t+8);
    ctx.fillText('低', pad.l-28, pad.t+h-2);
    ['2016','2018','2020','2022','2024'].forEach((y,i) => {
      ctx.fillText(y, pad.l + (i/4)*w - 12, H-5);
    });

    // Buy annotations
    ctx.fillStyle = '#3B82F6'; ctx.font = '10px sans-serif';
    ctx.fillText('💡买入', pad.l + w*0.22, pad.t+h*0.82);
    ctx.fillText('💡买入', pad.l + w*0.72, pad.t+h*0.82);
  }

  // ---- MA Tree ----
  function buildMATree() {
    return `
      <div style="overflow-x:auto">
        <div style="min-width:340px">
          <div style="text-align:center;margin-bottom:16px">
            <div style="display:inline-block;background:#3B82F6;color:white;border-radius:10px;padding:10px 20px;font-weight:700;font-size:14px">爱尔眼科总部<br><span style="font-size:11px;font-weight:400">品牌+技术+管理</span></div>
          </div>
          <div style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin-bottom:8px">
            ${['华北区', '华东区', '华南区', '西南区', '海外'].map(r => `
              <div style="background:#6366F1;color:white;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;text-align:center">
                ${r}<br><span style="font-size:10px;font-weight:400">区域中心</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap">
            ${['北京','上海','广州','成都','重庆','武汉','西安','深圳'].map(c => `
              <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:6px 10px;font-size:11px;color:#1E40AF;text-align:center">
                ${c}<br><span style="font-size:9px;color:#94A3B8">眼科医院</span>
              </div>
            `).join('')}
          </div>
          <div style="background:#FFFBEB;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E;margin-top:14px">
            ⚠️ <strong>商誉风险：</strong>收购溢价形成大量商誉，若被收购医院业绩不达标，商誉减值会让利润大幅下滑
          </div>
        </div>
      </div>
    `;
  }

  // ---- Growth vs PE ----
  function buildGrowthVsPE() {
    return `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#EFF6FF;border-radius:10px;padding:14px;border:1px solid #BFDBFE">
            <div style="font-size:12px;color:#1E40AF;font-weight:700;margin-bottom:8px">📊 估值（PE）</div>
            <div style="font-size:11px;color:#64748B;line-height:1.6">
              2021高峰：PE <strong>100x+</strong><br>
              2022-23低谷：PE <strong>20-25x</strong><br>
              2024回升：PE <strong>35-40x</strong>
            </div>
          </div>
          <div style="background:#ECFDF5;border-radius:10px;padding:14px;border:1px solid #A7F3D0">
            <div style="font-size:12px;color:#065F46;font-weight:700;margin-bottom:8px">📈 基本面</div>
            <div style="font-size:11px;color:#64748B;line-height:1.6">
              全球市占率：<strong>>35%</strong><br>
              收入增速：<strong>年均25%+</strong><br>
              盈利水平：<strong>持续提升</strong>
            </div>
          </div>
        </div>
        <div style="background:#F8FAFC;border-radius:10px;padding:14px">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">PEG计算示例</div>
          <div style="font-size:12px;color:#64748B;line-height:1.8">
            • 当PE=30，预期增速30%：PEG = 30÷30 = <span style="color:#10B981;font-weight:700">1.0 ✅合理</span><br>
            • 当PE=100，预期增速30%：PEG = 100÷30 = <span style="color:#EF4444;font-weight:700">3.3 ⚠️高估</span><br>
            • 当PE=20，预期增速30%：PEG = 20÷30 = <span style="color:#3B82F6;font-weight:700">0.67 💎低估</span>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Style Quiz ----
  function buildStyleQuiz() {
    const questions = [
      { q:'你有多少时间研究股票？', opts:[{t:'每天2小时以上',s:2},{t:'每周看看',s:1},{t:'几乎没时间',s:0}] },
      { q:'你能接受多大的亏损？', opts:[{t:'亏30%也能拿住',s:2},{t:'亏15%开始不安',s:1},{t:'亏5%就想卖',s:0}] },
      { q:'你更关注什么？', opts:[{t:'公司基本面',s:2},{t:'市场趋势',s:1},{t:'稳定分红',s:0}] },
    ];

    const styles = [
      { name:'价值投资者', icon:'🏛️', desc:'适合深度研究+长期持有，找低估的好公司' },
      { name:'趋势交易者', icon:'⚡', desc:'顺势而为，注重技术面和动量，严格止损' },
      { name:'指数定投者', icon:'🎯', desc:'最适合普通人：买ETF长期定投，简单省力' },
    ];

    return `
      <div class="style-quiz" id="sq-wrap">
        <div style="font-size:13px;color:#64748B;margin-bottom:8px">快速测试：找到适合你的投资风格</div>
        ${questions.map((q,qi) => `
          <div style="margin-bottom:12px">
            <div class="sq-question">Q${qi+1}. ${q.q}</div>
            <div class="sq-options">
              ${q.opts.map((o,oi) => `
                <div class="sq-opt" onclick="selectSQ(${qi},${oi},${o.s},this)">${o.t}</div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <div class="sq-result" id="sq-result">🎉 测试结果：<span id="sq-result-text"></span></div>
      </div>
      <script>
        window._sqScores = [null,null,null];
        function selectSQ(qi, oi, score, el) {
          const wrap = el.closest('.sq-options');
          wrap.querySelectorAll('.sq-opt').forEach(e => e.classList.remove('selected'));
          el.classList.add('selected');
          window._sqScores[qi] = score;
          if (window._sqScores.every(s => s !== null)) {
            const total = window._sqScores.reduce((a,b)=>a+b,0);
            const styles = [
              {name:'指数定投者 🎯', desc:'最适合你：买沪深300ETF，每月定投，省心高效'},
              {name:'趋势交易者 ⚡', desc:'适合你：顺势而为，注重市场动量，严格止损'},
              {name:'价值投资者 🏛️', desc:'适合你：深度研究基本面，长期持有低估优质公司'},
            ];
            const idx = total <= 2 ? 0 : total <= 4 ? 1 : 2;
            document.getElementById('sq-result-text').textContent = styles[idx].name + ' — ' + styles[idx].desc;
            document.getElementById('sq-result').classList.add('show');
          }
        }
      <\/script>
    `;
  }

  // ---- IPO Sim ----
  function buildIPOSim() {
    return `
      <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px">
        <div style="font-size:13px;color:#64748B">模拟打新申请：看看你能中签吗？</div>
        <div style="background:#F8FAFC;border-radius:12px;padding:20px 40px;width:100%">
          <div style="font-size:13px;color:#475569;margin-bottom:12px">新股：<strong>某科技公司</strong> · 发行价：28.5元 · 申购上限：1000股</div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
            <div style="background:#EFF6FF;border-radius:8px;padding:10px 16px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#3B82F6" id="ipo-ratio">0.02%</div>
              <div style="font-size:11px;color:#64748B">中签率</div>
            </div>
            <div style="background:#ECFDF5;border-radius:8px;padding:10px 16px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#10B981" id="ipo-gain">+44%</div>
              <div style="font-size:11px;color:#64748B">首日平均涨幅</div>
            </div>
            <div style="background:#FFFBEB;border-radius:8px;padding:10px 16px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#F59E0B" id="ipo-profit">+1254元</div>
              <div style="font-size:11px;color:#64748B">预计每签获利</div>
            </div>
          </div>
          <div id="ipo-result" style="font-size:28px;margin-bottom:8px;min-height:40px"></div>
          <button class="btn-primary" onclick="runIPOSim()" style="font-size:15px;padding:12px 32px">🎰 申购！</button>
        </div>
        <div style="font-size:12px;color:#94A3B8">持有市值越多，获得的签数越多，中签概率越高</div>
      </div>
      <script>
        function runIPOSim() {
          const el = document.getElementById('ipo-result');
          el.textContent = '🎲🎲🎲';
          setTimeout(() => {
            const win = Math.random() < 0.15;
            el.textContent = win ? '🎉 恭喜！中签了！' : '😅 未中签，继续申购下一只';
            el.style.color = win ? '#10B981' : '#94A3B8';
          }, 800);
        }
      <\/script>
    `;
  }

  // ---- ETF Basket ----
  function buildETFBasket() {
    const slices = [
      { name:'金融', pct:25, color:'#3B82F6' }, { name:'科技', pct:20, color:'#8B5CF6' },
      { name:'消费', pct:18, color:'#10B981' }, { name:'工业', pct:15, color:'#F59E0B' },
      { name:'医药', pct:12, color:'#EF4444' }, { name:'其他', pct:10, color:'#94A3B8' },
    ];

    let total = 0;
    const paths = slices.map(s => {
      const start = total / 100 * 2 * Math.PI - Math.PI/2;
      total += s.pct;
      const end = total / 100 * 2 * Math.PI - Math.PI/2;
      const r = 70, cx = 80, cy = 80;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const large = s.pct > 50 ? 1 : 0;
      return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${s.color}" opacity="0.85"/>`;
    }).join('');

    return `
      <div class="etf-basket">
        <svg width="160" height="160" viewBox="0 0 160 160" class="etf-basket-svg">${paths}</svg>
        <div class="etf-legend">
          ${slices.map(s => `
            <div class="etf-legend-item">
              <div class="etf-legend-dot" style="background:${s.color}"></div>
              <span>${s.name} ${s.pct}%</span>
            </div>
          `).join('')}
        </div>
        <div style="font-size:12px;color:#64748B;max-width:160px">
          <div style="font-weight:700;margin-bottom:6px">沪深300ETF核心优势</div>
          <div>✅ 费率0.1%/年</div>
          <div>✅ 持有300只股票</div>
          <div>✅ 自动换入优质公司</div>
          <div>✅ 随时买卖</div>
        </div>
      </div>
    `;
  }

  // ---- Convertible Payoff ----
  function buildConvertiblePayoff() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <canvas id="conv-canvas" width="380" height="180" style="max-width:100%"></canvas>
        <div style="display:flex;gap:16px;font-size:12px;color:#64748B">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:20px;height:3px;background:#3B82F6;display:inline-block"></span>可转债收益</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:20px;height:3px;background:#10B981;stroke-dasharray:4,2;display:inline-block"></span>纯股票</span>
        </div>
        <div style="font-size:12px;color:#64748B;text-align:center">可转债：股价跌时"债底"保护，股价涨时跟随上涨</div>
      </div>
    `;
  }

  function drawConvertiblePayoff() {
    const canvas = document.getElementById('conv-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { l:50, r:20, t:20, b:35 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;
    ctx.clearRect(0,0,W,H);

    // Axes
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t+h*0.6); ctx.lineTo(W-pad.r, pad.t+h*0.6); ctx.stroke();

    // Stock price range: 40 to 200 (baseline 100)
    const pts = 80;
    const baseY = pad.t + h * 0.6;

    // Convertible bond line (kinked)
    ctx.beginPath(); ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 3;
    for (let i=0; i<pts; i++) {
      const price = 40 + (i/pts)*160; // 40-200
      const bondVal = Math.max(95, Math.min(95 + (price - 100)*0.9, price - 5));
      const y = baseY - ((bondVal - 100)/100)*h*0.5;
      const x = pad.l + (i/pts)*w;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Stock line
    ctx.beginPath(); ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.setLineDash([5,3]);
    for (let i=0; i<pts; i++) {
      const price = 40 + (i/pts)*160;
      const y = baseY - ((price - 100)/100)*h*0.5;
      const x = pad.l + (i/pts)*w;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px sans-serif';
    ctx.fillText('收益率', pad.l-48, pad.t+20);
    ctx.fillText('股价 →', pad.l+w-20, pad.t+h*0.6+18);
    ctx.fillText('0%', pad.l-20, pad.t+h*0.6+4);
    ctx.fillText('+50%', pad.l-28, pad.t+14);
    ctx.fillText('-30%', pad.l-28, pad.t+h-4);
    ctx.fillStyle = '#3B82F6'; ctx.font = '10px sans-serif';
    ctx.fillText('债底保护 →', pad.l+8, pad.t+h*0.9);
  }

  // ---- Rate Calendar ----
  function buildRateCalendar() {
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const rates = [2.0, 1.8, 3.5, 2.2, 2.0, 3.8, 2.1, 2.0, 4.2, 2.3, 2.1, 6.5];
    const maxRate = Math.max(...rates);

    const getColor = (r) => {
      const t = r / maxRate;
      if (t > 0.8) return '#1D4ED8';
      if (t > 0.6) return '#3B82F6';
      if (t > 0.4) return '#93C5FD';
      if (t > 0.2) return '#BFDBFE';
      return '#EFF6FF';
    };

    return `
      <div>
        <div style="font-size:12px;color:#64748B;margin-bottom:12px">国债逆回购（GC001）年化收益率月度分布（颜色越深=利率越高）</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${months.map((m,i) => `
            <div style="background:${getColor(rates[i])};border-radius:8px;padding:10px;text-align:center;cursor:default" title="平均约${rates[i]}%">
              <div style="font-size:11px;color:${rates[i]>3?'white':'#1E40AF'};font-weight:700">${m}</div>
              <div style="font-size:16px;font-weight:800;color:${rates[i]>3?'white':'#1E40AF'}">${rates[i]}%</div>
              ${rates[i]>=3.5?`<div style="font-size:9px;color:${rates[i]>3?'white':'#1E40AF'}">⭐最佳</div>`:''}
            </div>
          `).join('')}
        </div>
        <div style="background:#FFFBEB;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E;margin-top:12px">
          💡 3月末、6月末、9月末、12月末是银行考核节点，资金需求激增，利率通常飙至4-8%甚至更高
        </div>
      </div>
    `;
  }

  // ---- Options Payoff ----
  function buildOptionsPayoff() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <canvas id="opt-canvas" width="380" height="200" style="max-width:100%"></canvas>
        <div style="display:flex;gap:16px;font-size:12px;flex-wrap:wrap;justify-content:center">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:#3B82F6;display:inline-block"></span>买入认购（Call）</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:#10B981;display:inline-block"></span>买入认沽（Put）</span>
        </div>
        <div style="font-size:12px;color:#64748B;text-align:center">买方最大亏损=权利金，但潜在收益无限（认购）</div>
      </div>
    `;
  }

  function drawOptionsPayoff() {
    const canvas = document.getElementById('opt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { l:50, r:20, t:20, b:35 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;
    ctx.clearRect(0,0,W,H);

    const strike = 100, premium = 8;
    const prices = Array.from({length:100}, (_,i) => 60 + i*1.2);
    const baseY = pad.t + h * 0.6;
    const scale = h / 100;

    // Axes
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(W-pad.r, baseY); ctx.stroke();

    // Call payoff
    ctx.beginPath(); ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 3;
    prices.forEach((p,i) => {
      const pnl = Math.max(p - strike, 0) - premium;
      const x = pad.l + (i/prices.length)*w;
      const y = baseY - pnl * scale;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Put payoff
    ctx.beginPath(); ctx.strokeStyle = '#10B981'; ctx.lineWidth = 3;
    prices.forEach((p,i) => {
      const pnl = Math.max(strike - p, 0) - premium;
      const x = pad.l + (i/prices.length)*w;
      const y = baseY - pnl * scale;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px sans-serif';
    ctx.fillText('盈亏', pad.l-36, pad.t+16);
    ctx.fillText('0', pad.l-14, baseY+4);
    ctx.fillText('股价', W-pad.r-18, baseY+16);
    ctx.fillStyle = '#EF4444'; ctx.font = '9px sans-serif';
    ctx.fillText(`-${premium}元`, pad.l+4, baseY+16);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`执行价${strike}`, pad.l + (40/120)*w-10, pad.t+h-4);
    ctx.fillText('60', pad.l+2, pad.t+h-4);
    ctx.fillText('178', pad.l+w-12, pad.t+h-4);
  }

  // ====== HELPERS ======
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleFeynmanHint(el) {
    const hint = el.nextElementSibling;
    if (hint) {
      const showing = hint.style.display !== 'none';
      hint.style.display = showing ? 'none' : 'block';
      el.innerHTML = showing ? '<span>💬</span> 点击查看提示' : '<span>👆</span> 隐藏提示';
    }
  }

  function answerPredict(cardId, chosen, correct, chId, idx) {
    const optsEl = document.getElementById(`${cardId}-opts`);
    const revealEl = document.getElementById(`${cardId}-reveal`);
    if (!optsEl || optsEl.classList.contains('answered')) return;

    optsEl.classList.add('answered');
    const opts = optsEl.querySelectorAll('.predict-opt');
    opts.forEach((el, j) => {
      el.classList.add('disabled');
      if (j === chosen)   el.classList.add(chosen === correct ? 'correct' : 'wrong');
      if (j === correct && chosen !== correct) el.classList.add('reveal-correct');
    });

    revealEl.classList.remove('hidden');
    revealEl.classList.add('fade-in');
  }

  // ====== PUBLIC API ======
  return { init, navigate, selectAnswer, nextQuestion, retakeQuiz, closeModal, toggleSidebar, closeSidebar, showWelcome, answerPredict, showQuadDetail, showPolicyEvent, indFlip, indGuess, indNext, indVerdictGuess, indReplay, oddsPick, oddsNext, oddsReplay, evPick, evNext, evReplay, cyclePick, cycleNext, cycleReplay, compoundPick, compoundNext, compoundReplay, psychPick, psychNext, psychReplay };
})();

// Expose helpers to global scope for inline onclick
window.scrollToSection = App.scrollToSection || function(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};
window.toggleFeynmanHint = function(el) {
  const hint = el.nextElementSibling;
  if (hint) {
    const showing = hint.style.display !== 'none';
    hint.style.display = showing ? 'none' : 'block';
    el.innerHTML = showing ? '<span>💬</span> 点击查看提示' : '<span>👆</span> 隐藏提示';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
