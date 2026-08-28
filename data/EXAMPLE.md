# 📚 테스트 데이터 안내

`data/`와 `public/data/`에는 AnythingNote의 실제 강의 세션을 실행하고 검증하기 위한 데이터가 들어 있습니다. 강의 PDF, 전사, 영상에서 생성한 결과를 함께 사용해 발언과 문서 페이지, 영상 시각의 연결을 재현합니다.

서비스 설치와 전체 사용 방법은 [README.md](../README.md)를 참고합니다.

## 🗂️ 데이터 구성

| 경로 | 내용 |
| --- | --- |
| `data/session.json` | 페이지, 슬라이드 구간, Memory Unit, 공개용 영상 경로를 담은 세션 데이터 |
| `data/MLbasics_문상혁.pdf` | 페이지 매칭에 사용하는 원본 강의 PDF |
| `data/DAVIAN Basic Study 2026-07-08 14_00(GMT+9_00).txt` | 시각과 발언자가 포함된 강의 전사 |
| `data/20260708_딥러닝_1.mp4` | 공개용 영상을 만드는 원본 영상이며 Git에는 포함되지 않음 |
| `data/.llm-cache.json` | 세션 재생성 시 사용하는 LLM 응답 캐시이며 Git에는 포함되지 않음 |
| `public/data/lecture.mp4` | 브라우저에서 재생하는 공개용 강의 영상 |
| `public/data/pages/*.jpg` | PDF에서 추출한 68개 페이지 이미지 |
| `public/data/thumbs/*.jpg` | 처리 화면에 사용하는 페이지 축소 이미지 |
| `public/data/frames/*.jpg` | 71개 슬라이드 구간의 대표 프레임 |

## ✅ 데이터 검증

처음 저장소를 받은 경우 의존성을 설치합니다.

```bash
npm install
```

데이터만 빠르게 검증하려면 다음 명령을 실행합니다.

```bash
npm run example:check
```

이 검사는 다음 항목을 확인합니다.

- PDF 페이지 수가 68개인지 확인합니다.
- 전사 구간 수가 495개인지 확인합니다.
- 모든 Memory Unit의 시각과 발언 원문을 전사와 대조합니다.
- 페이지 이미지가 PDF에 포함된 JPEG와 일치하는지 확인합니다.
- 공개용 영상이 유효한 MP4 파일인지 확인합니다.

데이터와 애플리케이션을 함께 검증하려면 다음 명령을 사용합니다.

```bash
npm run smoke
```

`smoke`는 데이터 무결성 검사, 전체 Vitest 테스트, 타입 검사와 프로덕션 빌드를 순서대로 실행합니다. 개별 검사가 필요하면 `npm run test`, `npm run lint`, `npm run build`를 각각 실행할 수 있습니다.

## 🎓 데이터로 서비스 확인

```bash
npm run dev:example
```

브라우저에서 `http://localhost:5173/?demo=example`을 엽니다. 타임라인 또는 검색 결과의 근거 카드를 선택하면 PDF 페이지, 발언 강조, 영상 시각이 함께 이동합니다.

다음 질문으로 검색 결과와 근거 연결을 확인할 수 있습니다.

- `학습 방식 세 가지가 뭐야?`
- `확률을 계속 곱하면 작아지는 문제는 어떻게 해결해?`
- `정규화가 뭐야?`
- `마지막 퀴즈는 언제야?`

업로드와 처리 화면부터 확인하려면 `npm run dev:demo`를 실행합니다. 자세한 시연 순서와 예상 근거는 README의 [테스트 실행 방법](../README.md#-테스트-실행-방법)을 참고합니다.

## ♻️ 세션 데이터 재생성

세션을 다시 생성하려면 FFmpeg가 필요합니다. `data/session.json`은 직접 편집하지 않고 원본 PDF, 전사, 공개용 영상으로부터 생성합니다.

```bash
npm run session:build
npm run session:build -- --skip-llm
```

- `npm run session:build`는 OpenAI 설정이 있으면 LLM으로 주제, 요약, 중요도, 키워드를 생성합니다.
- `--skip-llm`은 외부 API 없이 규칙 기반 요약을 사용합니다.

생성 과정은 PDF 페이지 추출, 영상 프레임과 페이지 매칭, 슬라이드 구간 생성, 전사 결합, Memory Unit 생성을 차례로 수행합니다. 생성된 페이지와 대표 프레임은 `public/data/`에 저장됩니다.

원본 영상으로 공개용 영상을 다시 만들려면 다음 명령을 실행합니다.

```bash
npm run example:prepare
```

원본 자료를 추가하거나 배포하기 전에는 강의 자료의 배포 권한과 전사에 포함된 개인정보를 확인해야 합니다.
