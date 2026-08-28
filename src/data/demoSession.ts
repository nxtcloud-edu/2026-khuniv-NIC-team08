import type { DemoSession } from "../types/session";

/** 사전 처리된 시연용 정적 세션. 실시간 녹음·캡처 결과가 아니다. */
export const demoSession: DemoSession = {
  id: "session-os-week05",
  title: "운영체제 5주차 · 프로세스와 컨텍스트 스위치",
  duration: "00:45:00",
  pages: [
    {
      pageNumber: 10,
      imagePath: "/demo/pages/page-10.png",
      title: "프로세스 상태 전이",
    },
    {
      pageNumber: 12,
      imagePath: "/demo/pages/page-12.png",
      title: "컨텍스트 스위치 동작 구조",
    },
    {
      pageNumber: 15,
      imagePath: "/demo/pages/page-15.png",
      title: "과제 안내 · 스케줄링 시뮬레이터",
    },
  ],
  memories: [
    {
      id: "memory-001",
      timestamp: "00:08:15",
      pageNumber: 10,
      transcript:
        "지난 시간에 다룬 프로세스 생성 과정을 간단히 복습하고 넘어가겠습니다.",
      summary: "지난 주차 프로세스 생성 내용을 짧게 복습함",
      importance: "normal",
      keywords: ["복습", "지난주", "지난 시간", "프로세스 생성", "도입"],
    },
    {
      id: "memory-002",
      timestamp: "00:12:05",
      pageNumber: 10,
      transcript:
        "프로세스 상태 전이에서 준비 상태와 대기 상태를 구분하는 것이 이 과목의 핵심 개념입니다.",
      summary:
        "교수님이 준비 상태와 대기 상태의 구분을 강의의 핵심 개념으로 설명함",
      importance: "key",
      keywords: [
        "핵심",
        "핵심 개념",
        "중요",
        "개념",
        "요점",
        "정리",
        "프로세스 상태",
        "상태 전이",
        "준비 상태",
        "대기 상태",
      ],
    },
    {
      id: "memory-003",
      timestamp: "00:18:32",
      pageNumber: 12,
      transcript:
        "오른쪽 그림의 컨텍스트 스위치 순서를 잘 보세요. 이 부분은 시험에 나옵니다.",
      summary:
        "교수님이 12페이지 오른쪽 컨텍스트 스위치 구조도를 시험 출제 부분으로 지목함",
      importance: "exam",
      keywords: [
        "시험",
        "출제",
        "나온다",
        "나옵니다",
        "평가",
        "중간고사",
        "오른쪽 그림",
        "구조도",
        "컨텍스트 스위치",
        "PCB",
      ],
    },
    {
      id: "memory-004",
      timestamp: "00:23:10",
      pageNumber: 15,
      transcript:
        "스케줄링 시뮬레이터 과제는 다음 주 금요일 밤 11시 59분까지 LMS에 제출하세요.",
      summary:
        "스케줄링 시뮬레이터 과제 제출 기한이 다음 주 금요일 23:59로 안내됨",
      importance: "assignment",
      keywords: [
        "과제",
        "제출",
        "마감",
        "기한",
        "언제까지",
        "데드라인",
        "다음 주 금요일",
        "LMS",
        "스케줄링 시뮬레이터",
      ],
    },
  ],
};
