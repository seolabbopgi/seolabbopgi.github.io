const TYPE_COLORS = {
  '위': '#4A6FA5', '촉': '#2E7D32', '오': '#C62828', '군': '#6A1B9A', '—': '#999',
};

const TYPE_ENERGY = {
  '위': 'wei', '촉': 'shu', '오': 'wu', '군': 'qun', '—': 'bing',
};

const WEAKNESS_MAP = {
  '위': 'shu', '촉': 'wu', '오': 'wei', '군': 'wei',
};

const RARITY_SYMBOL = { N: '●', BR: '◇', R: '◆', SR: '★', UR: '★★', MISS: '—' };
const RARITY_GRADE = { N: '병사', BR: '백인장', R: '장수', SR: '대장군', UR: '왕', MISS: '—' };
const RARITY_MARK = { N: '', BR: '백', R: '장', SR: '대장', UR: '왕', MISS: '' };
const STAGE_LABEL = { N: '병사', BR: '백인장', R: '장수', SR: '대장군', UR: '왕', MISS: '' };
const CARD_SET_TOTAL = 100;

/** 100장 덱 구성 (총 100장) */
const DECK_COMPOSITION = { UR: 1, SR: 3, R: 8, BR: 15, N: 30, MISS: 43 };

function shuffleDeck(deck) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildFreshDeck() {
  const deck = [];
  for (const [rarity, count] of Object.entries(DECK_COMPOSITION)) {
    for (let i = 0; i < count; i++) deck.push(rarity);
  }
  return shuffleDeck(deck);
}

function remainingCountsFromHistory(history) {
  const remaining = { ...DECK_COMPOSITION };
  history.forEach((entry) => {
    if (remaining[entry.rarity] > 0) remaining[entry.rarity]--;
  });
  return remaining;
}

function deckFromRemainingCounts(counts) {
  const deck = [];
  for (const [rarity, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) deck.push(rarity);
  }
  return shuffleDeck(deck);
}

function getStage(card) {
  return card.stage || STAGE_LABEL[card.rarity] || '병사';
}

function getRarityLine(rarity) {
  return `${RARITY_SYMBOL[rarity] || ''} ${RARITY_GRADE[rarity] || rarity}`.trim();
}

function getMoves(card) {
  if (card.moves?.length) return card.moves;
  const e = TYPE_ENERGY[card.type] || 'bing';
  const cost = Array(card.energy || 1).fill('bing');
  return [{ energy: cost, name: card.attack, desc: card.desc, damage: card.damage }];
}

function isLordCard(card) {
  return card.lord || card.ex || card.rarity === 'UR';
}

function energyHtml(list) {
  return (list || []).map((e) => `<span class="energy-icon e-${e || 'bing'}"></span>`).join('');
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function getCardDescription(card) {
  if (card.desc) return card.desc;
  const descs = getMoves(card).map((m) => m.desc).filter(Boolean);
  return descs.join(' ') || '';
}

function buildCardFrontHTML(card, totalCards = CARD_SET_TOTAL) {
  if (card.rarity === 'MISS') {
    return `<div class="card-miss-body"><span class="card-miss-text">꽝</span><p>다음 전투에!</p></div>`;
  }

  const stage = getStage(card);
  const typeE = TYPE_ENERGY[card.type] || 'bing';
  const lord = isLordCard(card);
  const mark = card.mark || RARITY_MARK[card.rarity] || '';
  const artist = card.artist || 'SeolA';
  const no = `${card.no || '?'}/${String(totalCards).padStart(3, '0')}`;
  const holo = card.holo || card.rarity === 'UR' || card.rarity === 'SR';
  const description = getCardDescription(card);

  const safeName = String(card.name || '유설아');
  const nameHtml = lord
    ? `${escHtml(safeName.replace(/\s*覇$/i, '').replace(/\s*★$/i, ''))}<em class="lord-mark">覇</em>`
    : escHtml(safeName);

  const lordRule = lord ? `
    <div class="lord-rule-box">
      <strong>명장 룰</strong>
      <p>이 명장 카드가 전멸하면, 상대는 승점 2점을 획득한다.</p>
    </div>` : '';

  return `
    <div class="card-fullart${holo ? ' holo-art' : ''}">
      <img src="${escHtml(card.image || '')}" alt="${escHtml(safeName)}" loading="lazy" decoding="async">
      <div class="card-vignette"></div>
    </div>
    <div class="card-ui">
      <div class="card-top-bar">
        <span class="stage-pill">${escHtml(stage)}</span>
        <span class="card-name-ex">${nameHtml}</span>
        <span class="hp-group">
          무력 <b>${card.hp}</b>
          <span class="type-icon e-${typeE}"></span>
        </span>
      </div>
      <div class="card-desc-box">
        <p class="card-desc-text">${escHtml(description || '—')}</p>
      </div>
      <div class="card-meta">
        <span class="illus">Illus. ${escHtml(artist)}</span>
        <span class="card-reg">${no}${mark ? ` ${mark}` : ''}</span>
      </div>
      ${lordRule}
    </div>`;
}

/** 기본 카드 5장 — 커스텀 카드가 없을 때 사용 (왕·대장군·장수·백인장·병사) */
const CARD_POOL = [
  {
    id: 'seola-soldier', name: '병사 유설아', stage: '병사', rarity: 'N', type: '군', hp: 70,
    moves: [{ energy: ['bing'], name: '투창', desc: '병사 유설아의 기본 공격.', damage: 30 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '001', retreat: 1,
  },
  {
    id: 'seola-centurion', name: '백인장 유설아', stage: '백인장', rarity: 'BR', type: '오', hp: 80,
    moves: [{ energy: ['bing', 'bing'], name: '기습', desc: '백인장의 날카로운 일격.', damage: 35 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '002', mark: '백', retreat: 1,
  },
  {
    id: 'seola-general', name: '장수 유설아', stage: '장수', rarity: 'R', type: '촉', hp: 110,
    moves: [{ energy: ['shu', 'bing'], name: '돌격', desc: '장수의 강력한 돌격.', damage: 55 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '003', mark: '장', retreat: 2,
  },
  {
    id: 'seola-grand', name: '대장군 유설아', stage: '대장군', rarity: 'SR', type: '위', hp: 130, holo: true,
    moves: [{ energy: ['wei', 'bing'], name: '츄르단 하트', desc: '대장군의 필살 전법.', damage: 70 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '004', mark: '대장', retreat: 2,
  },
  {
    id: 'seola-king', name: '유설왕', stage: '왕', rarity: 'UR', type: '촉', hp: 130, lord: true, holo: true,
    moves: [
      { energy: ['bing', 'bing'], name: '키키', desc: '귀여운 눈빛으로 적군을 녹인다.', damage: 50 },
      { energy: ['shu', 'bing'], name: '2인자의 위엄', desc: '2인방송의 케미로 공격한다.', damage: 30 },
    ],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '005', mark: '왕', artist: 'SeolA', retreat: 1,
  },
];

const MISS_CARD = {
  id: 'miss', name: '꽝', rarity: 'MISS', type: '—', hp: 0, image: null, no: '—',
};

const RARITY_DECK_INFO = { UR: '1장', SR: '3장', R: '8장', BR: '15장', N: '30장', MISS: '43장' };
const RARITY_LABELS = { UR: '왕', SR: '대장군', R: '장수', BR: '백인장', N: '병사', MISS: '—' };
const RARITY_COLORS = { UR: '#FFD700', SR: '#7B1FA2', R: '#1565C0', BR: '#558B2F', N: '#B0BEC5', MISS: '#78909C' };
