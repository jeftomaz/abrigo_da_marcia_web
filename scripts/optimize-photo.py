#!/usr/bin/env python3
"""Prepara fotos versionadas para a web: remove metadados (EXIF/GPS/XMP/maker
notes), converte o perfil de cor para sRGB, corrige a orientação nos pixels e
recomprime como JPEG progressivo. Reaproveita a mesma disciplina do
`compressImage` (packages/shared) para os assets que entram pelo repositório em
vez do upload no app.

Uso: python3 scripts/optimize-photo.py IMG [IMG ...] [--max 2048] [--quality 80]
Sobrescreve cada arquivo no lugar.
"""
import argparse
import io
import sys

from PIL import Image, ImageCms, ImageOps


def optimize(path: str, max_side: int, quality: int) -> tuple[int, int]:
    before = _size(path)
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)  # aplica a orientação antes de descartar o EXIF
    icc = im.info.get("icc_profile")
    if icc:
        src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        im = ImageCms.profileToProfile(im, src, ImageCms.createProfile("sRGB"), outputMode="RGB")
    else:
        im = im.convert("RGB")
    w, h = im.size
    scale = max_side / max(w, h)
    if scale < 1:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    # sem exif/icc: navegadores assumem sRGB, que é o espaço para o qual convertemos
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return before, _size(path)


def _size(path: str) -> int:
    import os

    return os.path.getsize(path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--max", type=int, default=2048, help="lado maior máximo (px)")
    ap.add_argument("--quality", type=int, default=80)
    args = ap.parse_args()

    total_before = total_after = 0
    for path in args.images:
        before, after = optimize(path, args.max, args.quality)
        total_before += before
        total_after += after
        print(f"{path}: {before:,} -> {after:,} bytes")
    if len(args.images) > 1:
        print(f"total: {total_before:,} -> {total_after:,} bytes")


if __name__ == "__main__":
    sys.exit(main())
