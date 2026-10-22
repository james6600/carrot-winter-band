# 당근 겨울밴드 매칭소 🥕❄

겨울 합주 모임의 멤버 모집 · 취향 매칭 · 팀 구성을 돕는 웹앱.

- 간편 로그인(아이디+비밀번호, 회원가입 없음)
- 파트/장르 선택 → 최애 가수 입력(244팀 DB + AI 장르 분류)
- 마법의 모자 스타일 판정 + 취향 비슷한 멤버 매칭
- 모두의 음악 우주 대시보드(클릭하면 누가 골랐는지 표시)
- 관리자(`admin` 계정): 중복 아이디 합치기, 비밀번호 재설정, 삭제

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
4. 재배포(Redeploy) 후 접속. **`admin` 아이디를 가장 먼저 로그인해서 관리자 비밀번호를 선점하세요.**

## 구조

```
index.html            # 앱 전체 (단일 페이지)
api/login.js          # 로그인/계정 자동 생성
api/members.js        # 멤버 목록(GET) / 프로필 저장(POST)
api/artists.js        # 가수 DB 조회(GET) / 매칭+AI 분류(POST)
api/admin.js          # 관리자: 이름 변경·합치기, 비번 재설정, 삭제
lib/db.js             # Neon Postgres (없으면 로컬 JSON 파일)
lib/seed-artists.json # 가수 244팀 시드 데이터
scripts/dev-server.mjs# 로컬 개발 서버
```

> 간편 인증(SHA-256 해시, 토큰=해시)이라 민감한 비밀번호 사용은 금물.
> 소규모 모임용 수준의 보안입니다.
