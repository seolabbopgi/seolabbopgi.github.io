const TYPE_COLORS = {
  '위': '#4A6FA5', '촉': '#2E7D32', '오': '#C62828', '군': '#6A1B9A', '—': '#999',
};

const TYPE_ENERGY = {
  '위': 'wei', '촉': 'shu', '오': 'wu', '군': 'qun', '—': 'bing',
};

const WEAKNESS_MAP = {
  '위': 'shu', '촉': 'wu', '오': 'wei', '군': 'wei',
};

const RARITY_SYMBOL = { N: '●', R: '◆', SR: '★', UR: '★★', MISS: '—' };
const RARITY_GRADE = { N: '백', R: '청', SR: '자', UR: '금', MISS: '—' };
const RARITY_MARK = { N: '', R: '', SR: '자', UR: '금', MISS: '' };
const STAGE_LABEL = { N: '병사', R: '장수', SR: '장수', UR: '명장', MISS: '' };

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

const CARD_POOL = [
  {
    id: 'yeveee-basic', name: '유설아', stage: '병사', rarity: 'N', type: '군', hp: 70,
    moves: [{ energy: ['bing'], name: '투창', desc: 'SOOP 버추얼 스트리머의 기본 공격.', damage: 30 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '001', retreat: 1,
  },
  {
    id: 'yeveee-smile', name: '유설아', stage: '병사', rarity: 'N', type: '촉', hp: 60,
    moves: [{ energy: ['bing'], name: '미녀계', desc: '미소로 적군 사기를 꺾는다.', damage: 25 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '002', retreat: 1,
  },
  {
    id: 'yeveee-vworld', name: '유설아', stage: '병사', rarity: 'N', type: '오', hp: 80,
    moves: [{ energy: ['bing', 'bing'], name: '기습', desc: 'VWORLD 프로필의 날카로운 일격.', damage: 35 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '003', retreat: 1,
  },
  {
    id: 'yeveee-game', name: '유설아', stage: '장수', rarity: 'R', type: '위', hp: 100,
    moves: [{ energy: ['gi', 'bing'], name: '돌격', desc: '게임 방송의 쾌감을 전장에 전한다.', damage: 50 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '004', retreat: 2,
  },
  {
    id: 'yeveee-burger', name: '유설아', stage: '장수', rarity: 'R', type: '촉', hp: 110,
    moves: [{ energy: ['gi', 'bing'], name: '궁디 임팩트', desc: '궁디반장의 강력한 한 방!', damage: 55 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '005', retreat: 2,
  },
  {
    id: 'yeveee-burgercom', name: '유설아', stage: '장수', rarity: 'R', type: '위', hp: 120,
    moves: [{ energy: ['gi', 'bing', 'bing'], name: '종겜 스매시', desc: '버컴퍼니 종합게임의 여왕!', damage: 60 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '006', retreat: 2,
  },
  {
    id: 'yeveee-chur', name: '유설아', stage: '장수', rarity: 'SR', type: '촉', hp: 130, holo: true,
    moves: [{ energy: ['chak', 'bing'], name: '츄르단 하트', desc: '팬덤 츄르단의 사랑이 담긴 전법.', damage: 70 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '007', mark: '자', retreat: 2,
  },
  {
    id: 'yeveee-heupsung', name: '유설아', stage: '장수', rarity: 'SR', type: '군', hp: 140, holo: true,
    moves: [{ energy: ['chak', 'chak'], name: '흡성 프레임', desc: '흡성 프레임 씌워진 전설의 순간!', damage: 80 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '008', mark: '자', retreat: 2,
  },
  {
    id: 'yeveee-mark', name: '유설아', stage: '장수', rarity: 'SR', type: '오', hp: 135, holo: true,
    moves: [{ energy: ['gi', 'bing'], name: '블록 파괴', desc: '마크 크루 출신! 성벽도 부순다!', damage: 75 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '009', mark: '자', retreat: 2,
  },
  {
    id: 'yeveee-legend', name: '유설아', stage: '명장', rarity: 'UR', type: '촉', hp: 130, lord: true, holo: true,
    moves: [
      { energy: ['bing', 'bing'], name: '키키', desc: '귀여운 눈빛으로 적군을 녹인다.', damage: 50 },
      { energy: ['shu', 'bing'], name: '2인자의 위엄', desc: '2인방송의 케미로 공격한다.', damage: 30 },
    ],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '010', mark: '금', artist: 'SeolA', retreat: 1,
  },
  {
    id: 'yeveee-god', name: '유설아', stage: '명장', rarity: 'UR', type: '위', hp: 150, lord: true, holo: true,
    moves: [
      { energy: ['wei', 'bing'], name: '별풍 콤보', desc: '별풍선이 쏟아지는 콤보 공격!', damage: 80 },
      { energy: ['wei', 'wei', 'bing'], name: '천하통일', desc: '최희귀 명장 카드의 필살기.', damage: 150 },
    ],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '011', mark: '금', artist: 'SeolA', retreat: 1,
  },
  {
    id: 'yeveee-shiny', name: '유설아', stage: '명장', rarity: 'UR', type: '오', hp: 120, lord: true, holo: true,
    moves: [
      { energy: ['wu'], name: '이색 변이', desc: '색이 다른 희귀 변이!', damage: 40 },
      { energy: ['wu', 'bing', 'bing'], name: '반짝 일섬', desc: '번개처럼 내리치는 일섬!', damage: 100 },
    ],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '012', mark: '금', artist: 'SeolA', retreat: 1,
  },
];

const MISS_CARD = {
  id: 'miss', name: '꽝', rarity: 'MISS', type: '—', hp: 0, image: null, no: '—',
};

const RARITY_WEIGHTS = { UR: 1, SR: 5, R: 15, N: 50, MISS: 29 };
const RARITY_LABELS = { UR: '금', SR: '자', R: '청', N: '백', MISS: '—' };
const RARITY_COLORS = { UR: '#FFD700', SR: '#7B1FA2', R: '#1565C0', N: '#B0BEC5', MISS: '#78909C' };
