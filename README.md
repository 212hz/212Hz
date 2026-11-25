# 211Hz — 작곡가 이원희 작품발표회 모바일 초대장

현대음악과 가곡을 만나다 · 낯섦과 익숙함
2026년 12월 10일(목) 오후 7시 30분 · 시각예술 임채은

## 구조

```
index.html          초대장 본문
css/style.css       스타일 (네이비 / 금빛·은빛 라인, 번짐 효과)
js/main.js          눈 효과, 달력, D-day, 공유/링크 복사
assets/img/         웹용으로 줄인 이미지 (poster, composer, artist)
images/             원본 이미지
```

## 미리보기

`index.html`을 브라우저로 열면 됩니다. 별도 빌드는 없습니다.

## 배포 (자동 업데이트)

- 주소: https://gunholee.github.io/211Hz/
- `main` 브랜치에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 자동으로 Pages에 배포합니다 (1~2분 소요).
- 최초 1회: 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 설정.
- 수동 재배포: Actions 탭 → *Deploy invitation to GitHub Pages* → **Run workflow**.

수정 흐름:

```
git add -A
git commit -m "변경 내용"
git push
```

## 추후 입력할 정보

- 세부 곡목·연주자
- 작곡가 이원희 프로필
- 카카오톡 미리보기가 갱신되지 않으면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시 초기화
