const TYPE_COLORS = {
  '노말': '#A8A878', '격투': '#C03028', '페어리': '#EE99AC', '강철': '#B8B8D0',
  '에스퍼': '#F85888', '고스트': '#705898', '땅': '#E0C068', '드래곤': '#7038F8',
  '전기': '#F8D030', '번개': '#F8D030', '물': '#6890F0', '—': '#999',
};

const TYPE_ENERGY = {
  '노말': 'colorless', '격투': 'fighting', '페어리': 'fairy', '강철': 'metal',
  '에스퍼': 'psychic', '고스트': 'psychic', '땅': 'fighting', '드래곤': 'dragon',
  '전기': 'lightning', '번개': 'lightning', '물': 'water', '—': 'colorless',
};

const WEAKNESS_MAP = {
  '노말': 'fighting', '격투': 'psychic', '페어리': 'metal', '강철': 'fire',
  '에스퍼': 'dark', '고스트': 'dark', '땅': 'water', '드래곤': 'dragon',
  '전기': 'fighting', '번개': 'fighting', '물': 'lightning',
};

const RARITY_SYMBOL = { N: '●', R: '◆', SR: '★', UR: '★★', MISS: '—' };
const RARITY_GRADE = { N: 'C', R: 'U', SR: 'R', UR: 'RR', MISS: '—' };
const RARITY_MARK = { N: '', R: '', SR: 'R', UR: 'SAR', MISS: '' };
const STAGE_LABEL = { N: '기본', R: '1진화', SR: '1진화', UR: '기본', MISS: '' };

function getStage(card) {
  return card.stage || STAGE_LABEL[card.rarity] || '기본';
}

function getRarityLine(rarity) {
  return `${RARITY_SYMBOL[rarity] || ''} ${RARITY_GRADE[rarity] || rarity}`.trim();
}

function getMoves(card) {
  if (card.moves?.length) return card.moves;
  const e = TYPE_ENERGY[card.type] || 'colorless';
  const cost = Array(card.energy || 1).fill(e === 'colorless' ? 'colorless' : e);
  return [{ energy: cost, name: card.attack, desc: card.desc, damage: card.damage }];
}

function isExCard(card) {
  return card.ex || card.rarity === 'UR';
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
    return `<div class="card-miss-body"><span class="card-miss-text">꽝</span><p>다음엔 뽑혀요!</p></div>`;
  }

  const stage = getStage(card);
  const typeE = TYPE_ENERGY[card.type] || 'colorless';
  const weakness = card.weakness || WEAKNESS_MAP[card.type] || 'fighting';
  const retreat = card.retreat ?? (card.rarity === 'UR' ? 1 : 2);
  const ex = isExCard(card);
  const mark = card.mark || RARITY_MARK[card.rarity] || '';
  const artist = card.artist || 'SeolA';
  const no = `${card.no || '?'}/${String(totalCards).padStart(3, '0')}`;
  const holo = card.holo || card.rarity === 'UR' || card.rarity === 'SR';

  const nameHtml = ex
    ? `${escHtml(card.name.replace(/\s*ex$/i, '').replace(/\s*★$/i, ''))}<em class="ex-logo">ex</em>`
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

  const exRule = ex ? `
    <div class="ex-rule-box">
      <strong>ex 룰</strong>
      <p>이 포켓몬 ex가 기절하면, 상대는 승리점 2개를 가져간다.</p>
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
          HP <b>${card.hp}</b>
          <span class="type-icon e-${typeE}"></span>
        </span>
      </div>
      <div class="card-moves">${movesHtml}</div>
      <div class="stats-bar">
        <span class="stat-item">약점 <span class="energy-icon e-${weakness} tiny"></span> ×2</span>
        <span class="stat-item">저항 —</span>
        <span class="stat-item">후퇴 ${energyHtml(Array(retreat).fill('colorless'))}</span>
      </div>
      <div class="card-meta">
        <span class="illus">Illus. ${escHtml(artist)}</span>
        <span class="card-reg">${no}${mark ? ` ${mark}` : ''}</span>
      </div>
      ${exRule}
    </div>`;
}

const CARD_POOL = [
  {
    id: 'yeveee-basic', name: '유설아', stage: '기본', rarity: 'N', type: '노말', hp: 70,
    moves: [{ energy: ['colorless'], name: '츄르 던지기', desc: 'SOOP 버추얼 스트리머의 기본 공격.', damage: 30 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '001', retreat: 1,
  },
  {
    id: 'yeveee-smile', name: '유설아', stage: '기본', rarity: 'N', type: '노말', hp: 60,
    moves: [{ energy: ['colorless'], name: '궁디 반짝', desc: '미소로 상대를 녹인다.', damage: 25 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '002', retreat: 1,
  },
  {
    id: 'yeveee-vworld', name: '유설아', stage: '기본', rarity: 'N', type: '페어리', hp: 80,
    moves: [{ energy: ['colorless', 'colorless'], name: '버추얼 펀치', desc: 'VWORLD 프로필의 타격감.', damage: 35 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '003', retreat: 1,
  },
  {
    id: 'yeveee-game', name: '유설아', stage: '1진화', rarity: 'R', type: '격투', hp: 100,
    moves: [{ energy: ['fighting', 'colorless'], name: '타격감 MAX', desc: '게임 방송의 쾌감을 전달.', damage: 50 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '004', retreat: 2,
  },
  {
    id: 'yeveee-burger', name: '유설아', stage: '1진화', rarity: 'R', type: '격투', hp: 110,
    moves: [{ energy: ['fighting', 'colorless'], name: '궁디 임팩트', desc: '궁디반장의 강력한 한 방!', damage: 55 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '005', retreat: 2,
  },
  {
    id: 'yeveee-burgercom', name: '유설아', stage: '1진화', rarity: 'R', type: '강철', hp: 120,
    moves: [{ energy: ['metal', 'colorless', 'colorless'], name: '종겜 스매시', desc: '버컴퍼니 종합게임의 여왕!', damage: 60 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '006', retreat: 2,
  },
  {
    id: 'yeveee-chur', name: '유설아', stage: '1진화', rarity: 'SR', type: '에스퍼', hp: 130, holo: true,
    moves: [{ energy: ['psychic', 'colorless'], name: '츄르단 하트', desc: '팬덤 츄르단의 사랑이 담긴 공격.', damage: 70 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '007', mark: 'R', retreat: 2,
  },
  {
    id: 'yeveee-heupsung', name: '유설아', stage: '1진화', rarity: 'SR', type: '고스트', hp: 140, holo: true,
    moves: [{ energy: ['psychic', 'psychic'], name: '흡성 프레임', desc: '흡성 프레임 씌워진 전설의 순간!', damage: 80 }],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '008', mark: 'R', retreat: 2,
  },
  {
    id: 'yeveee-mark', name: '유설아', stage: '1진화', rarity: 'SR', type: '땅', hp: 135, holo: true,
    moves: [{ energy: ['fighting', 'colorless'], name: '블록 파괴', desc: '마크 크루 출신! 블록도 부순다!', damage: 75 }],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '009', mark: 'R', retreat: 2,
  },
  {
    id: 'yeveee-legend', name: '유설아', stage: '기본', rarity: 'UR', type: '물', hp: 130, ex: true, holo: true,
    moves: [
      { energy: ['colorless', 'colorless'], name: '키키', desc: '귀여운 눈빛으로 상대를 녹인다.', damage: 50 },
      { energy: ['water', 'colorless'], name: '2인자의 위엄', desc: '2인방송의 케미로 공격한다.', damage: 30 },
    ],
    image: 'https://d1b4su7rx1qs3y.cloudfront.net/uploads/images/JYgjMHUbLMWQ.png', no: '010', mark: 'SAR', artist: 'SeolA', retreat: 1,
  },
  {
    id: 'yeveee-god', name: '유설아', stage: '기본', rarity: 'UR', type: '전기', hp: 150, ex: true, holo: true,
    moves: [
      { energy: ['lightning', 'colorless'], name: '별풍 콤bo', desc: '별풍선이 쏟아지는 콤보 공격!', damage: 80 },
      { energy: ['lightning', 'lightning', 'colorless'], name: 'GOD MODE', desc: '최희귀 GOD 카드의 필살기.', damage: 150 },
    ],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '011', mark: 'SAR', artist: 'SeolA', retreat: 1,
  },
  {
    id: 'yeveee-shiny', name: '유설아', stage: '기본', rarity: 'UR', type: '번개', hp: 120, ex: true, holo: true,
    moves: [
      { energy: ['lightning'], name: '이색 변이', desc: '색이 다른 희귀 변이!', damage: 40 },
      { energy: ['lightning', 'colorless', 'colorless'], name: 'SHINY BURST', desc: '반짝이는 일섬!', damage: 100 },
    ],
    image: 'https://profile.img.sooplive.co.kr/LOGO/ye/yeveee/yeveee.jpg', no: '012', mark: 'SAR', artist: 'SeolA', retreat: 1,
  },
];

const MISS_CARD = {
  id: 'miss', name: '꽝', rarity: 'MISS', type: '—', hp: 0, image: null, no: '—',
};

const RARITY_WEIGHTS = { UR: 1, SR: 5, R: 15, N: 50, MISS: 29 };
const RARITY_LABELS = { UR: 'RR', SR: 'R', R: 'U', N: 'C', MISS: '—' };
const RARITY_COLORS = { UR: '#FFD700', SR: '#E040FB', R: '#4FC3F0', N: '#B0BEC5', MISS: '#78909C' };
