# 당근 겨울밴드 매칭소 🥕❄

겨울 합주 모임의 멤버 모집 · 취향 매칭 · 팀 구성을 돕는 웹앱.

- 간편 로그인(아이디+비밀번호, 회원가입 없음)
- 파트/장르 선택 → 최애 가수 입력(약 1,000팀 DB + AI 장르 분류)
- 합주 가능 시간: 11–12월을 2시간 칸으로 칠하는 시간표 (드래그, 빠른 선택)
- 마법의 모자 스타일 판정 + 취향 60%·겹치는 시간 40%로 멤버 매칭
- 파트를 채워 밴드를 자동으로 짜주는 기능, 모두의 합주 시간 히트맵
- 모두의 음악 대시보드(숫자·막대·칸을 누르면 누가 골랐는지 표시)
- 의견 보내기(오류 보고·기능 제안): 누구나 보낼 수 있고, 로그인하면 처리 상태와 운영진 답장 확인
- 관리자 페이지 `/backstage` (일반 화면에 링크 없음, 검색엔진 수집 차단)
  - 최고 관리자: 모든 권한 + 관리자 추가·삭제·권한 변경·비번/2단계 초기화, 회원 비번 재설정·삭제, 활동 기록
  - 의견함: 최고·서브 모두 상태 변경·답장 가능, 삭제는 최고 관리자만
  - 서브 관리자: 회원 일정 조율(겹치는 시간 보기·회원 시간 수정), 닉네임 변경·중복 계정 합치기
  - 로그인: 아이디·비밀번호(scrypt) → Authenticator 6자리 코드(TOTP) → 8시간 HttpOnly 쿠키 세션
  - 5회 실패 시 10분 잠금, 코드 재사용 차단, 모든 관리 작업 기록

합주 기간과 시간 칸은 `app.js`와 `lib/util.js` 양쪽의 `RANGE_START`, `RANGE_END`, `SLOT_HOURS`를 같이 고치면 바뀝니다.
가수 DB 조사 결과는 `scripts/merge-research.mjs`로 합칩니다 (국내 락페 라인업 2021–2026, 빌보드·그래미·UK·빌보드 재팬 차트).

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

로컬에서는 DB 없이 `data/dev-db.json` 파일에 저장됩니다(git에서 제외됨).

## Vercel 배포

1. GitHub에 push한 뒤 [vercel.com](https://vercel.com) → **Add New Project** → 이 저장소 Import (Framework: Other, 설정 그대로 Deploy).
   - 또는 터미널에서 `npm i -g vercel && vercel` 로 직접 배포.
2. **DB 연결**: Vercel 프로젝트 → Storage 탭 → **Create Database → Neon (Postgres)** → Connect.
   - `DATABASE_URL` 환경변수가 자동 등록됩니다. 테이블 생성과 가수 244팀 시딩은 첫 요청 때 서버가 자동으로 합니다.
3. **(선택) 마법 수정구**: Settings → Environment Variables에 `ANTHROPIC_API_KEY` 추가.
   - 키가 없으면 DB에 없는 가수는 수동 장르 선택으로 동작합니다.
4. 재배포(Redeploy) 후 `/backstage`에 접속해 최초 설정으로 최고 관리자를 만들고 Authenticator를 등록하세요.
   - 본인 확인은 예전 `admin` 회원 비밀번호로 합니다. 그런 회원이 없으면 환경변수 `ADMIN_SETUP_KEY`를 정해두고 그 값을 입력하세요.

## 구조

```
index.html            # 앱 전체 (단일 페이지)
api/login.js          # 로그인/계정 자동 생성
api/members.js        # 멤버 목록(GET) / 프로필 저장(POST)
api/artists.js        # 가수 DB 조회(GET) / 매칭+AI 분류(POST)
api/feedback.js       # 오류 보고·기능 제안 보내기 / 내 의견 보기
api/backstage.js      # 관리자 API (권한별 기능, 2단계 인증, 세션, 활동 기록)
backstage/            # 관리자 페이지 (검색 차단)
lib/admin-auth.js     # 관리자 비밀번호 해시·TOTP·세션 쿠키
lib/db.js             # Neon Postgres (없으면 로컬 JSON 파일)
lib/seed-artists.json # 가수 244팀 시드 데이터
scripts/dev-server.mjs# 로컬 개발 서버
```

> 간편 인증(SHA-256 해시, 토큰=해시)이라 민감한 비밀번호 사용은 금물.
> 소규모 모임용 수준의 보안입니다.
