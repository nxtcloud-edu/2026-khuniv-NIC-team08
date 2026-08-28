# 실제 강의 fixture

이 디렉터리의 PDF와 녹음 전사를 이용해 실제 강의 기반 데모를 재현할 수 있습니다.
전체 원본 영상은 참가자 정보가 포함되고 용량이 크므로 Git에 올리지 않습니다. 대신 준비 명령이 참가자 영역을 제거하고 해상도·프레임률을 낮춘 공개용 영상을 만듭니다.

## 사용하기

저장소를 받은 사용자는 별도 전처리 도구 없이 다음 명령으로 fixture와 앱을 검증할 수 있습니다.

```bash
npm install
npm run smoke
npm run dev
```

브라우저에서 `http://localhost:5173/?demo=example`을 열면 실제 강의 페이지·발언·영상이 연결된 세션이 표시됩니다. 타임라인 또는 검색 근거를 선택하면 PDF 페이지와 발언이 강조되고 영상도 해당 시각으로 이동합니다. 영상을 재생하면 그때 화면에 떠 있던 PDF 페이지로 자동으로 따라 넘어갑니다.

파일 업로드와 처리 화면까지 포함한 전체 흐름은 `npm run dev:demo`로 실행합니다.

예시 질문:

- `학습 방식 세 가지가 뭐야?`
- `확률을 계속 곱하면 작아지는 문제는 어떻게 해결해?`
- `정규화가 뭐야?`
- `마지막 퀴즈는 언제야?`

fixture만 빠르게 검사하려면 `npm run example:check`를 실행합니다.

## 세션 다시 만들기

`example/session.json`은 손으로 쓰지 않고 원본에서 생성합니다. `ffmpeg`가 설치되어 있으면 다음 명령으로 다시 만들 수 있습니다.

```bash
npm run session:build            # OpenAI 키를 써서 요약까지 생성
npm run session:build -- --skip-llm   # 요약을 규칙 기반으로 (네트워크 불필요, 약 8초)
```

이 명령은 다음 작업을 수행합니다.

1. 이미지 기반 PDF의 68개 페이지를 `public/example/pages/`에 그대로 씁니다.
2. 공개용 영상을 1초 간격으로 훑어 3,173장의 화면을 뽑고, 페이지와 함께 32×32 흑백 축소본으로 만듭니다.
3. 정규화 상관도로 화면과 페이지를 맞춰 슬라이드 구간 71개를 찾고, 구간마다 대표 프레임을 `public/example/frames/`에 저장합니다.
4. 전사의 벽시계 시간을 영상 시작 시각 `14:01:25` 기준 상대 시간으로 환산해 발언을 구간에 배정합니다.
5. 구간별 발언을 `gpt-4o-mini`에 넘겨 주제·요약·중요도·키워드를 받아 Memory Unit 67개를 만듭니다. 같은 프롬프트는 `example/.llm-cache.json`에 캐시되어 다시 묻지 않습니다.

시각·페이지·발언 원문은 모델이 아니라 생성기가 원본에서 채웁니다. 따라서 `npm run example:check`가 모든 Memory Unit을 전사 원문과 대조해 검증할 수 있습니다.

원본 영상에서 공개용 MP4를 다시 만들려면(참가자 영역 제거, 1280×720, 5fps, 모노 음성):

```bash
npm run example:prepare
```

원본 영상은 `.gitignore`에 포함되며, Git에는 다음 파일만 추가합니다.

- `example/EXAMPLE.md`
- `example/session.json`
- `example/MLbasics_문상혁.pdf`
- `example/DAVIAN Basic Study 2026-07-08 14_00(GMT+9_00).txt`
- `public/example/lecture.mp4`
- `public/example/pages/*.jpg` (68장)
- `public/example/thumbs/*.jpg`, `public/example/frames/*.jpg` (처리 화면용 축소본)

원본 자료를 공개하기 전에 강의 자료의 배포 권한과 전사에 포함된 개인정보를 확인해야 합니다. 프로젝트 전체 실행 방법은 [README.md](../README.md)를 참고하세요.
