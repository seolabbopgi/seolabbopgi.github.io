/** SOOP(SOOP) 별풍선 연동 — bbopgi 방식 WebSocket 중계 */
const SoopBridge = (() => {
  const SOOP_KEY = 'yuseola-soop-v1';
  const CREDIT_TTL_MS = 30000;

  let ws = null;
  let want = false;
  let reconTimer = null;
  let pingTimer = null;
  let toastTimer = null;
  let state = 'off';

  const credits = {};
  const lastChats = {};
  const RECENT_CHAT_MS = 5000;

  let onAutoPull = null;

  const el = {};
  function $(id) { return document.getElementById(id); }

  function defaultRelay() {
    const h = location.hostname.replace(/^www\./, '');
    if (h === 'seolabbopgi.com') return 'wss://relay.seolabbopgi.com';
    if (h === 'seolabbopgi.github.io') return 'wss://relay.hedasong.com';
    if (h && h !== 'localhost' && h !== '127.0.0.1') return `wss://relay.${h}`;
    return 'wss://relay.hedasong.com';
  }

  function currentCfg() {
    return {
      op: 'config',
      bjid: (el.bjid()?.value || '').trim(),
      unit: Math.max(1, parseInt(el.unit()?.value, 10) || 100),
      inc_balloon: el.bal()?.checked ?? true,
      inc_adballoon: el.ad()?.checked ?? true,
      inc_challenge: el.ch()?.checked ?? true,
      inc_battle: el.bt()?.checked ?? true,
    };
  }

  function saveCfg() {
    const c = { ...currentCfg(), relay: (el.relay()?.value || '').trim() };
    try { localStorage.setItem(SOOP_KEY, JSON.stringify(c)); } catch (_) { /* ignore */ }
  }

  function loadCfg() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(SOOP_KEY) || '{}'); } catch (_) { /* ignore */ }
    if (c.bjid && el.bjid()) el.bjid().value = c.bjid;
    if (el.unit()) el.unit().value = c.unit || 100;
    if (el.relay()) el.relay().value = c.relay || defaultRelay();
    if (el.bal()) el.bal().checked = c.inc_balloon !== false;
    if (el.ad()) el.ad().checked = c.inc_adballoon !== false;
    if (el.ch()) el.ch().checked = c.inc_challenge !== false;
    if (el.bt()) el.bt().checked = c.inc_battle !== false;
  }

  function setStatus(msg) {
    if (el.status()) el.status().textContent = msg;
  }

  function setChip(st, text) {
    state = st;
    const chip = el.chip();
    if (!chip) return;
    chip.classList.toggle('on', st === 'on');
    chip.classList.toggle('connecting', st === 'connecting');
    if (el.chipText()) el.chipText().textContent = text;
  }

  function toast(msg, ok) {
    const t = el.toast();
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('ok', !!ok);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function armCreditTimer(id) {
    const c = credits[id];
    if (!c) return;
    if (c._t) clearTimeout(c._t);
    c._t = setTimeout(() => {
      delete credits[id];
      renderCredits();
    }, CREDIT_TTL_MS);
  }

  function renderCredits() {
    const list = el.creditList();
    if (!list) return;
    list.innerHTML = '';
    Object.entries(credits).forEach(([id, c]) => {
      if (c.n <= 0) {
        if (c._t) clearTimeout(c._t);
        delete credits[id];
        return;
      }
      const row = document.createElement('div');
      row.className = 'credit-row';
      row.innerHTML = `<b>${esc(c.nick)}</b><span>뽑기 ${c.n}회 · 채팅: 1 / 10 / 20</span>`;
      const x = document.createElement('button');
      x.className = 'credit-x';
      x.textContent = '✕';
      x.addEventListener('click', () => {
        if (c._t) clearTimeout(c._t);
        delete credits[id];
        renderCredits();
      });
      row.appendChild(x);
      list.appendChild(row);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function pushConfig() {
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(currentCfg())); } catch (_) { /* ignore */ }
    }
  }

  function disconnect() {
    want = false;
    clearTimeout(reconTimer);
    clearInterval(pingTimer);
    try { ws?.close(); } catch (_) { /* ignore */ }
    ws = null;
    setChip('off', '숲 연동 꺼짐');
    setStatus('연동 해제됨');
    if (el.connectBtn()) {
      el.connectBtn().textContent = '연동 시작';
      el.connectBtn().classList.remove('stop');
    }
  }

  function connect() {
    const cfg = currentCfg();
    const relay = (el.relay()?.value || '').trim() || defaultRelay();
    if (!cfg.bjid) {
      setStatus('⚠ 스트리머 ID를 입력해 주세요. (테스트: demo)');
      el.bjid()?.focus();
      return;
    }
    if (!relay) {
      setStatus('⚠ 중계 서버 주소를 입력해 주세요.');
      return;
    }
    saveCfg();
    want = true;
    if (el.connectBtn()) {
      el.connectBtn().textContent = '연동 중지';
      el.connectBtn().classList.add('stop');
    }
    openSocket(relay);
  }

  function openSocket(relay) {
    if (!want) return;
    setChip('connecting', '중계 서버 연결 중...');
    setStatus('중계 서버에 연결하는 중...');

    let socket;
    try { socket = new WebSocket(relay); } catch (e) {
      setStatus('⚠ 서버 주소 오류: ' + relay);
      return;
    }
    ws = socket;

    socket.onopen = () => {
      setChip('connecting', '방송 접속 대기 중');
      setStatus('✔ 서버 연결됨. 방송 접속 중...');
      socket.send(JSON.stringify(currentCfg()));
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try { socket.send(JSON.stringify({ op: 'ping' })); } catch (_) { /* ignore */ }
      }, 30000);
    };

    socket.onmessage = (ev) => {
      let d;
      try { d = JSON.parse(ev.data); } catch (_) { return; }
      if (d.op === 'pong') return;

      if (d.type === 'status') {
        if (d.connected) {
          setChip('on', '숲 연동 중');
          setStatus(`✔ 방송 연동 · ${d.title || ''}`);
          toast('숲 방송에 연결됐어요!', true);
        } else {
          setChip('connecting', '방송 대기 중');
          setStatus('서버 연결됨. 방송 접속 대기...');
        }
      } else if (d.type === 'status_msg') {
        setStatus(d.message || '');
      } else if (d.type === 'grant') {
        onGrant(String(d.id), String(d.nick), +d.n || 0, +d.count || 0, String(d.note || ''));
        if (state !== 'on') setChip('on', '숲 연동 중');
      } else if (d.type === 'chat') {
        onChat(String(d.id), String(d.nick), String(d.msg));
        if (state !== 'on') setChip('on', '숲 연동 중');
      }
    };

    socket.onclose = () => {
      ws = null;
      clearInterval(pingTimer);
      if (want) {
        setChip('connecting', '재연결 중...');
        setStatus('연결 끊김. 3초 후 재연결...');
        clearTimeout(reconTimer);
        reconTimer = setTimeout(() => openSocket(relay), 3000);
      }
    };

    socket.onerror = () => {
      try { socket.close(); } catch (_) { /* ignore */ }
    };
  }

  function onGrant(id, nick, n, count, note) {
    if (n <= 0) return;
    const c = credits[id] || (credits[id] = { nick, n: 0 });
    c.nick = nick;
    c.n += n;
    renderCredits();
    armCreditTimer(id);
    const label = note ? `${note} ${count}개` : `별풍선 ${count}개`;
    toast(`${nick} 님 ${label}! 뽑기 ${n}회`, true);

    const rc = lastChats[id];
    if (rc && Date.now() - rc.t <= RECENT_CHAT_MS) {
      delete lastChats[id];
      tryPullCommand(id, nick, rc.msg);
    }
  }

  function onChat(id, nick, msg) {
    lastChats[id] = { t: Date.now(), msg };
    if (credits[id]?.n > 0) tryPullCommand(id, nick, msg);
  }

  /** 채팅에서 뽑기 횟수 파싱: "1", "10뽑", "20" 등 */
  function parsePullCount(msg) {
    const trimmed = msg.trim();
    const m1 = trimmed.match(/^(\d{1,2})\s*뽑?$/);
    if (m1) return Math.min(20, Math.max(1, +m1[1]));
    const m2 = trimmed.match(/뽑기?\s*(\d{1,2})/);
    if (m2) return Math.min(20, Math.max(1, +m2[1]));
    if (/^1뽑$|^싱글$|^single$/i.test(trimmed)) return 1;
    if (/^10뽑$|^텐$/|^ten$/i.test(trimmed)) return 10;
    if (/^20뽑$|^twenty$/i.test(trimmed)) return 20;
    return 0;
  }

  const pullQueue = [];
  let queueRunning = false;

  function tryPullCommand(id, nick, msg) {
    const count = parsePullCount(msg);
    if (!count) return;
    if (!credits[id] || credits[id].n < count) {
      toast(`${nick} 님 — 뽑기 ${count}회 불가 (남은 ${credits[id]?.n ?? 0}회)`);
      return;
    }
    credits[id].n -= count;
    renderCredits();
    enqueuePull(id, nick, count);
    if (credits[id].n > 0) armCreditTimer(id);
  }

  function enqueuePull(id, nick, count) {
    pullQueue.push({ id, nick, count });
    runQueue();
  }

  async function runQueue() {
    if (queueRunning) return;
    queueRunning = true;
    while (pullQueue.length) {
      const { nick, count } = pullQueue.shift();
      if (typeof onAutoPull === 'function') {
        await onAutoPull(nick, count);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    queueRunning = false;
  }

  function bindEvents() {
    el.chip()?.addEventListener('click', () => el.back()?.classList.add('on'));
    el.closeBtn()?.addEventListener('click', () => el.back()?.classList.remove('on'));
    el.connectBtn()?.addEventListener('click', () => {
      if (want) disconnect();
      else connect();
    });

    ['soopUnit', 'soopBal', 'soopAd', 'soopCh', 'soopBt', 'soopBjid', 'soopRelay'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        saveCfg();
        pushConfig();
      });
    });
  }

  function init(callbacks) {
    el.chip = () => $('soopChip');
    el.chipText = () => $('soopChipText');
    el.back = () => $('soopBack');
    el.status = () => $('soopStatus');
    el.connectBtn = () => $('soopConnectBtn');
    el.toast = () => $('soopToast');
    el.creditList = () => $('creditList');
    el.bjid = () => $('soopBjid');
    el.unit = () => $('soopUnit');
    el.relay = () => $('soopRelay');
    el.bal = () => $('soopBal');
    el.ad = () => $('soopAd');
    el.ch = () => $('soopCh');
    el.bt = () => $('soopBt');

    onAutoPull = callbacks?.onAutoPull;
    loadCfg();
    bindEvents();
  }

  return { init, connect, disconnect, toast, getState: () => state };
})();
