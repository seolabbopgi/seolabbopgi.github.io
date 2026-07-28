# seolabbopgi

SOOP 스트리머 **유설아♡** 테마의 포켓몬 TCG 스타일 카드 뽑기 게임.

**사이트 주소:** https://seolabbopgi.github.io

## 배포 (GitHub Pages User Site)

1. GitHub에서 조직 **`seolabbopgi`** 생성
2. 저장소 **`seolabbopgi.github.io`** 생성 (Public, README 추가 안 함)
3. 아래 push

```bash
git remote set-url origin https://github.com/seolabbopgi/seolabbopgi.github.io.git
git push -u origin main
```

4. **Settings → Pages → Source: GitHub Actions**

## 기능

| 기능 | 설명 |
|------|------|
| **1/10/20뽑** | 코인으로 카드팩 뽑기 |
| **숲(SOOP) 연동** | 별풍선 후원 → 채팅 `1`/`10`/`20` 자동 뽑기 |
| **커스텀 카드** | 이미지 업로드로 카드 추가 |
| **카드 도감** | 수집 현황 localStorage 저장 |

## SOOP 연동

⚙ 설정 → **숲 연동** → 스트리머 ID `yeveee` → **연동 시작**

중계 서버: `wss://relay.hedasong.com`

## 로컬 실행

`index.html`을 브라우저에서 열면 됩니다.
