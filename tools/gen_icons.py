#!/usr/bin/env python3
"""PWAアイコン生成スクリプト(標準ライブラリのみ使用)。

グラデーション背景 + エージェントノードが棒グラフ(データ)を
オーケストレーションするモチーフを描画する。
使い方: python3 tools/gen_icons.py
"""
import math
import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "icons"
SIZES = [512, 192, 180]

# 色 (RGB 0-255)
GRAD_TOP = (91, 116, 255)
GRAD_BOTTOM = (38, 51, 150)
WHITE = (255, 255, 255)

# 正規化座標でのモチーフ定義
BARS = [  # (中心x, 上端y, 下端y, 幅)
    (0.30, 0.56, 0.80, 0.115),
    (0.50, 0.44, 0.80, 0.115),
    (0.70, 0.51, 0.80, 0.115),
]
NODE = (0.50, 0.235, 0.075)  # エージェントノード (cx, cy, r)
LINK_W = 0.022               # ノードと棒を結ぶ線の太さ


def seg_dist(px, py, ax, ay, bx, by):
    """点(px,py)と線分(a→b)の距離"""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    seg_len2 = vx * vx + vy * vy
    t = 0.0 if seg_len2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / seg_len2))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return math.hypot(dx, dy)


def coverage(u, v):
    """正規化座標(u,v)における白モチーフの被覆(0 or 1)"""
    # 棒グラフ(カプセル形状)
    for cx, yt, yb, w in BARS:
        r = w / 2
        if seg_dist(u, v, cx, yt + r, cx, yb - r) <= r:
            return 1.0
    # エージェントノード(輪郭リング)
    cx, cy, r = NODE
    d = math.hypot(u - cx, v - cy)
    if d <= r:
        return 1.0
    # 接続線(ノード→各棒の上端)
    for bx, yt, _yb, _w in BARS:
        if seg_dist(u, v, cx, cy + r, bx, yt) <= LINK_W / 2:
            return 1.0
    return 0.0


def render(size):
    rows = []
    ss = 2  # 2x2 スーパーサンプリングでアンチエイリアス
    for y in range(size):
        row = bytearray()
        for x in range(size):
            hit = 0
            for sy in range(ss):
                for sx in range(ss):
                    u = (x + (sx + 0.5) / ss) / size
                    v = (y + (sy + 0.5) / ss) / size
                    hit += coverage(u, v)
            a = hit / (ss * ss)
            t = y / size
            bg = [round(GRAD_TOP[i] + (GRAD_BOTTOM[i] - GRAD_TOP[i]) * t) for i in range(3)]
            px = [round(bg[i] * (1 - a) + WHITE[i] * a) for i in range(3)]
            row += bytes(px)
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))

    raw = b"".join(b"\x00" + r for r in rows)  # 各行の先頭にフィルタ種別0
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8bit RGB
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for size in SIZES:
        out = OUT_DIR / f"icon-{size}.png"
        write_png(out, size, render(size))
        print(f"wrote {out} ({size}x{size})")


if __name__ == "__main__":
    main()
