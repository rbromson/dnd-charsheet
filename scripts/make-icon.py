#!/usr/bin/env python3
# Генерирует public/icons/{icon,icon-maskable,favicon}.svg (нужен fontTools). PNG/ICO: см. README.
"""Иконка «Таверни»: гранёный d20 на тёмной коже со строчкой."""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = '/home/brmsn/dnd-charsheet/node_modules/@fontsource/alegreya/files/alegreya-latin-700-normal.woff'

def text_path(glyphs, size, cx, base):
    f = TTFont(FONT); gs = f.getGlyphSet(); upm = f['head'].unitsPerEm
    s = size / upm
    adv = sum(gs[n].width for n in glyphs) - 40  # чуть плотнее
    x = cx - adv * s / 2
    out = []
    for n in glyphs:
        pen = SVGPathPen(gs)
        gs[n].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        out.append(pen.getCommands())
        x += (gs[n].width - 40) * s
    return ' '.join(out)

def build(mask=False, small=False):
    cx, cy, k = 256, (256 if small else 262), (3.9 if small else 2.75 if mask else 3.05)
    P = lambda x, y: f'{cx + (x - 50) * k:.1f},{cy + (y - 50) * k:.1f}'
    tri = lambda *pts: ' '.join(P(*p) for p in pts)
    T, TL, TR, BL, BR, B = (50, 3), (5, 27), (95, 27), (5, 73), (95, 73), (50, 97)
    C1, C2, C3 = (50, 20), (78, 67), (22, 67)
    facets = [
        (tri(T, TL, C1), '#f6b07a'),
        (tri(T, TR, C1), '#ec8448'),
        (tri(TL, C3, C1), '#f29a5e'),
        (tri(TR, C1, C2), '#c95c33'),
        (tri(TL, BL, C3), '#dd6a33'),
        (tri(TR, BR, C2), '#a3401c'),
        (tri(BL, B, C3), '#b24d26'),
        (tri(BR, B, C2), '#7e3215'),
        (tri(C3, C2, B), '#c2582c'),
    ]
    centroid_y = cy + (51.3 - 50) * k
    num = text_path(['two.lf', 'zero.lf'], 30 * k, cx, centroid_y + 10.5 * k)
    outline = tri(T, TR, BR, B, BL, TL)
    bg_rect = '<rect width="512" height="512" fill="url(#leather)"/>' if mask else '<rect width="512" height="512" rx="112" fill="url(#leather)"/>'
    clip_open = '' if mask else '<g clip-path="url(#round)">'
    clip_close = '' if mask else '</g>'
    stitch = '' if mask or small else '<rect x="22" y="22" width="468" height="468" rx="92" fill="none" stroke="#d6aa6e" stroke-opacity=".42" stroke-width="5" stroke-dasharray="15 11" stroke-linecap="round"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="leather" cx="50%" cy="30%" r="80%">
    <stop offset="0" stop-color="#4e3628"/><stop offset=".55" stop-color="#2f2119"/><stop offset="1" stop-color="#1a110c"/>
  </radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ffab5e" stop-opacity=".85"/><stop offset=".5" stop-color="#e8743b" stop-opacity=".28"/><stop offset="1" stop-color="#e8743b" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd08a"/><stop offset="1" stop-color="#f08a45"/>
  </linearGradient>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  <clipPath id="round"><rect width="512" height="512" rx="112"/></clipPath>
</defs>
{bg_rect}
{clip_open}
<circle cx="{cx}" cy="{cy}" r="{165 if mask else 215}" fill="url(#glow)"/>{clip_close}
{stitch}
<ellipse cx="{cx}" cy="{cy + 52 * k:.1f}" rx="{40 * k:.1f}" ry="{7 * k:.1f}" fill="#000" opacity=".55" filter="url(#shadow)"/>
<g stroke-linejoin="round">
{''.join(f'<polygon points="{p}" fill="{c}"/>' for p, c in facets)}
<polygon points="{tri(C1, C2, C3)}" fill="url(#face)"/>
<g fill="none" stroke="#3b1a0b" stroke-width="{1.5 * k:.1f}" stroke-opacity=".55">
{''.join(f'<polygon points="{p}"/>' for p, _ in facets)}
</g>
<polygon points="{outline}" fill="none" stroke="#2a1206" stroke-width="{2.2 * k:.1f}"/>
<polyline points="{tri(BL, TL, T, TR)}" fill="none" stroke="#ffe2b8" stroke-opacity=".55" stroke-width="{0.9 * k:.1f}"/>
</g>
{"" if small else f'<path d="{num}" fill="#2a1206"/>'}
{"" if small else ""}<path d="M{cx - 30 * k:.1f} {cy - 36 * k:.1f} l{1.6 * k:.1f} {4.4 * k:.1f} l{4.4 * k:.1f} {1.6 * k:.1f} l-{4.4 * k:.1f} {1.6 * k:.1f} l-{1.6 * k:.1f} {4.4 * k:.1f} l-{1.6 * k:.1f} -{4.4 * k:.1f} l-{4.4 * k:.1f} -{1.6 * k:.1f} l{4.4 * k:.1f} -{1.6 * k:.1f}z" fill="#fff4e0" opacity=".9"/>
</svg>
'''

open(sys.argv[1], 'w').write(build(False))
open(sys.argv[2], 'w').write(build(True))
open(sys.argv[3], 'w').write(build(False, True))
