/* 分析基盤キャッチアップ — app logic (vanilla JS SPA) */
(() => {
  'use strict';

  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');

  /* ---------- progress store ---------- */
  const STORE_KEY = 'acu-progress-v1';
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { read: {}, quiz: {} }; }
      catch { return { read: {}, quiz: {} }; }
    },
    save(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); },
    markRead(day) { const d = this.load(); d.read[day] = true; this.save(d); },
    saveQuiz(day, score, total) {
      const d = this.load();
      const prev = d.quiz[day];
      if (!prev || score > prev.score) d.quiz[day] = { score, total, ts: Date.now() };
      d.read[day] = true;
      this.save(d);
    },
  };

  /* ---------- mini markdown ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  function md(text) {
    const blocks = String(text || '').trim().split(/\n{2,}/);
    return blocks.map((b) => {
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*-\s+/.test(l))) {
        return '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ''))}</li>`).join('') + '</ul>';
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }

  /* ---------- helpers ---------- */
  const dayData = (n) => CURRICULUM.find((d) => d.day === n);

  function dayStatus(n) {
    const p = store.load();
    const q = p.quiz[n];
    if (q) return { cls: q.score === q.total ? 'ok' : 'doing', label: q.score === q.total ? '満点' : `クイズ ${q.score}/${q.total}`, done: true };
    if (p.read[n]) return { cls: 'doing', label: '読了', done: false };
    return { cls: 'todo', label: '未読', done: false };
  }

  function progressPct() {
    const p = store.load();
    let pts = 0;
    CURRICULUM.forEach((d) => {
      if (p.read[d.day]) pts += 0.5;
      if (p.quiz[d.day]) pts += 0.5;
    });
    return Math.round((pts / CURRICULUM.length) * 100);
  }

  /* ---------- views ---------- */
  function renderHome() {
    const pct = progressPct();
    const R = 36, C = 2 * Math.PI * R;
    const cards = CURRICULUM.map((d) => {
      const st = dayStatus(d.day);
      return `
      <a class="day-card ${st.done ? 'done' : ''}" href="#day/${d.day}">
        <div class="day-num"><span class="d">DAY</span><span class="n">${d.day}</span></div>
        <div class="day-info">
          <h3>${esc(d.content.title)}</h3>
          <p>${esc(d.content.subtitle)}</p>
        </div>
        <div class="day-meta">
          <span class="chip ${st.cls}">${st.label}</span>
          <span class="min">約${d.content.estMinutes}分</span>
        </div>
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>
      </a>`;
    }).join('');

    view.innerHTML = `
      <h1 class="page-title">分析基盤キャッチアップ</h1>
      <p class="page-sub">マルチエージェント分析基盤を7日で理解する</p>
      <div class="hero">
        <div class="ring">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle class="track" cx="42" cy="42" r="${R}" fill="none" stroke-width="8"/>
            <circle class="bar" cx="42" cy="42" r="${R}" fill="none" stroke-width="8"
              stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
          </svg>
          <span class="pct">${pct}%</span>
        </div>
        <div class="hero-text">
          <h2>${pct === 100 ? '全課程コンプリート🎉' : pct === 0 ? 'ようこそ!' : 'いいペースです'}</h2>
          <p>${pct === 100 ? 'Day 7の質問リストを持ってプロジェクトに臨みましょう。' : '各日を読んでクイズに挑戦すると進捗が貯まります。通勤時間にどうぞ。'}</p>
        </div>
      </div>
      ${cards}`;
  }

  function renderLesson(n) {
    const d = dayData(n);
    if (!d) { location.hash = '#home'; return; }
    const secs = d.content.sections.map((s) => `
      <section class="card section">
        <h2>${esc(s.heading)}</h2>
        <div class="body">${md(s.body)}</div>
        <div class="keypoints">
          <div class="kp-title">この節のポイント</div>
          <ul>${s.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
        </div>
      </section>`).join('');

    view.innerHTML = `
      <div class="lesson-head">
        <a class="backlink" href="#home">‹ 一覧へ</a>
        <div class="lesson-day">DAY ${d.day} ・ 約${d.content.estMinutes}分</div>
        <h1 class="lesson-title">${esc(d.content.title)}</h1>
        <p class="lesson-sub">${esc(d.content.subtitle)}</p>
      </div>
      ${secs}
      <div class="lesson-actions">
        <button class="btn" id="go-quiz">理解度クイズに挑戦(${d.content.quiz.length}問)</button>
        ${n < CURRICULUM.length ? `<a class="btn secondary" href="#day/${n + 1}">Day ${n + 1} へ進む</a>` : ''}
      </div>`;
    document.getElementById('go-quiz').addEventListener('click', () => {
      store.markRead(n);
      location.hash = `#quiz/${n}`;
    });
    window.scrollTo(0, 0);
  }

  /* ---------- quiz ---------- */
  let quizState = null;

  function renderQuiz(n) {
    const d = dayData(n);
    if (!d) { location.hash = '#home'; return; }
    if (!quizState || quizState.day !== n) {
      quizState = { day: n, idx: 0, answers: [], picked: null };
    }
    const qs = d.content.quiz;
    const st = quizState;

    if (st.idx >= qs.length) return renderQuizResult(d);

    const q = qs[st.idx];
    const answered = st.picked !== null;
    const bars = qs.map((_, i) => {
      if (i < st.idx) return `<span class="${st.answers[i] ? 'hit' : 'miss'}"></span>`;
      if (i === st.idx) return '<span class="now"></span>';
      return '<span></span>';
    }).join('');

    const choices = q.choices.map((c, i) => {
      let cls = 'choice';
      if (answered) {
        if (i === st.picked) cls += st.picked === q.answer ? ' sel-ok' : ' sel-bad';
        else if (i === q.answer) cls += ' reveal';
      }
      return `<button class="${cls}" data-i="${i}" ${answered ? 'disabled' : ''}>
        <span class="mark">${'ABCD'[i]}</span><span>${esc(c)}</span>
      </button>`;
    }).join('');

    const explain = answered ? `
      <div class="explain ${st.picked === q.answer ? 'good' : 'bad'}">
        <div class="verdict">${st.picked === q.answer ? '正解!' : `不正解… 正解は ${'ABCD'[q.answer]}`}</div>
        ${esc(q.explanation)}
      </div>
      <button class="btn" id="next-q">${st.idx === qs.length - 1 ? '結果を見る' : '次の問題へ'}</button>` : '';

    view.innerHTML = `
      <a class="backlink" href="#day/${n}">‹ Day ${n} に戻る</a>
      <div class="lesson-day">DAY ${n} クイズ ・ 第${st.idx + 1}問 / 全${qs.length}問</div>
      <div class="quiz-progress">${bars}</div>
      <div class="quiz-q">${esc(q.q)}</div>
      ${choices}
      ${explain}`;

    if (!answered) {
      view.querySelectorAll('.choice').forEach((btn) => {
        btn.addEventListener('click', () => {
          st.picked = Number(btn.dataset.i);
          st.answers[st.idx] = st.picked === q.answer;
          renderQuiz(n);
        });
      });
    } else {
      document.getElementById('next-q').addEventListener('click', () => {
        st.idx += 1; st.picked = null;
        renderQuiz(n);
        window.scrollTo(0, 0);
      });
    }
  }

  function renderQuizResult(d) {
    const st = quizState;
    const score = st.answers.filter(Boolean).length;
    const total = d.content.quiz.length;
    store.saveQuiz(d.day, score, total);
    const msg = score === total ? '完璧です!次の日に進みましょう。'
      : score >= Math.ceil(total * 0.6) ? '合格ライン!間違えた問題だけ本文を見直しましょう。'
      : 'もう一度本文を読んでから再挑戦がおすすめです。';
    view.innerHTML = `
      <div class="quiz-result">
        <div class="lesson-day">DAY ${d.day} クイズ結果</div>
        <div class="big">${score} <span style="font-size:22px;color:var(--text-3)">/ ${total}</span></div>
        <p class="msg">${msg}</p>
        <div class="lesson-actions">
          <button class="btn secondary" id="retry">もう一度挑戦</button>
          ${d.day < CURRICULUM.length
            ? `<a class="btn" href="#day/${d.day + 1}">Day ${d.day + 1} へ進む</a>`
            : '<a class="btn" href="#home">ホームへ戻る</a>'}
        </div>
      </div>`;
    document.getElementById('retry').addEventListener('click', () => {
      quizState = { day: d.day, idx: 0, answers: [], picked: null };
      renderQuiz(d.day);
    });
  }

  /* ---------- architecture ---------- */
  const ARCH_NODES = {
    human: {
      name: '人間(あなた)', role: '監督・レビュー',
      desc: 'エージェントに目標を与え、重要な判断や成果物のレビューを行います。自律化しても「human-in-the-loop(人間の関与)」は品質と安全のために残すのが定石です。',
      rel: 'プロジェクトでは、これまで人間が各フェーズでAIに指示していた部分を、目標の設定とレビューに集約していきます。',
    },
    orch: {
      name: 'オーケストレータ', role: 'タスク分解・進行管理',
      desc: '分析の目標を受け取り、フェーズごとのタスクに分解して実行エージェントに割り当てます。結果を検証し、失敗時のリトライや次タスクへの引き継ぎも担います。',
      rel: 'このプロジェクトの心臓部。「人間がフェーズごとに指示していた判断」をこの層が肩代わりします。',
    },
    codex: {
      name: 'Codex', role: '実行エージェント(コード生成・実行)',
      desc: 'OpenAIのコーディングエージェント。指示を受けてコードを書き、実行し、結果を確認して修正するループを自律的に回します。分析ではSQLやPython、API呼び出しコードを生成・実行します。',
      rel: 'オーケストレータから受けたタスクを、DataikuのAPI呼び出しやSparkジョブとして具体化する働き手です。',
    },
    dataiku: {
      name: 'Dataiku', role: '分析プラットフォーム',
      desc: 'データの前処理から機械学習・デプロイまでを一つのフロー(Flow)で管理するプラットフォーム。GUI操作に加えAPIでも操作でき、処理はSnowflakeやSparkにプッシュダウンできます。',
      rel: 'エージェントがAPIで分析フローを構築・実行する舞台。人間もGUIで途中経過を確認できるのが利点です。',
    },
    spark: {
      name: 'Apache Spark', role: '分散処理エンジン',
      desc: '1台で処理しきれない大規模データを、複数マシンのクラスタで並列処理するエンジン。DataFrame APIで大量データの加工・集計・機械学習の前処理を行います。',
      rel: 'Dataikuのレシピ実行エンジンとして、またはCodexが生成したPySparkジョブとして大規模処理を担います。',
    },
    snowflake: {
      name: 'Snowflake', role: 'クラウドDWH(データ層)',
      desc: '分析用データの保管庫。ストレージとコンピュートが分離しており、必要なときだけ仮想ウェアハウスを起動してSQLを実行します。全ツールがここのデータを参照します。',
      rel: '分析対象のデータはすべてここに集まります。DataikuやSparkはSnowflakeに接続し、可能な処理はSnowflake側で実行(プッシュダウン)します。',
    },
  };

  function renderArch() {
    view.innerHTML = `
      <h1 class="page-title">アーキテクチャ図</h1>
      <p class="page-sub">ノードをタップすると役割を表示します</p>
      <div class="arch-wrap">
        <svg viewBox="0 0 340 470" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 z" fill="currentColor" style="color:var(--text-3)"/>
            </marker>
          </defs>
          <text class="arch-lane" x="10" y="10">監督</text>
          <text class="arch-lane" x="10" y="74">司令塔</text>
          <text class="arch-lane" x="10" y="164">実行エージェント</text>
          <text class="arch-lane" x="10" y="264">ツール層</text>
          <text class="arch-lane" x="10" y="374">データ層</text>

          <path class="arch-edge" d="M170 52 V 78"/>
          <path class="arch-edge" d="M170 142 V 168"/>
          <path class="arch-edge" d="M120 232 L 95 268"/>
          <path class="arch-edge" d="M220 232 L 245 268"/>
          <path class="arch-edge" d="M95 342 L 145 378"/>
          <path class="arch-edge" d="M245 342 L 195 378"/>
          <path class="arch-edge" d="M152 305 H 188" stroke-dasharray="4 4"/>

          <g class="arch-node" data-node="human">
            <rect x="95" y="14" width="150" height="38" rx="10"/>
            <text x="170" y="38" text-anchor="middle" font-size="14">人間(監督)</text>
          </g>
          <g class="arch-node" data-node="orch">
            <rect x="60" y="80" width="220" height="62" rx="12"/>
            <text x="170" y="106" text-anchor="middle" font-size="14">オーケストレータ</text>
            <text class="sub" x="170" y="126" text-anchor="middle" font-size="10.5">タスク分解・割り当て・結果統合</text>
          </g>
          <g class="arch-node" data-node="codex">
            <rect x="60" y="170" width="220" height="62" rx="12"/>
            <text x="170" y="196" text-anchor="middle" font-size="14">Codex</text>
            <text class="sub" x="170" y="216" text-anchor="middle" font-size="10.5">コード生成・実行・修正ループ</text>
          </g>
          <g class="arch-node" data-node="dataiku">
            <rect x="20" y="270" width="132" height="72" rx="12"/>
            <text x="86" y="300" text-anchor="middle" font-size="13.5">Dataiku</text>
            <text class="sub" x="86" y="320" text-anchor="middle" font-size="10">分析フロー / AutoML</text>
          </g>
          <g class="arch-node" data-node="spark">
            <rect x="188" y="270" width="132" height="72" rx="12"/>
            <text x="254" y="300" text-anchor="middle" font-size="13.5">Apache Spark</text>
            <text class="sub" x="254" y="320" text-anchor="middle" font-size="10">大規模分散処理</text>
          </g>
          <g class="arch-node" data-node="snowflake">
            <rect x="60" y="380" width="220" height="62" rx="12"/>
            <text x="170" y="406" text-anchor="middle" font-size="14">Snowflake</text>
            <text class="sub" x="170" y="426" text-anchor="middle" font-size="10.5">クラウドDWH・全データの置き場</text>
          </g>
        </svg>
      </div>
      <div class="card arch-detail" id="arch-detail">
        <h3>ノードをタップ</h3>
        <p>上の図の各要素をタップすると、役割とプロジェクトでの位置づけを表示します。矢印は「呼び出し・データの流れ」、点線は「DataikuがSparkを実行エンジンとして使える」ことを表します。</p>
      </div>`;

    view.querySelectorAll('.arch-node').forEach((node) => {
      node.addEventListener('click', () => {
        view.querySelectorAll('.arch-node').forEach((x) => x.classList.remove('active'));
        node.classList.add('active');
        const info = ARCH_NODES[node.dataset.node];
        document.getElementById('arch-detail').innerHTML = `
          <h3>${esc(info.name)} <span style="font-size:12px;color:var(--text-2);font-weight:600">— ${esc(info.role)}</span></h3>
          <p>${esc(info.desc)}</p>
          <div class="rel"><strong>あなたのプロジェクトでは:</strong> ${esc(info.rel)}</div>`;
      });
    });
  }

  /* ---------- glossary ---------- */
  function renderGlossary() {
    const all = CURRICULUM.flatMap((d) =>
      d.content.glossary.map((g) => ({ ...g, day: d.day }))
    ).sort((a, b) => a.term.localeCompare(b.term, 'ja'));

    view.innerHTML = `
      <h1 class="page-title">用語集</h1>
      <p class="page-sub">全${all.length}語 ・ タップ元のDayも表示</p>
      <input class="search" id="gsearch" type="search" placeholder="用語を検索…" autocomplete="off">
      <div class="card" id="glist"></div>`;

    const list = document.getElementById('glist');
    const draw = (q) => {
      const hits = all.filter((g) =>
        !q || g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q));
      list.innerHTML = hits.length
        ? hits.map((g) => `
          <div class="term">
            <h3>${esc(g.term)}<a class="src" href="#day/${g.day}">Day ${g.day}</a></h3>
            <p>${esc(g.def)}</p>
          </div>`).join('')
        : '<div class="empty">該当する用語がありません</div>';
    };
    draw('');
    document.getElementById('gsearch').addEventListener('input', (e) => draw(e.target.value.trim().toLowerCase()));
  }

  /* ---------- router ---------- */
  function route() {
    const hash = location.hash || '#home';
    const [path, arg] = hash.slice(1).split('/');
    const n = Number(arg);

    let tab = 'home';
    if (path === 'day' && dayData(n)) renderLesson(n);
    else if (path === 'quiz' && dayData(n)) {
      if (!quizState || quizState.day !== n) quizState = { day: n, idx: 0, answers: [], picked: null };
      renderQuiz(n);
    }
    else if (path === 'arch') { tab = 'arch'; renderArch(); }
    else if (path === 'glossary') { tab = 'glossary'; renderGlossary(); }
    else renderHome();

    tabbar.querySelectorAll('.tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.tab === tab));
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
