(() => {
  'use strict';

  const STORAGE_KEY = 'yuseola-gacha-save';

  const state = {
    coins: 1000,
    owned: new Set(),
    soundOn: true,
    costs: { single: 100, ten: 900, twenty: 1700 },
    pulling: false,
    resolvedCards: [],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      coins: state.coins,
      owned: [...state.owned],
      soundOn: state.soundOn,
      costs: state.costs,
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      state.coins = data.coins ?? 1000;
      state.owned = new Set(data.owned ?? []);
      state.soundOn = data.soundOn ?? true;
      if (data.costs) Object.assign(state.costs, data.costs);
    } catch (_) { /* ignore */ }
  }

  async function refreshCards() {
    state.resolvedCards = await getAllCardsResolved();
  }

  function updateUI() {
    $('#coinCount').textContent = state.coins.toLocaleString();
    $('#collectCount').textContent = `${state.owned.size}/${getCardCount()}`;
    $('#btnSound').textContent = state.soundOn ? '🔊' : '🔇';
    $('#btnSingle small').textContent = `(${state.costs.single})`;
    $('#btnTen small').textContent = `(${state.costs.ten})`;
    $('#btnTwenty small').textContent = `(${state.costs.twenty})`;
  }

  function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'pokemon-card';
    if (card.holo) el.classList.add('holo');
    if (card.rarity === 'UR') el.classList.add('flash-ur');
    if (card.rarity === 'SR') el.classList.add('flash-sr');

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const back = document.createElement('div');
    back.className = 'card-back';

    const front = document.createElement('div');
    const typeColor = TYPE_COLORS[card.type] || '#999';
    front.className = `card-front rarity-${card.rarity}`;
    front.style.setProperty('--type-color', typeColor);

    if (card.rarity === 'MISS') {
      front.innerHTML = `
        <div class="card-miss-body">
          <span class="card-miss-text">꽝</span>
          <p>다음엔 뽑혀요!</p>
        </div>`;
    } else {
      const stage = getStage(card);
      const grade = getRarityLine(card.rarity);
      const energy = '●'.repeat(card.energy || 1);
      const total = getCardCount();

      front.innerHTML = `
        <div class="card-stage-row">
          <span class="card-stage">${esc(stage)}</span>
          <span class="card-type-badge" style="background:${typeColor}">${esc(card.type)}</span>
        </div>
        <div class="card-name-row">
          <span class="card-name">${esc(card.name)}</span>
          <span class="card-hp"><small>HP</small> ${card.hp}</span>
        </div>
        <div class="card-art-box">
          <img src="${esc(card.image)}" alt="${esc(card.name)}" loading="lazy" decoding="async">
        </div>
        <div class="card-attack-row">
          <span class="card-energy">${energy}</span>
          <span class="card-attack-name">${esc(card.attack)}</span>
          <span class="card-attack-dmg">${card.damage}</span>
        </div>
        <p class="card-flavor">${esc(card.desc)}</p>
        <div class="card-footer-row">
          <span class="card-rarity-mark rarity-${card.rarity}">${grade}</span>
          <span class="card-no">${card.no || '?'}/${String(total).padStart(3, '0')}</span>
        </div>`;

      const img = front.querySelector('img');
      if (img) {
        img.onerror = () => {
          img.closest('.card-art-box').classList.add('art-fallback');
          img.remove();
        };
      }
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

  async function renderAlbum() {
    await refreshCards();
    const grid = $('#albumGrid');
    grid.innerHTML = '';

    state.resolvedCards.forEach((card) => {
      const slot = document.createElement('div');
      slot.className = 'album-slot' + (state.owned.has(card.id) ? ' owned' : '');
      slot.title = `${card.name} [${getRarityLine(card.rarity)}]`;

      if (state.owned.has(card.id)) {
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.name;
        slot.appendChild(img);

        const gradeEl = document.createElement('div');
        gradeEl.className = `slot-grade rarity-${card.rarity}`;
        gradeEl.textContent = getRarityLine(card.rarity);
        slot.appendChild(gradeEl);
      } else {
        const num = document.createElement('span');
        num.className = 'slot-num';
        num.textContent = '?';
        slot.appendChild(num);
      }

      const badge = document.createElement('span');
      badge.className = `slot-rarity rarity-${card.rarity}`;
      badge.textContent = RARITY_GRADE[card.rarity] || card.rarity;
      slot.appendChild(badge);

      if (card.custom) {
        const tag = document.createElement('span');
        tag.className = 'slot-custom';
        tag.textContent = '★';
        slot.appendChild(tag);
      }

      slot.addEventListener('click', () => {
        if (state.owned.has(card.id)) showSingleReveal(card);
      });
      grid.appendChild(slot);
    });
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

  async function doGacha(count, cost, { free = false, donor = '' } = {}) {
    if (state.pulling) return false;
    if (!free && state.coins < cost) {
      alert('코인이 부족합니다! 🪙');
      return false;
    }

    state.pulling = true;
    if (!free) {
      state.coins -= cost;
      save();
      updateUI();
    }

    await refreshCards();

    const pack = $('#pack');
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
    results.forEach((card) => {
      if (card.rarity !== 'MISS') state.owned.add(card.id);
    });
    save();
    updateUI();
    await renderAlbum();

    const donorLabel = donor ? ` — ${donor}` : '';

    if (count === 1) {
      const card = results[0];
      playSound(card.rarity === 'UR' ? 'ur' : card.rarity === 'SR' ? 'sr' : card.rarity === 'R' ? 'r' : card.rarity === 'MISS' ? 'miss' : 'n');
      await showSingleReveal(card, donorLabel);
    } else {
      await showMultiReveal(results, donorLabel);
    }

    state.pulling = false;
    return true;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitForClose(stageId) {
    return new Promise((resolve) => {
      const stage = $(stageId);
      const close = () => {
        stage.classList.add('hidden');
        stage.removeEventListener('click', close);
        resolve();
      };
      stage.addEventListener('click', close);
    });
  }

  function flashScreen(rarity) {
    const el = document.createElement('div');
    el.className = `screen-flash flash-${rarity}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  function showSingleReveal(card, sub = '') {
    return new Promise((resolve) => {
      const stage = $('#cardReveal');
      const wrap = $('#revealCard');
      wrap.innerHTML = '';
      wrap.appendChild(createCardElement(card));
      if (card.rarity === 'UR') flashScreen('ur');
      else if (card.rarity === 'SR') flashScreen('sr');
      $('#revealSub').textContent = sub;
      stage.classList.remove('hidden');
      const close = () => {
        stage.classList.add('hidden');
        stage.removeEventListener('click', close);
        resolve();
      };
      stage.addEventListener('click', close);
    });
  }

  function showMultiReveal(results, sub = '') {
    return new Promise((resolve) => {
      const stage = $('#resultStage');
      const container = $('#resultCards');
      container.innerHTML = '';

      const best = results.reduce((a, b) => {
        const order = { UR: 5, SR: 4, R: 3, N: 2, MISS: 1 };
        return (order[a.rarity] ?? 0) >= (order[b.rarity] ?? 0) ? a : b;
      });
      playSound(best.rarity === 'UR' ? 'ur' : best.rarity === 'SR' ? 'sr' : 'pull');

      results.forEach((card) => container.appendChild(createCardElement(card)));

      const urCount = results.filter((c) => c.rarity === 'UR').length;
      const srCount = results.filter((c) => c.rarity === 'SR').length;
      let title = `${results.length}연차 결과!`;
      if (urCount) title += ` 🌟 UR ${urCount}장!`;
      else if (srCount) title += ` ✨ SR ${srCount}장!`;
      $('#resultTitle').textContent = title;
      $('#resultSub').textContent = sub;

      stage.classList.remove('hidden');
      const close = () => {
        stage.classList.add('hidden');
        stage.removeEventListener('click', close);
        resolve();
      };
      stage.addEventListener('click', close);
    });
  }

  /* ===== 커스텀 카드 UI ===== */
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
        state.owned.delete(btn.dataset.id);
        save();
        await renderAlbum();
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
    $('#btnSingle').addEventListener('click', () => doGacha(1, state.costs.single));
    $('#btnTen').addEventListener('click', () => doGacha(10, state.costs.ten));
    $('#btnTwenty').addEventListener('click', () => doGacha(20, state.costs.twenty));
    $('#pack').addEventListener('click', () => doGacha(1, state.costs.single));

    $('#btnSound').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      updateUI();
      save();
    });

    $('#btnReset').addEventListener('click', () => {
      if (confirm('코인을 1000으로 초기화할까요? (수집 기록 유지)')) {
        state.coins = 1000;
        save();
        updateUI();
      }
    });

    $('#btnSettings').addEventListener('click', () => {
      $('#settingCoins').value = state.coins;
      $('#settingSingleCost').value = state.costs.single;
      renderCustomCardList();
      $('#settingsModal').classList.remove('hidden');
    });

    $('#btnCloseSettings').addEventListener('click', () => {
      $('#settingsModal').classList.add('hidden');
    });

    $('#btnSaveSettings').addEventListener('click', () => {
      state.coins = parseInt($('#settingCoins').value, 10) || 0;
      state.costs.single = parseInt($('#settingSingleCost').value, 10) || 100;
      state.costs.ten = Math.floor(state.costs.single * 9);
      state.costs.twenty = Math.floor(state.costs.single * 17);
      save();
      updateUI();
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
        await renderAlbum();
        await renderCustomCardList();
        updateUI();
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
    load();
    await refreshCards();
    updateUI();
    await renderAlbum();
    bindTabs();
    bindEvents();

    SoopBridge.init({
      onAutoPull: async (nick, count) => {
        SoopBridge.toast(`${nick} 님 ${count}연차 시작!`, true);
        await doGacha(count, 0, { free: true, donor: nick });
      },
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
