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

async function resolveCardImage(card) {
  if (!card.imageId) return card.image;
  if (IMAGE_CACHE[card.imageId]) return IMAGE_CACHE[card.imageId];
  const data = await loadImage(card.imageId);
  if (data) IMAGE_CACHE[card.imageId] = data;
  return data ?? card.image;
}

async function getAllCardsResolved() {
  const custom = loadCustomCards();
  const all = [...CARD_POOL, ...custom];
  const resolved = await Promise.all(all.map(async (c) => {
    const image = await resolveCardImage(c);
    return { ...c, image: image ?? c.image };
  }));
  return resolved;
}

function getAllCardIds() {
  return [...CARD_POOL, ...loadCustomCards()].map((c) => c.id);
}

function getCardCount() {
  return CARD_POOL.length + loadCustomCards().length;
}

async function addCustomCard(meta, file) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('이미지는 2MB 이하만 가능합니다.');
  }
  const dataUrl = await readFileAsDataURL(file);
  const imageId = 'img-' + Date.now();
  await saveImage(imageId, dataUrl);

  const card = {
    id: 'custom-' + Date.now(),
    name: meta.name || '유설아',
    stage: meta.stage || '기본',
    rarity: meta.rarity || 'R',
    type: meta.type || '노말',
    hp: +meta.hp || 100,
    moves: [{
      energy: [TYPE_ENERGY[meta.type || '노말'] || 'colorless', 'colorless'],
      name: meta.attack || '커스텀 공격',
      desc: meta.desc || '직접 추가한 카드',
      damage: +meta.damage || 50,
    }],
    imageId,
    custom: true,
    holo: meta.rarity === 'UR' || meta.rarity === 'SR',
    ex: meta.rarity === 'UR',
    mark: meta.rarity === 'UR' ? 'SAR' : meta.rarity === 'SR' ? 'R' : '',
    artist: 'Custom',
    retreat: meta.rarity === 'UR' ? 1 : 2,
  };

  const cards = loadCustomCards();
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
