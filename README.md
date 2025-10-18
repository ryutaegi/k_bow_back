# kbow-server

K-Bow 애플리케이션의 백엔드 서버입니다. 사용자 인증, 소셜 로그인, 게시판, 활쏘기, 그룹 관리를 위한 API를 제공합니다.

## 설치

1. 저장소를 복제합니다:
   ```bash
   git clone https://github.com/your-username/kbow-server.git
   ```
2. 종속성을 설치합니다:
   ```bash
   npm install
   ```
3. 루트 디렉토리에 `.env` 파일을 생성하여 환경 변수를 설정합니다. 다음 변수를 추가해야 합니다:
    ```
    SERVICE_APP_ADMIN_KEY=your_service_app_admin_key
    SECRET_KEY=your_secret_key
    ```
4. 서버를 시작합니다:
    ```bash
    npm start
    ```

## 사용 가능한 스크립트

- `npm start`: 서버를 시작합니다.

## API 엔드포인트

### 인증

- `POST /api/kakao/login`: 카카오 로그인
- `POST /api/naver/login`: 네이버 로그인
- `POST /api/apple/login`: 애플 로그인
- `POST /api/kakao/logout`: 카카오 로그아웃

### 게시판

- `GET /api/board/list/:boardType/:page`: 게시판 게시물 목록을 가져옵니다.
- `GET /api/board/detail/:board_id`: 게시판 게시물의 세부 정보를 가져옵니다.
- `POST /api/board/create`: 새 게시판 게시물을 작성합니다.
- `POST /api/board/delete/:board_id`: 게시판 게시물을 삭제합니다.
- `POST /api/board/modify/:board_id`: 게시판 게시물을 수정합니다.

### 활쏘기

- `POST /api/shot/save`: 활쏘기 기록을 저장합니다.
- `POST /api/shot/month`: 특정 월의 활쏘기 데이터를 가져옵니다.
- `POST /api/shot/detail`: 활쏘기 기록의 세부 정보를 가져옵니다.
- `POST /api/shot/modify`: 활쏘기 기록을 수정합니다.

### 그룹

- `GET /api/group/list`: 그룹 목록을 가져옵니다.
- `GET /api/group/join/list`: 가입한 그룹 목록을 가져옵니다.
- `POST /api/group/join/public`: 공개 그룹에 가입합니다.
- `POST /api/group/join/private`: 비공개 그룹에 가입합니다.
- `POST /api/group/list/memberdetail`: 그룹의 회원 세부 정보를 가져옵니다.
- `GET /api/group/rank/:group_id`: 그룹의 순위를 가져옵니다.
- `POST /api/group/make`: 새 그룹을 만듭니다.
- `POST /api/group/withdraw`: 그룹에서 탈퇴합니다.
- `POST /api/group/delete`: 그룹을 삭제합니다.
- `POST /api/group/select`: 그룹을 선택합니다.

### 동의

- `POST /api/agree/update`: 사용자의 동의를 업데이트합니다.

### 탈퇴

- `POST /api/withdraw/withdraw`: 서비스에서 탈퇴합니다.

## 종속성

- `axios`: 브라우저와 node.js를 위한 Promise 기반 HTTP 클라이언트
- `cookie-parser`: 쿠키 헤더를 파싱하고 req.cookies를 쿠키 이름으로 키가 지정된 객체로 채웁니다.
- `debug`: Node.js 코어의 디버깅 기술을 모델로 한 작은 자바스크립트 디버깅 유틸리티
- `dotenv`: `.env` 파일에서 `process.env`로 환경 변수를 로드하는 제로 종속성 모듈
- `express`: 빠르고, 독단적이지 않으며, 미니멀한 node용 웹 프레임워크
- `express-jwt`: JWT 인증 미들웨어
- `express-unless`: 미들웨어를 조건부로 건너뜁니다.
- `http-errors`: Express, Koa, Connect 등을 위한 HTTP 오류를 생성합니다.
- `jade`: HTML 작성을 위한 깨끗하고 공백에 민감한 템플릿 언어
- `jsonwebtoken`: JSON 웹 토큰의 구현
- `jwks-rsa`: JWKS(JSON 웹 키 세트) 엔드포인트에서 RSA 서명 키를 검색하는 라이브러리
- `moment-timezone`: 모든 시간대에서 날짜를 파싱하고 표시합니다.
- `morgan`: node.js용 HTTP 요청 로거 미들웨어
- `mysql`: mysql용 node.js 드라이버

## 데이터베이스

이 프로젝트는 MariaDB를 데이터베이스로 사용합니다. 연결은 `database/connect/maria.js`에서 구성됩니다.

## 인증

인증은 JSON 웹 토큰(JWT)을 사용하여 처리됩니다. `verifyToken` 미들웨어는 경로를 보호하는 데 사용됩니다.
