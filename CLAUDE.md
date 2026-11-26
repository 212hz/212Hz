# 212Hz 초대장 — Claude 작업 지침 (이 프로젝트 한정)

프로젝트 구조·수정 방법은 [README.md](README.md) 참고.

## ⛔ 화면 확인(캡처) 후 프로세스 정리 — 매번 필수

2026-11-26 사고: 확인용 캡처 때마다 띄운 숨은 Edge(headless)가 닫히지 않고 7개 쌓여,
초대장 애니메이션을 계속 그리며 CPU를 잡아 **사용자 PC 전체가 버벅임**. 같은 일이 없도록 아래를 지킨다.

1. **캡처는 `tools/shot.mjs` 로만 한다.** msedge 를 직접 `--headless` 로 띄우거나 임시 스크립트를 새로 만들지 않는다.
   이 도구는 끝·오류·60초 초과 시 이 실행이 띄운 Edge 를 닫고 0개인지 확인한다(남으면 종료 코드 3).
   ⚠ Edge 는 시작 직후 스스로 재실행되므로 처음 PID 로 `kill`·`taskkill /T` 해도 남는다 — 반드시 프로필 폴더 이름(`edge-cdp-`)으로 찾아 끈다.
   ```
   node tools/shot.mjs http://127.0.0.1:8212/ <저장경로접두어> sections   # 또는 open / intro
   ```
   - 저장 위치는 세션 scratchpad 폴더(프로젝트 안에 캡처 파일을 남기지 않는다).
   - Bash `timeout` 은 90초 이하로 주고, 명령이 백그라운드로 넘어가면 다음 캡처를 돌리기 전에 원인부터 확인·정리한다.
     **같은 캡처를 겹쳐 실행하지 않는다.**
2. **캡처 직후 매번** 남은 Edge 가 없는지 확인한다 (프로필 폴더 이름 `edge-cdp-` 로 구분 — 사용자가 쓰는 Edge 는 건드리지 않는다).
   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*edge-cdp-*' } | Select-Object ProcessId
   ```
   남아 있으면 그 PID 만 `taskkill /F /T /PID <PID>` 로 종료하고 다시 확인한다.
3. **미리보기 서버**(`python tools/preview.py 8212`)는 내가 띄웠으면 작업이 끝날 때 끈다.
   포트 8212 를 쓰는 프로세스의 명령줄이 `tools/preview.py` 인지 확인한 뒤 그 PID 만 종료한다. python 전체를 끄지 않는다.
4. **완료 보고 전 확인**: ① `edge-cdp-` Edge 0개 ② 8212 대기 프로세스 0개. 둘 다 0일 때만 "끝났다"고 보고한다.
5. 사용자가 "느리다·버벅인다"고 하면 작업을 멈추고 위 ①② 부터 확인·정리한다.

## 배포 (수정 후 바로 반영)

- `main` 에 push 하면 GitHub Actions 가 1~2분 안에 https://212hz.github.io/212Hz/ 에 반영하고, 열린 초대장도 자동 새로고침된다.
- 이 저장소는 GitHub 계정 **GunHoLee** 로 push 한다 (로컬 설정 `credential.https://github.com.username=GunHoLee`).
  전역 기본값 GunHoLee2 는 권한이 없어 403 이 난다.
- 반영 확인: `https://212hz.github.io/212Hz/version.json` 의 `build` 가 방금 커밋 ID 앞 7자리와 같은지 본다.
