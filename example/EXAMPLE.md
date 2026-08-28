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

브라우저에서 `http://localhost:5173/?demo=example`을 열면 실제 강의 페이지·발언·영상이 연결된 세션이 표시됩니다. 타임라인 또는 검색 근거를 선택하면 PDF 페이지와 발언이 강조되고 영상도 해당 시각으로 이동합니다.

예시 질문:

- `학습 방식 세 가지가 뭐야?`
- `확률을 계속 곱하면 작아지는 문제는 어떻게 해결해?`
- `정규화가 뭐야?`
- `마지막 퀴즈는 언제야?`

fixture만 빠르게 검사하려면 `npm run example:check`를 실행합니다.

## fixture 다시 만들기

유지보수자가 원본 영상을 가지고 있고 `ffmpeg`가 설치되어 있다면 다음 명령으로 공개용 영상을 다시 만들 수 있습니다.

```bash
npm run example:prepare
```

이 명령은 다음 작업을 수행합니다.

1. 이미지 기반 PDF의 68개 페이지를 검사합니다.
2. manifest가 지정한 3·20·30·59페이지의 내장 JPEG를 추출합니다.
3. 전사의 벽시계 시간을 영상 시작 시각 `14:01:25` 기준 상대 시간으로 검증합니다.
4. 영상 오른쪽 참가자 영역을 제거하고 1280×720, 5fps, 모노 음성의 공개용 MP4를 생성합니다.
5. 생성 결과가 PDF·전사·manifest와 일치하는지 다시 검사합니다.

원본 영상은 `.gitignore`에 포함되며, Git에는 다음 파일만 추가합니다.

- `example/EXAMPLE.md`
- `example/session.json`
- `example/MLbasics_문상혁.pdf`
- `example/DAVIAN Basic Study 2026-07-08 14_00(GMT+9_00).txt`
- `public/example/lecture.mp4`
- `public/example/pages/*.jpg`

원본 자료를 공개하기 전에 강의 자료의 배포 권한과 전사에 포함된 개인정보를 확인해야 합니다. 프로젝트 전체 실행 방법은 [README.md](../README.md)를 참고하세요.
