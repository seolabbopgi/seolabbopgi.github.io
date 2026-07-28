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
  return list.map((e) => `<span class="energy-icon e-${e}"></span>`).join('');
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildCardFrontHTML(card, totalCards) {
  if (card.rarity === 'MISS') {
    return `<div class="card-miss-body"><span class="card-miss-text">꽝</span><p>다음 전투에!</p></div>`;
  }

  const stage = getStage(card);
  const typeE = TYPE_ENERGY[card.type] || 'bing';
  const weakness = card.weakness || WEAKNESS_MAP[card.type] || 'wei';
  const retreat = card.retreat ?? (card.rarity === 'UR' ? 1 : 2);
  const lord = isLordCard(card);
  const mark = card.mark || RARITY_MARK[card.rarity] || '';
  const artist = card.artist || 'SeolA';
  const no = `${card.no || '?'}/${String(totalCards).padStart(3, '0')}`;
  const holo = card.holo || card.rarity === 'UR' || card.rarity === 'SR';

  const nameHtml = lord
    ? `${escHtml(card.name.replace(/\s*覇$/i, '').replace(/\s*★$/i, ''))}<em class="lord-mark">覇</em>`
    : escHtml(card.name);

  const movesHtml = getMoves(card).map((m) => `
    <div class="move-block">
      <div class="move-head">
        <span class="move-cost">${energyHtml(m.energy)}</span>
        <span class="move-name">${escHtml(m.name)}</span>
        <span class="move-dmg">${m.damage}</span>
      </div>
      ${m.desc ? `<p class="move-desc">${escHtml(m.desc)}</p>` : ''}
    </div>`).join('');

  const lordRule = lord ? `
    <div class="lord-rule-box">
      <strong>명장 룰</strong>
      <p>이 명장 카드가 전멸하면, 상대는 승점 2점을 획득한다.</p>
    </div>` : '';

  return `
    <div class="card-fullart${holo ? ' holo-art' : ''}">
      <img src="${escHtml(card.image)}" alt="${escHtml(card.name)}" loading="lazy" decoding="async">
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
      <div class="card-moves">${movesHtml}</div>
      <div class="stats-bar">
        <span class="stat-item">천적 <span class="energy-icon e-${weakness} tiny"></span> ×2</span>
        <span class="stat-item">내성 —</span>
        <span class="stat-item">퇴각 ${energyHtml(Array(retreat).fill('bing'))}</span>
      </div>
      <div class="card-meta">
        <span class="illus">Illus. ${escHtml(artist)}</span>
        <span class="card-reg">${no}${mark ? ` ${mark}` : ''}</span>
      </div>
      ${lordRule}
    </div>`;
}

const CARD_POOL = [];

const MISS_CARD = {
  id: 'miss', name: '꽝', rarity: 'MISS', type: '—', hp: 0, image: null, no: '—',
};

const RARITY_WEIGHTS = { UR: 0.1, SR: 1, R: 5, BR: 15, N: 50, MISS: 28.9 };
const RARITY_LABELS = { UR: '왕', SR: '대장군', R: '장수', BR: '백인장', N: '병사', MISS: '—' };
const RARITY_COLORS = { UR: '#FFD700', SR: '#7B1FA2', R: '#1565C0', BR: '#558B2F', N: '#B0BEC5', MISS: '#78909C' };
