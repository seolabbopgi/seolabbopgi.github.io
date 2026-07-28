(() => {
  'use strict';

  const STORAGE_KEY = 'yuseola-gacha-save';
  const HISTORY_LIMIT = 300;

  const state = {
    history: [],
    soundOn: true,
    resetUnlocked: false,
    pulling: false,
    resolvedCards: [],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      history: state.history,
      soundOn: state.soundOn,
      resetUnlocked: state.resetUnlocked,
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      state.history = Array.isArray(data.history)
        ? data.history.filter((h) => {
          if (h.rarity === 'MISS') return true;
          const id = String(h.id);
          return id.startsWith('custom-') || id.startsWith('seola-');
        })
        : [];
      state.soundOn = data.soundOn ?? true;
      state.resetUnlocked = data.resetUnlocked ?? false;
    } catch (_) { /* ignore */ }
  }

  function fallbackCardPool() {
    return CARD_POOL.map((c) => ({ ...c }));
  }

  async function refreshCards() {
    try {
      const resolved = await getAllCardsResolved();
      state.resolvedCards = resolved.length ? resolved : fallbackCardPool();
    } catch {
      state.resolvedCards = fallbackCardPool();
    }
  }

  function closeOverlays() {
    $('#cardReveal')?.classList.add('hidden');
    $('#resultStage')?.classList.add('hidden');
    $('#settingsModal')?.classList.add('hidden');
    $('#soopBack')?.classList.remove('on');
    state.pulling = false;
    $('#pack')?.classList.remove('shaking', 'opening');
  }

  function updateUI() {
    $('#btnSound').textContent = state.soundOn ? '🔊' : '🔇';
    const resetBtn = $('#btnReset');
    if (resetBtn) {
      resetBtn.classList.toggle('disabled', !state.resetUnlocked);
      resetBtn.title = state.resetUnlocked
        ? '나온 내역 리셋'
        : '왕 등급 당첨 후 리셋 가능';
    }
    const countEl = $('#historyCount');
    if (countEl) {
      countEl.textContent = state.history.length
        ? `총 ${state.history.length}장`
        : '아직 뽑은 카드가 없어요';
    }
  }

  function unlockReset() {
    state.resetUnlocked = true;
    save();
    updateUI();
  }

  function snapshotCard(card, donor = '') {
    return {
      uid: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      type: card.type,
      hp: card.hp,
      stage: card.stage,
      image: card.image,
      moves: card.moves,
      holo: card.holo,
      lord: card.lord,
      mark: card.mark,
      artist: card.artist,
      retreat: card.retreat,
      pulledAt: Date.now(),
      donor: donor || '',
    };
  }

  function addToHistory(cards, donor = '') {
    cards.slice().reverse().forEach((card) => {
      state.history.unshift(snapshotCard(card, donor));
    });
    if (state.history.length > HISTORY_LIMIT) {
      state.history.length = HISTORY_LIMIT;
    }
  }

  async function resetHistory() {
    if (!state.resetUnlocked) {
      alert('👑 왕 등급이 나온 뒤에 리셋할 수 있어요.');
      return;
    }
    if (!confirm('나온 내역을 모두 초기화할까요?')) return;
    state.history = [];
    state.resetUnlocked = false;
    save();
    updateUI();
    await renderHistory();
    $('#resultStage').classList.add('hidden');
    $('#cardReveal').classList.add('hidden');
  }

  function showResetBars(hasKing) {
    $('#revealResetBar')?.classList.toggle('hidden', !hasKing);
    $('#resultResetBar')?.classList.toggle('hidden', !hasKing);
  }

  function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'pokemon-card';
    if (card.holo || card.rarity === 'UR' || card.rarity === 'SR') el.classList.add('holo');
    if (card.rarity === 'UR') el.classList.add('sar-frame', 'flash-ur');
    if (card.rarity === 'SR') el.classList.add('flash-sr');

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const back = document.createElement('div');
    back.className = 'card-back';

    const front = document.createElement('div');
    front.className = `card-front sar-card rarity-${card.rarity}`;
    front.innerHTML = buildCardFrontHTML(card, getCardCount());

    const img = front.querySelector('.card-fullart img');
    if (img) {
      img.onerror = () => {
        const art = img.closest('.card-fullart');
        if (art) art.classList.add('art-fallback');
        img.remove();
      };
    }

    inner.appendChild(back);
    inner.appendChild(front);
    el.appendChild(inner);
    inner.style.transform = 'rotateY(180deg)';

    return el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function renderHistory() {
    const grid = $('#historyGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!state.history.length) {
      grid.innerHTML = '<p class="history-empty">뽑기를 시작하면 여기에 나온 카드가 쌓여요</p>';
      updateUI();
      return;
    }

    state.history.forEach((entry) => {
      const slot = document.createElement('div');
      slot.className = `history-slot rarity-${entry.rarity}`;

      const badge = document.createElement('span');
      badge.className = `slot-rarity rarity-${entry.rarity}`;
      badge.textContent = RARITY_GRADE[entry.rarity] || entry.rarity;
      slot.appendChild(badge);

      if (entry.rarity === 'MISS') {
        const miss = document.createElement('span');
        miss.className = 'slot-num';
        miss.textContent = '꽝';
        slot.appendChild(miss);
      } else {
        const img = document.createElement('img');
        img.src = entry.image || '';
        img.alt = entry.name;
        img.loading = 'lazy';
        slot.appendChild(img);

        const gradeEl = document.createElement('div');
        gradeEl.className = `slot-grade rarity-${entry.rarity}`;
        gradeEl.textContent = getRarityLine(entry.rarity);
        slot.appendChild(gradeEl);
      }

      slot.title = entry.donor
        ? `${entry.name} [${getRarityLine(entry.rarity)}] — ${entry.donor}`
        : `${entry.name} [${getRarityLine(entry.rarity)}]`;

      slot.addEventListener('click', () => {
        if (entry.rarity !== 'MISS') showSingleReveal(entry);
      });
      grid.appendChild(slot);
    });

    updateUI();
  }

  function rollRarity() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
      cumulative += weight;
      if (roll < cumulative) return rarity;
    }
    return 'MISS';
  }

  function rollCard() {
    const rarity = rollRarity();
    if (rarity === 'MISS') return { ...MISS_CARD };

    const pool = state.resolvedCards.filter((c) => c.rarity === rarity);
    if (!pool.length) return { ...MISS_CARD };
    return { ...pool[Math.floor(Math.random() * pool.length)] };
  }

  function pull(count) {
    const results = [];
    for (let i = 0; i < count; i++) results.push(rollCard());
    return results;
  }

  function playSound(type) {
    if (!state.soundOn) return;
    const map = { pull: 'pull', ur: 'ur', sr: 'sr', r: 'r', n: 'n', miss: 'miss' };
    Sfx.play(map[type] ?? 'pull');
  }

  async function doGacha(count, { donor = '' } = {}) {
    if (state.pulling) return false;

    await refreshCards();
    if (!state.resolvedCards.length) {
      alert('뽑기 카드를 불러오지 못했습니다. 설정에서 카드를 추가하거나, 잠시 후 다시 시도해 주세요.');
      return false;
    }

    state.pulling = true;
    const pack = $('#pack');

    try {
      pack.classList.add('shaking');
      playSound('pull');
      Sfx.packOpen();
      await sleep(600);
      pack.classList.remove('shaking');
      pack.classList.add('opening');
      Sfx.packOpen();
      await sleep(800);
      pack.classList.remove('opening');

      const results = pull(count);
      addToHistory(results, donor);
      save();
      updateUI();
      await renderHistory();

      const donorLabel = donor ? ` — ${donor}` : '';
      const hasKing = results.some((c) => c.rarity === 'UR');
      if (hasKing) unlockReset();

      if (count === 1) {
        const card = results[0];
        playSound(card.rarity === 'UR' ? 'ur' : card.rarity === 'SR' ? 'sr' : card.rarity === 'R' ? 'r' : card.rarity === 'MISS' ? 'miss' : 'n');
        await showSingleReveal(card, donorLabel, hasKing);
      } else {
        await showMultiReveal(results, donorLabel, hasKing);
      }

      return true;
    } catch (err) {
      console.error('doGacha', err);
      alert('뽑기 중 오류가 발생했습니다. 다시 시도해 주세요.');
      return false;
    } finally {
      state.pulling = false;
      pack?.classList.remove('shaking', 'opening');
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function flashScreen(rarity) {
    const el = document.createElement('div');
    el.className = `screen-flash flash-${rarity}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  function showSingleReveal(card, sub = '', hasKing = false) {
    return new Promise((resolve) => {
      const stage = $('#cardReveal');
      const wrap = $('#revealCard');
      wrap.innerHTML = '';
      wrap.appendChild(createCardElement(card));
      if (card.rarity === 'UR') flashScreen('ur');
      else if (card.rarity === 'SR') flashScreen('sr');
      $('#revealSub').textContent = sub;
      showResetBars(hasKing || card.rarity === 'UR');
      stage.classList.remove('hidden');
      const close = (e) => {
        if (e?.target?.closest?.('.reset-bar button')) return;
        stage.classList.add('hidden');
        stage.removeEventListener('click', close);
        resolve();
      };
      stage.addEventListener('click', close);
    });
  }

  function showMultiReveal(results, sub = '', hasKing = false) {
    return new Promise((resolve) => {
      const stage = $('#resultStage');
      const container = $('#resultCards');
      container.innerHTML = '';

      const best = results.reduce((a, b) => {
        const order = { UR: 6, SR: 5, R: 4, BR: 3, N: 2, MISS: 1 };
        return (order[a.rarity] ?? 0) >= (order[b.rarity] ?? 0) ? a : b;
      });
      playSound(best.rarity === 'UR' ? 'ur' : best.rarity === 'SR' ? 'sr' : 'pull');

      results.forEach((card) => container.appendChild(createCardElement(card)));

      const urCount = results.filter((c) => c.rarity === 'UR').length;
      const srCount = results.filter((c) => c.rarity === 'SR').length;
      let title = `${results.length}연차 결과!`;
      if (urCount) title += ` 👑 왕 ${urCount}장!`;
      else if (srCount) title += ` ⚔ 대장군 ${srCount}장!`;
      $('#resultTitle').textContent = title;
      $('#resultSub').textContent = sub;
      showResetBars(hasKing);

      stage.classList.remove('hidden');
      const close = (e) => {
        if (e?.target?.closest?.('.reset-bar button')) return;
        stage.classList.add('hidden');
        stage.removeEventListener('click', close);
        resolve();
      };
      stage.addEventListener('click', close);
    });
  }

  async function renderCustomCardList() {
    const list = $('#customCardList');
    if (!list) return;
    const custom = loadCustomCards();
    list.innerHTML = custom.length
      ? '<h3>추가된 카드</h3>'
      : '<p class="empty-msg">아직 커스텀 카드가 없어요.</p>';

    for (const card of custom) {
      const row = document.createElement('div');
      row.className = 'custom-row';
      const imgSrc = await resolveCardImage(card);
      row.innerHTML = `
        <img src="${imgSrc || ''}" alt="">
        <span><b>${esc(getRarityLine(card.rarity))}</b> ${esc(card.name)}</span>
        <button class="btn-del" data-id="${card.id}">삭제</button>
      `;
      list.appendChild(row);
    }

    list.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 카드를 삭제할까요?')) return;
        await removeCustomCard(btn.dataset.id);
        state.history = state.history.filter((h) => h.id !== btn.dataset.id);
        save();
        await renderHistory();
        await renderCustomCardList();
        updateUI();
      });
    });
  }

  function bindTabs() {
    $$('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach((b) => b.classList.remove('active'));
        $$('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  function bindEvents() {
    $('#btnSingle').addEventListener('click', () => doGacha(1));
    $('#btnTen').addEventListener('click', () => doGacha(10));
    $('#btnTwenty').addEventListener('click', () => doGacha(20));
    $('#pack').addEventListener('click', () => doGacha(1));

    $('#btnSound').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      updateUI();
      save();
    });

    $('#btnReset').addEventListener('click', () => resetHistory());
    $('#btnRevealReset').addEventListener('click', (e) => {
      e.stopPropagation();
      resetHistory();
    });
    $('#btnResultReset').addEventListener('click', (e) => {
      e.stopPropagation();
      resetHistory();
    });

    $('#btnSettings').addEventListener('click', () => {
      renderCustomCardList();
      $('#settingsModal').classList.remove('hidden');
    });

    $('#btnCloseSettings').addEventListener('click', () => {
      $('#settingsModal').classList.add('hidden');
    });

    $('#btnSaveSettings').addEventListener('click', () => {
      $('#settingsModal').classList.add('hidden');
    });

    $('#cardImageFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      const preview = $('#uploadPreview');
      if (!file) { preview.textContent = '미리보기'; preview.style.backgroundImage = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        preview.style.backgroundImage = `url(${reader.result})`;
        preview.textContent = '';
      };
      reader.readAsDataURL(file);
    });

    $('#cardUploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = $('#cardImageFile').files[0];
      if (!file) { alert('이미지를 선택해 주세요.'); return; }
      try {
        await addCustomCard({
          name: $('#cardName').value,
          subtitle: $('#cardSubtitle').value || '커스텀',
          rarity: $('#cardRarity').value,
          attack: $('#cardAttack').value,
          damage: $('#cardDamage').value,
          desc: $('#cardDesc').value || '직접 추가한 카드',
        }, file);
        $('#cardUploadForm').reset();
        $('#uploadPreview').textContent = '미리보기';
        $('#uploadPreview').style.backgroundImage = '';
        await refreshCards();
        await renderCustomCardList();
        alert('카드가 추가됐어요! 🎴');
      } catch (err) {
        alert(err.message || '추가 실패');
      }
    });

    $('#soopOpenSettings').addEventListener('click', () => {
      $('#soopBack').classList.remove('on');
      $('#settingsModal').classList.remove('hidden');
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      $('[data-tab="tabSoop"]').classList.add('active');
      $('#tabSoop').classList.add('active');
    });

    setInterval(() => {
      const st = $('#soopStatus')?.textContent;
      const qs = $('#soopQuickStatus');
      if (qs && st) qs.textContent = st;
    }, 1000);
  }

  async function init() {
    closeOverlays();
    load();
    save();
    bindTabs();
    bindEvents();

    await refreshCards();
    updateUI();
    await renderHistory();

    try {
      SoopBridge.init({
        onAutoPull: async (nick, count) => {
          SoopBridge.toast(`${nick} 님 ${count}연차 시작!`, true);
          await doGacha(count, { donor: nick });
        },
      });
    } catch (err) {
      console.error('SoopBridge.init', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
