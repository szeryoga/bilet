from math import cos, pi
from pathlib import Path
import sys

from PIL import Image


SRC = Path("img/qr.png")
BACKGROUND = (0x35, 0x35, 0x4F, 255)
FRAME_COUNT = 48
MIN_SCALE = 0.03


def parse_duration_ms() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 animate.py <time_in_msec>")

    value = int(sys.argv[1])
    if value <= 0:
        raise ValueError("Время анимации должно быть больше 0")
    return value


def build_frames(img: Image.Image, duration_ms: int) -> tuple[list[Image.Image], list[int]]:
    img = img.convert("RGBA")
    mirrored = img.transpose(Image.FLIP_LEFT_RIGHT)
    width, height = img.size

    total_cs = max(1, round(duration_ms / 10))
    base_delay = total_cs // FRAME_COUNT
    extra_delay = total_cs - base_delay * FRAME_COUNT

    frames: list[Image.Image] = []
    delays: list[int] = []

    for frame_index in range(FRAME_COUNT):
        theta = 2 * pi * frame_index / FRAME_COUNT
        source = img if cos(theta) >= 0 else mirrored
        scale_x = max(abs(cos(theta)), MIN_SCALE)
        draw_width = max(1, round(width * scale_x))
        offset_x = (width - draw_width) // 2

        resized = source.resize((draw_width, height), Image.LANCZOS)
        frame = Image.new("RGBA", (width, height), BACKGROUND)
        frame.alpha_composite(resized, (offset_x, 0))
        frames.append(frame.convert("P", palette=Image.ADAPTIVE))
        delays.append(max(1, base_delay + (1 if frame_index < extra_delay else 0)) * 10)

    return frames, delays


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f"Не найден файл: {SRC}")

    duration_ms = parse_duration_ms()
    out = Path(f"img/qr_spin_{duration_ms}.gif")
    source = Image.open(SRC)
    frames, delays = build_frames(source, duration_ms)

    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=delays,
        disposal=2,
        optimize=False,
    )

    print(f"Сохранено: {out}")


if __name__ == "__main__":
    main()
