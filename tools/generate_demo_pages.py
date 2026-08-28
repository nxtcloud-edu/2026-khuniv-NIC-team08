"""데모용 mock 강의 슬라이드 PNG 생성기.

실제 강의 PDF 대신 사용하는 중립적인 발표용 자료를 만든다.
실행: python tools/generate_demo_pages.py  (Pillow + 맑은 고딕 필요)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1400, 1050
OUT = Path(__file__).resolve().parent.parent / "public" / "demo" / "pages"

NAVY = (22, 35, 60)
MUTED = (85, 99, 122)
SUBTLE = (138, 147, 164)
TEAL = (14, 124, 134)
TEAL_SOFT = (226, 241, 242)
ORANGE = (217, 106, 20)
ORANGE_SOFT = (253, 237, 220)
LINE = (200, 205, 214)
PAPER = (255, 255, 255)
BAND = (246, 245, 241)

REG = "C:/Windows/Fonts/malgun.ttf"
BOLD = "C:/Windows/Fonts/malgunbd.ttf"


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, size)


def base(page_no, title):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 150], fill=BAND)
    d.line([(0, 150), (W, 150)], fill=LINE, width=2)
    d.rectangle([70, 58, 78, 118], fill=TEAL)
    d.text((100, 60), title, font=font(46, True), fill=NAVY)
    d.text((100, 118), "운영체제 5주차 · 프로세스와 컨텍스트 스위치", font=font(22), fill=MUTED)
    d.line([(0, H - 90), (W, H - 90)], fill=LINE, width=2)
    d.text(
        (70, H - 62),
        "AnythingNote 데모용 mock 강의 자료 · 실제 강의 자료가 아닙니다",
        font=font(20),
        fill=SUBTLE,
    )
    d.text((W - 70, H - 62), f"{page_no}", font=font(24, True), fill=MUTED, anchor="ra")
    return img, d


def bullets(d, x, y, items, width_font=26, gap=54):
    f = font(width_font)
    for i, text in enumerate(items):
        cy = y + i * gap
        d.ellipse([x, cy + 11, x + 10, cy + 21], fill=TEAL)
        d.text((x + 26, cy), text, font=f, fill=NAVY)


def box(d, rect, label, sub=None, fill=PAPER, outline=LINE, text_fill=NAVY, width=2):
    d.rounded_rectangle(rect, radius=14, fill=fill, outline=outline, width=width)
    cx = (rect[0] + rect[2]) / 2
    cy = (rect[1] + rect[3]) / 2
    if sub:
        d.text((cx, cy - 16), label, font=font(26, True), fill=text_fill, anchor="mm")
        d.text((cx, cy + 18), sub, font=font(19), fill=MUTED, anchor="mm")
    else:
        d.text((cx, cy), label, font=font(26, True), fill=text_fill, anchor="mm")


def arrow(d, start, end, color=MUTED, width=3, head=11):
    d.line([start, end], fill=color, width=width)
    x0, y0 = start
    x1, y1 = end
    if abs(x1 - x0) >= abs(y1 - y0):
        s = 1 if x1 > x0 else -1
        d.polygon(
            [(x1, y1), (x1 - s * head * 1.6, y1 - head), (x1 - s * head * 1.6, y1 + head)],
            fill=color,
        )
    else:
        s = 1 if y1 > y0 else -1
        d.polygon(
            [(x1, y1), (x1 - head, y1 - s * head * 1.6), (x1 + head, y1 - s * head * 1.6)],
            fill=color,
        )


def page_10():
    img, d = base(10, "프로세스 상태 전이")
    bullets(
        d,
        90,
        210,
        [
            "프로세스는 실행 도중 여러 상태를 오간다",
            "준비(Ready) 상태는 CPU만 기다리는 상태",
            "대기(Waiting) 상태는 입출력 완료를 기다리는 상태",
            "두 상태의 구분이 스케줄링 이해의 출발점",
        ],
    )
    y = 520
    box(d, [110, y, 350, y + 120], "생성", "New")
    box(d, [470, y, 710, y + 120], "준비", "Ready", fill=TEAL_SOFT, outline=TEAL)
    box(d, [830, y, 1070, y + 120], "실행", "Running")
    box(d, [1130, y, 1330, y + 120], "종료", "Terminated")
    box(d, [470, y + 230, 710, y + 350], "대기", "Waiting", fill=TEAL_SOFT, outline=TEAL)
    arrow(d, (350, y + 60), (462, y + 60))
    arrow(d, (710, y + 60), (822, y + 60))
    arrow(d, (1070, y + 60), (1122, y + 60))
    arrow(d, (880, y + 120), (716, y + 272), color=SUBTLE)
    arrow(d, (560, y + 230), (560, y + 128))
    d.text((830, y + 200), "입출력 요청", font=font(20), fill=MUTED)
    d.text((540, y + 165), "입출력 완료", font=font(20), fill=MUTED, anchor="ra")
    return img


def page_12():
    img, d = base(12, "컨텍스트 스위치 동작 구조")
    bullets(
        d,
        90,
        210,
        [
            "실행 중인 프로세스를 교체하는 절차",
            "PCB에 레지스터와 프로그램 카운터를 저장",
            "다음 프로세스의 PCB를 복원한 뒤 제어를 넘김",
            "전환 비용은 순수한 오버헤드",
        ],
        gap=60,
    )
    d.rounded_rectangle([700, 195, 1340, 900], radius=18, fill=ORANGE_SOFT, outline=ORANGE, width=3)
    d.text((730, 220), "그림 12-2. 컨텍스트 스위치 순서", font=font(24, True), fill=ORANGE)
    steps = [
        ("① 인터럽트 발생", "타이머 또는 시스템 콜"),
        ("② PCB A에 상태 저장", "레지스터 · PC · 스택 포인터"),
        ("③ 스케줄러가 다음 선택", "준비 큐에서 프로세스 B"),
        ("④ PCB B에서 상태 복원", "저장된 실행 문맥 로드"),
        ("⑤ 프로세스 B 실행 재개", "제어권 이동 완료"),
    ]
    y = 270
    for label, sub in steps:
        box(d, [740, y, 1300, y + 96], label, sub, fill=PAPER, outline=ORANGE, width=2)
        if y < 270 + 4 * 120:
            arrow(d, (1020, y + 96), (1020, y + 116), color=ORANGE, width=3, head=8)
        y += 120
    return img


def page_15():
    img, d = base(15, "과제 안내 · 스케줄링 시뮬레이터")
    bullets(
        d,
        90,
        215,
        [
            "라운드 로빈과 SJF 스케줄러를 직접 구현",
            "입력: 프로세스 도착 시각과 실행 시간 표",
            "출력: 평균 대기 시간과 간트 차트",
            "보고서 2페이지 이내, 코드와 함께 압축 제출",
        ],
        gap=58,
    )
    d.rounded_rectangle([90, 520, 1310, 720], radius=18, fill=TEAL_SOFT, outline=TEAL, width=3)
    d.text((130, 552), "제출 기한", font=font(24, True), fill=TEAL)
    d.text((130, 600), "다음 주 금요일 23:59까지 · LMS 과제 게시판", font=font(38, True), fill=NAVY)
    d.text((130, 660), "지각 제출은 24시간마다 10% 감점", font=font(22), fill=MUTED)
    d.text((90, 770), "평가 기준", font=font(26, True), fill=NAVY)
    bullets(
        d,
        110,
        820,
        ["구현 정확성 60% · 보고서 25% · 코드 가독성 15%"],
        width_font=24,
    )
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for page_no, builder in ((10, page_10), (12, page_12), (15, page_15)):
        path = OUT / f"page-{page_no}.png"
        builder().save(path, optimize=True)
        print(f"wrote {path} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
