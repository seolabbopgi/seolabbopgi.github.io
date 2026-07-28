/** IndexedDB 이미지 저장 */
const IDB_NAME = 'yuseola-gacha-db';
const IDB_STORE = 'images';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImage(id, dataUrl) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadImage(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteImage(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const CUSTOM_CARDS_KEY = 'yuseola-custom-cards';
const IMAGE_CACHE = {};

function loadCustomCards() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CARDS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomCards(cards) {
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
}

function isValidPoolCard(card) {
  return !!(card && card.id && card.rarity && card.rarity !== 'MISS');
}

async function resolveCardImage(card) {
  if (!card?.imageId) return card?.image ?? '';
  if (IMAGE_CACHE[card.imageId]) return IMAGE_CACHE[card.imageId];
  try {
    const data = await loadImage(card.imageId);
    if (data) IMAGE_CACHE[card.imageId] = data;
    return data ?? card.image ?? '';
  } catch {
    return card.image ?? '';
  }
}

/** 기본 5장 + 커스텀(같은 등급은 커스텀이 우선) */
function getActiveCardPool() {
  const custom = loadCustomCards().filter(isValidPoolCard);
  const byRarity = {};
  CARD_POOL.forEach((c) => { byRarity[c.rarity] = c; });
  custom.forEach((c) => { byRarity[c.rarity] = c; });
  return Object.values(byRarity);
}

async function getAllCardsResolved() {
  const pool = getActiveCardPool();
  const resolved = await Promise.all(pool.map(async (c) => {
    try {
      const image = await resolveCardImage(c);
      return { ...c, image: image ?? c.image ?? '' };
    } catch {
      return { ...c, image: c.image ?? '' };
    }
  }));
  return resolved.filter(isValidPoolCard);
}

function getAllCardIds() {
  return getActiveCardPool().map((c) => c.id);
}

function getCardCount() {
  return CARD_SET_TOTAL;
}

async function addCustomCard(meta, file) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('이미지는 2MB 이하만 가능합니다.');
  }
  const dataUrl = await readFileAsDataURL(file);
  const imageId = 'img-' + Date.now();
  await saveImage(imageId, dataUrl);

  const cards = loadCustomCards();
  const card = {
    id: 'custom-' + Date.now(),
    name: meta.name || '유설아',
    stage: STAGE_LABEL[meta.rarity] || '병사',
    rarity: meta.rarity || 'R',
    type: meta.type || '군',
    hp: +meta.hp || 100,
    desc: meta.desc || '직접 추가한 카드',
    moves: [{
      energy: [TYPE_ENERGY[meta.type || '군'] || 'bing', 'bing'],
      name: meta.attack || '커스텀 전법',
      desc: meta.desc || '직접 추가한 카드',
      damage: +meta.damage || 50,
    }],
    imageId,
    custom: true,
    holo: meta.rarity === 'UR' || meta.rarity === 'SR',
    lord: meta.rarity === 'UR',
    mark: { UR: '왕', SR: '대장', R: '장', BR: '백', N: '' }[meta.rarity] || '',
    artist: 'Custom',
    retreat: meta.rarity === 'UR' ? 1 : 2,
    no: String(cards.length + 1).padStart(3, '0'),
  };

  cards.push(card);
  saveCustomCards(cards);
  IMAGE_CACHE[imageId] = dataUrl;
  return card;
}

async function removeCustomCard(id) {
  const cards = loadCustomCards();
  const card = cards.find((c) => c.id === id);
  if (card?.imageId) {
    await deleteImage(card.imageId);
    delete IMAGE_CACHE[card.imageId];
  }
  saveCustomCards(cards.filter((c) => c.id !== id));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
