# AnythingNote

2026년 경희대학교 Nexus Innovation Challenge 08팀 AOM팀의 레포지토리입니다.

AnythingNote는 회의나 강의에서 **어떤 발언을 들을 때 무엇을 보고 있었는지**를 함께 기억하는 멀티모달 AI 노트입니다.
발언 타임스탬프와 그 시점의 화면을 하나의 `Memory Unit`으로 묶어 두고, 질문했을 때 답변과 함께 **정확한 장면**을 근거로 돌려줍니다.

이 저장소는 그 핵심 경험을 검증하기 위한 **녹화 시연용 최소 MVP**입니다.

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 주소(기본 `http://localhost:5173`)를 브라우저에서 엽니다.
설치가 끝난 뒤에는 **인터넷 연결 없이** 모든 시연이 동작합니다.

## 사용해 보기

1. 앱을 열면 준비된 강의 세션과 첫 페이지(PDF 10페이지)가 표시됩니다.
2. 오른쪽 타임라인에서 발언을 선택하면 그 발언이 가리키는 PDF 페이지로 함께 이동합니다.
3. 아래 질문창에 한국어로 질문하고 `검색`을 누릅니다.
4. 답변과 함께 `시각 · PDF 페이지`가 적힌 근거 카드가 나타납니다.
5. 근거 카드를 선택하면 해당 페이지와 타임라인 발언이 동시에 강조됩니다.

시연용 질문 예시:

| 질문 | 결과 |
| --- | --- |
| 시험에 나온다고 한 부분이 뭐야? | `18:32 · PDF 12페이지` 시험 Memory Unit |
| 과제는 언제까지야? | `23:10 · PDF 15페이지` 과제 Memory Unit |
| 핵심 개념이 뭐야? | `12:05 · PDF 10페이지` 핵심 Memory Unit |
| 오늘 점심 메뉴가 뭐야? | "관련 근거를 찾지 못했습니다." |

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run test` | 단위 · 통합 테스트 실행 (Vitest) |
| `npm run lint` | ESLint 검사 |

## 이번 MVP의 범위

이 MVP는 **사전 처리된 정적 데이터**로 동작합니다. 실시간 처리 파이프라인은 구현되어 있지 않습니다.

구현된 것

- 준비된 강의 세션 불러오기
- PDF 페이지 이미지 뷰어와 페이지 이동
- 시간순 발언 타임라인과 중요도 배지(시험 · 과제 · 핵심 · 일반)
- 발언과 페이지를 잇는 Memory Unit
- 한국어 질문에 대한 로컬 키워드 검색과 답변 생성
- 시각 · 페이지 · 발언 원문 · 요약이 담긴 근거 카드
- 근거 선택 시 PDF 페이지와 타임라인 동시 강조

구현되지 않은 것

- 실시간 마이크 녹음, 시스템 오디오 녹음
- Whisper 등 실제 음성 인식
- 실시간 화면 캡처 및 변화 감지, OCR
- BM25 · 임베딩 검색, 데이터베이스 서버
- 실제 온디바이스 SLM 추론
- 데스크톱 설치 파일

화면 곳곳의 `On-device concept demo`, `Local demo data` 표기는 이 MVP가 사전 처리된 데모 데이터로 동작한다는 뜻입니다.
발표와 시연에서도 위 범위를 그대로 설명해 주세요.

## 프로젝트 구조

```
public/demo/pages/        시연용 mock 강의 페이지 이미지 (10 · 12 · 15페이지)
src/types/session.ts      DemoSession · DocumentPage · MemoryUnit 공통 타입
src/data/demoSession.ts   정적 데모 세션 데이터
src/lib/search.ts         로컬 키워드 검색과 답변 생성
src/components/workspace/ HeaderStatus · DocumentViewer · Timeline
src/components/search/    QuestionPanel · EvidenceCard
src/styles/               tokens.css · global.css · app.css
src/App.tsx               전체 상태 조립 (현재 페이지 · 선택된 Memory Unit)
```

검색은 외부 API 없이 `src/lib/search.ts`에서 결정적으로 동작합니다.
질문을 정규화한 뒤 동의어 그룹(시험·출제·나온다 / 과제·제출·마감 / 핵심·중요·개념)과 각 Memory Unit의
`keywords` · `transcript` · `summary` 겹침을 점수화하고, 일치하는 어휘가 없으면 추측하지 않고 근거 없음을 표시합니다.

30초 시연 순서는 [DEMO.md](DEMO.md)를 참고하세요.
