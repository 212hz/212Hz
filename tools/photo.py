"""연주자 사진 → 초대장용 사진 파일 만들기 (자르기 · 화질 보정 · 얼굴 보정)

사용 (프로젝트 폴더에서):
  python tools/photo.py <원본이미지> <영문이름> [옵션]

  예) 원본 사진 파일 그대로:
      python tools/photo.py images/홍길동.jpg hong-gildong
  예) 여러 명이 들어간 프로필 이미지에서 사진 부분만 잘라서 (좌표 = 왼쪽,위,오른쪽,아래 픽셀):
      python tools/photo.py images/연주자프로필_피아노트리오.png park-jieun --crop 61,609,197,768
  예) 어두운 사진은 밝게:
      python tools/photo.py images/김신석.jpg kim-sinseok --bright 0.78

옵션:
  --crop x0,y0,x1,y1   잘라낼 영역 (생략하면 전체)
  --bright 값          밝기 감마 (기본 0.94 · 작을수록 밝게 · 어두운 사진 0.75~0.85)
  --warm 값            혈색(따뜻한 톤) (기본 1.02 · 1.0 = 그대로)
  --out 경로           저장 경로 (기본 assets/img/performer-<영문이름>.jpg)
  --force              같은 이름 파일이 있어도 덮어쓰기

처리 내용:
  - 작은 사진: 폭 544px 이상이 되도록 Lanczos(고품질 큐빅 계열 보간)로 확대
    큰 사진: 폭 544px 로 축소 (휴대폰 확대 보기에 충분한 크기, 용량 절약)
  - 윤곽(눈·머리선)은 살리고 피부처럼 밋밋한 부분만 살짝 부드럽게
  - 밝기·대비·채도·혈색 보정 → 마지막에 약한 선명화(테두리 흰 띠가 안 생기는 강도)
  - 끝나면 index.html 에 붙여 넣을 <img> 한 줄을 출력합니다.

⚠ 이미 배포된 사진을 바꿀 때는 새 이름(예: park-jieun-v2)으로 만드세요.
  같은 파일명으로 덮어쓰면 휴대폰·카카오톡 캐시 때문에 옛 사진이 보일 수 있습니다.
"""
import argparse
import math
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

TARGET_W = 544  # 저장 폭(px): 확대 보기 최대 280 CSS px × 휴대폰 2배 화면 여유

ROOT = Path(__file__).resolve().parent.parent


def gamma(img, g):
    lut = [int(255 * ((i / 255) ** g) + 0.5) for i in range(256)]
    return img.point(lut * 3)


def warm(img, k):
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * k)))
    b = b.point(lambda v: int(v / k))
    return Image.merge("RGB", (r, g, b))


def enhance(src, bright, warmth):
    if src.width < TARGET_W:
        k = math.ceil(TARGET_W / src.width)
        img = src.resize((src.width * k, src.height * k), Image.LANCZOS)
    else:
        img = src.resize((TARGET_W, round(src.height * TARGET_W / src.width)), Image.LANCZOS)

    # 피부 보정: 윤곽이 약한 곳만 흐린 본과 섞음 (윤곽 보존)
    soft = img.filter(ImageFilter.GaussianBlur(2.2))
    edge = (img.convert("L").filter(ImageFilter.FIND_EDGES)
            .filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
            .point(lambda v: min(255, v * 9)))
    mask = ImageOps.invert(edge).point(lambda v: int(v * 0.45))
    img = Image.composite(soft, img, mask)

    img = gamma(img, bright)
    img = ImageEnhance.Brightness(img).enhance(1.02)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img = ImageEnhance.Color(img).enhance(1.06)
    img = warm(img, warmth)
    img = img.filter(ImageFilter.UnsharpMask(1.4, 45, 3))

    if img.width > TARGET_W * 1.5:  # 확대 배수가 커서 너무 크면 맞춰 줄임
        img = img.resize((TARGET_W, round(img.height * TARGET_W / img.width)), Image.LANCZOS)
    return img


def main():
    ap = argparse.ArgumentParser(description="연주자 사진 → 초대장용 사진 파일")
    ap.add_argument("source")
    ap.add_argument("slug", help="영문 이름 (예: park-jieun) → performer-<slug>.jpg")
    ap.add_argument("--crop")
    ap.add_argument("--bright", type=float, default=0.94)
    ap.add_argument("--warm", type=float, default=1.02)
    ap.add_argument("--out")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    src = ImageOps.exif_transpose(Image.open(a.source)).convert("RGB")
    if a.crop:
        src = src.crop(tuple(int(v) for v in a.crop.split(",")))

    out = Path(a.out) if a.out else ROOT / "assets" / "img" / f"performer-{a.slug}.jpg"
    if out.exists() and not a.force:
        sys.exit(f"이미 있는 파일입니다: {out}\n  새 이름(예: {a.slug}-v2)을 쓰거나 --force 를 붙이세요.")

    img = enhance(src, a.bright, a.warm)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=90, optimize=True, progressive=True, subsampling=0)

    try:
        rel = out.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        rel = out.as_posix()
    print(f"저장: {rel}  ({img.width}×{img.height}, 원본 {src.width}×{src.height})")
    print("index.html 의 연주자 약력 <div> 를 아래처럼 바꾸세요 (이름만 고치면 됨):")
    print(f'  <div class="has-ph"><img class="ph" src="{rel}" width="{img.width}" height="{img.height}" '
          f'alt="이름" loading="lazy" /><p class="who">이름 <i>악기</i></p><p>약력</p></div>')


if __name__ == "__main__":
    main()
