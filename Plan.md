[지시 사항] 너는 이제부터 나의 '수석 게임 개발자' 에이전트야. 아래 기획서를 바탕으로 **초등학생 아이들이 웹에서 바로 접속해 즐길 수 있는 실시간 멀티플레이 게임(2D Top-down RPG 스타일)**을 구축해줘.

1. 프로젝트 개요
프로젝트명: Huey World 

목표: 별도의 설치 없이 URL만으로 접속하여, 친구들과 캐릭터로 만나고 채팅할 수 있는 가상 공간 구현.

타겟: 초등학교 저학년 (UI가 직관적이고 귀여워야 함).

배포 환경: 내 로컬 PC에서 Python 서버 구동 후, Cloudflare Tunnel을 통해 외부 접속.

2. 기술 스택 (Constraints)
Backend (Server):

언어: Python 3.10+

프레임워크: FastAPI (웹 서버), python-socketio (실시간 통신), uvicorn (ASGI 실행)

데이터 저장: 초기 MVP 단계이므로 DB 없이 In-Memory(Python Dictionary) 로 접속자 상태 관리.

Frontend (Client):

게임 엔진: Phaser 3 (CDN 로드 방식 사용, 번들러 없이 ES6 Modules로 작성)

언어: Vanilla JavaScript

Assets:

플레이어는 일단 단순한 색깔 박스(Rect)나 원으로 구현하고, 추후 이미지로 교체하기 쉽게 구조화할 것.

3. 디렉토리 구조
프로젝트 루트에 아래 구조로 파일들을 생성해줘.

Plaintext

/project-root
  ├── server.py          # FastAPI + Socket.IO 메인 서버
  ├── requirements.txt   # 파이썬 의존성 (fastapi, uvicorn, python-socketio 등)
  └── static/            # 클라이언트 정적 파일
      ├── index.html     # 게임 진입점 (Phaser 로드)
      ├── js/
      │   ├── game.js    # Phaser 메인 설정
      │   ├── main.scene.js # 게임 로직 (Update, Create)
      │   └── socket.manager.js # Socket.IO 통신 관리자 (NetworkManager)
      └── assets/        # 이미지 폴더 (비워두거나 더미 파일)
4. 핵심 기능 요구사항 (MVP)
Phase 1. 접속 및 이동 (동기화)

서버: 유저가 접속(connect)하면 고유 sid를 부여하고, 랜덤 좌표와 랜덤 색상(Hex)을 할당하여 메모리에 저장.

서버: 새로운 유저 정보를 current_players (현재 접속자 전체 목록) 이벤트로 전송.

클라이언트: 방향키(Arrow Keys) 입력 시 이동 처리.

클라이언트: 이동할 때마다 player_move 이벤트를 서버로 전송 (x, y 좌표).

서버: 받은 좌표를 브로드캐스트하여 다른 클라이언트 화면에서도 해당 유저가 움직이게 처리. (보간법 고려하지 말고 일단 즉시 이동으로 구현)

Phase 2. 상호작용

닉네임: 접속 시 prompt()로 닉네임을 입력받아 머리 위에 표시.

접속/종료 알림: 누군가 들어오거나 나가면 화면 구석에 텍스트 로그 표시.

💡 아빠 개발자를 위한 추가 팁 (Antigravity 활용법)
위 프롬프트를 입력하면 에이전트가 파일별 코드를 우르르 쏟아낼 겁니다. 그때 이렇게 단계별로 진행하시면 더 깔끔합니다.

1단계: 뼈대 잡기

"일단 requirements.txt랑 server.py 기본 골격, 그리고 index.html만 먼저 작성해줘. 서버가 정상적으로 뜨는지부터 확인할게."

2단계: Phaser 연동

"좋아. 이제 static/js/game.js를 작성해서 화면에 800x600 캔버스를 띄우고, 플레이어(네모 박스) 하나가 방향키로 움직이는 것까지만 구현해봐. (통신 제외)"

3단계: 멀티플레이 붙이기

"완벽해. 이제 socket.manager.js를 작성해서 내 움직임을 서버로 보내고, 다른 브라우저 창을 띄웠을 때 서로 움직임이 보이는지(동기화) 구현해줘."

4단계: 그래픽 입히기 (아드님 참여 구간)

"이제 네모 박스 대신 assets/player.png 이미지를 사용하도록 코드를 바꿔줘." (이때 아드님이 그린 그림을 static/assets 폴더에 넣어주시면 됩니다)