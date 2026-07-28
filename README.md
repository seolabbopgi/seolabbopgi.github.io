# seolabbopgi

SOOP 스트리머 **유설아♡** 테마의 포켓몬 TCG 스타일 카드 뽑기 게임.

**사이트 주소:** `https://wooeong.github.io/seolabbopgi/`

## 실행 방법

`index.html`을 브라우저에서 열면 됩니다.

## 기능

| 기능 | 설명 |
|------|------|
| **1/10/20뽑** | 코인으로 카드팩 뽑기 |
| **숲(SOOP) 연동** | 별풍선 후원 → 채팅 `1`/`10`/`20` 자동 뽑기 |
| **커스텀 카드** | 이미지 업로드로 카드 추가 (설정 → 카드 추가) |
| **카드 도감** | 수집 현황 localStorage 저장 |

## SOOP 연동 방법

1. ⚙ 설정 → **숲 연동** 탭
2. 스트리머 ID 입력 (예: `yeveee`)
3. 뽑기 기준 개수 설정 (100개 = 1회)
4. **연동 시작** 클릭
5. 후원자가 채팅으로 `1`, `10`, `20` (또는 `10뽑`) 입력 → 자동 뽑기

중계 서버 기본값: `wss://relay.hedasong.com`  
(자체 도메인 사용 시 `wss://relay.내도메인.com`)

## GitHub Pages 배포

1. GitHub에 저장소 생성 후 push
2. **Settings → Pages → Build and deployment → GitHub Actions** 선택
3. `main` 브랜치에 push하면 자동 배포

또는 수동:

```bash
git add .
git commit -m "Add seolabbopgi card gacha game"
git push origin main
```

배포 URL: `https://<username>.github.io/<repo>/`

## 파일 구조

```
index.html
css/style.css
js/cards.js      — 기본 카드 데이터
js/storage.js    — 커스텀 카드 / IndexedDB
js/soop.js       — SOOP WebSocket 연동
js/game.js       — 게임 로직
.github/workflows/pages.yml
```

## 커스텀 카드 추가

설정 → **카드 추가** 탭에서 이미지(2MB 이하)와 정보를 입력하세요.

코드로 추가하려면 `js/cards.js`의 `CARD_POOL` 배열을 수정합니다.
