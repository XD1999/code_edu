Looking at this concept, the key ideas are: (1) the three-step process from general representation → averaged inner product → unitary matrices, (2) the central identity D(g⁻¹) = D⁻¹(g) = D†(g), and (3) the concrete mechanism of conjugate-transpose. A static polished diagram with a dark theme, color-coded flow, and a worked matrix example will communicate this best.

```python
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import numpy as np

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']

fig, ax = plt.subplots(1, 1, figsize=(16, 11), dpi=150)
ax.set_xlim(0, 16)
ax.set_ylim(0, 11)
ax.axis('off')

# ── Color palette ──
BG = '#0a0e1a'
PANEL = '#161e33'
PANEL_LIGHT = '#1e2942'
TEAL = '#2dd4bf'
CORAL = '#fb7185'
GOLD = '#fbbf24'
PURPLE = '#a78bfa'
GREEN = '#34d399'
WHITE = '#f1f5f9'
MUTED = '#94a3b8'
DIM = '#334155'

fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)

# ── Helpers ──
def rbox(x, y, w, h, fc, ec, alpha=1.0, lw=2, radius=0.12, zorder=2):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad=0.01,rounding_size={radius}",
                         facecolor=fc, edgecolor=ec,
                         alpha=alpha, linewidth=lw, zorder=zorder)
    ax.add_patch(box)
    return box

def txt(x, y, t, fs=14, c=WHITE, w='normal', ha='center', va='center',
        style='normal', zorder=5):
    ax.text(x, y, t, fontsize=fs, color=c, weight=w, ha=ha, va=va,
            style=style, zorder=zorder, family='sans-serif')

def arr(x1, y1, x2, y2, color=WHITE, lw=2.5, zorder=3):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->,head_width=0.35,head_length=0.5',
                                color=color, lw=lw, shrinkA=0, shrinkB=0),
                zorder=zorder)

def draw_matrix(cx, cy, entries, cell=0.72, color=WHITE,
                factor=None, title=None, title_color=None, highlight=False):
    if title_color is None:
        title_color = color
    rows, cols = len(entries), len(entries[0])
    w, h = cols * cell, rows * cell
    x0, y0 = cx - w / 2, cy - h / 2
    pad = 0.18

    if highlight:
        for gr, ga in [(0.40, 0.04), (0.22, 0.07)]:
            rbox(x0 - pad - gr, y0 - pad - gr,
                 w + 2 * pad + 2 * gr, h + 2 * pad + 2 * gr,
                 color, color, alpha=ga, lw=0, radius=0.10)
        rbox(x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad,
             PANEL_LIGHT, color, alpha=0.95, lw=2.5, radius=0.08)
    else:
        rbox(x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad,
             PANEL, DIM, alpha=0.85, lw=1.5, radius=0.08)

    be = 0.10
    ax.plot([x0 - 0.06, x0 - 0.06, x0 + 0.03],
            [y0 + h + be, y0 - be, y0 - be],
            color=color, lw=2.5, zorder=4, solid_capstyle='round')
    ax.plot([x0 + w - 0.03, x0 + w + 0.06, x0 + w + 0.06],
            [y0 - be, y0 - be, y0 + h + be],
            color=color, lw=2.5, zorder=4, solid_capstyle='round')

    for i in range(rows):
        for j in range(cols):
            txt(x0 + (j + 0.5) * cell, y0 + (i + 0.5) * cell,
                entries[i][j], fs=18, c=color, w='bold')

    if factor:
        txt(cx, y0 - 0.40, factor, fs=12, c=MUTED)
    if title:
        txt(cx, y0 + h + 0.35, title, fs=15, c=title_color, w='bold')

# ── Subtle background dot grid ──
for i in np.arange(0.5, 16, 0.7):
    for j in np.arange(0.5, 11, 0.7):
        ax.plot(i, j, '.', color='#0d1220', markersize=0.6, zorder=0)

# ── Title ──
txt(8, 10.5, "Unitary Representations of Finite Groups", fs=26, c=WHITE, w='bold')
txt(8, 9.85, "Changing to an orthonormal basis makes every D(g) unitary", fs=14, c=MUTED)
ax.plot([4.5, 11.5], [9.55, 9.55], color=PURPLE, lw=1.5, zorder=1, alpha=0.5)

# ── Three-step process flow ──
step_y, step_h, step_w = 7.3, 1.55, 3.8

# Step 1
rbox(1.0, step_y, step_w, step_h, PANEL, TEAL, alpha=0.95, lw=2.5, radius=0.15)
txt(2.9, step_y + step_h - 0.28, "①  START", fs=11, c=TEAL, w='bold')
txt(2.9, step_y + 0.80, "General Representation", fs=14, c=WHITE, w='bold')
txt(2.9, step_y + 0.38, "D(g) : V → V", fs=13, c=TEAL)

# Step 2
rbox(6.1, step_y, step_w, step_h, PANEL, GOLD, alpha=0.95, lw=2.5, radius=0.15)
txt(8.0, step_y + step_h - 0.28, "②  AVERAGE", fs=11, c=GOLD, w='bold')
txt(8.0, step_y + 0.82, "New Inner Product", fs=14, c=WHITE, w='bold')
txt(8.0, step_y + 0.45, "⟨x,y⟩ = (1/|G|) Σ_g", fs=11, c=GOLD)
txt(8.0, step_y + 0.18, "(D(g)x, D(g)y)", fs=11, c=GOLD)

# Step 3
rbox(11.2, step_y, step_w, step_h, PANEL, CORAL, alpha=0.95, lw=2.5, radius=0.15)
txt(13.1, step_y + step_h - 0.28, "③  RESULT", fs=11, c=CORAL, w='bold')
txt(13.1, step_y + 0.80, "Unitary Matrices", fs=14, c=WHITE, w='bold')
txt(13.1, step_y + 0.38, "⟨D(g)x, D(g)y⟩ = ⟨x,y⟩", fs=12, c=CORAL)

arr(4.85, step_y + step_h / 2, 6.05, step_y + step_h / 2, color=MUTED, lw=2.5)
arr(9.95, step_y + step_h / 2, 11.15, step_y + step_h / 2, color=MUTED, lw=2.5)

# ── Key identity banner (with glow) ──
for gr, ga in [(0.35, 0.035), (0.18, 0.06)]:
    rbox(2.0 - gr, 5.55 - gr, 12.0 + 2 * gr, 1.20 + 2 * gr,
         PURPLE, PURPLE, alpha=ga, lw=0, radius=0.15)
rbox(2.0, 5.55, 12.0, 1.20, PANEL_LIGHT, PURPLE, alpha=0.9, lw=2, radius=0.12)
txt(8, 6.38, "D(g⁻¹)  =  D⁻¹(g)  =  D†(g)", fs=26, c=WHITE, w='bold')
txt(8, 5.88, "where  D†(g) = (D(g)ᵀ)*  —  the conjugate-transpose", fs=13, c=PURPLE)

# ── Matrix demonstration ──
txt(8, 4.95, "Concrete example: constructing D†(g) from D(g)", fs=14, c=MUTED, w='bold')

# D(g)
entries_D = [["1", "1"], ["i", "−i"]]
draw_matrix(3.0, 3.5, entries_D, cell=0.72, color=TEAL,
            factor="× 1/√2", title="D(g)", title_color=TEAL)

# Transpose arrow
arr(4.35, 3.5, 6.15, 3.5, color=GOLD, lw=2.5)
txt(5.25, 3.80, "Transpose", fs=12, c=GOLD, w='bold')
txt(5.25, 3.20, "rows ↔ cols", fs=10, c=MUTED)

# D^T(g)
entries_DT = [["1", "i"], ["1", "−i"]]
draw_matrix(7.5, 3.5, entries_DT, cell=0.72, color=GOLD,
            factor="× 1/√2", title="Dᵀ(g)", title_color=GOLD)

# Conjugate arrow
arr(8.85, 3.5, 10.65, 3.5, color=CORAL, lw=2.5)
txt(9.75, 3.80, "Conjugate", fs=12, c=CORAL, w='bold')
txt(9.75, 3.20, "z → z*", fs=10, c=MUTED)

# D†(g) — highlighted result
entries_Dd = [["1", "−i"], ["1", "i"]]
draw_matrix(12.0, 3.5, entries_Dd, cell=0.72, color=CORAL,
            factor="× 1/√2", title="D†(g) = D⁻¹(g)", title_color=CORAL,
            highlight=True)

# ── Verification & consequence ──
rbox(2.5, 1.25, 11.0, 1.0, PANEL, GREEN, alpha=0.85, lw=1.5, radius=0.10)
txt(8, 1.95, "✓  D(g) · D†(g) = I", fs=16, c=GREEN, w='bold')
txt(8, 1.50, "D(g) is unitary  ⇒  reducibility implies complete reducibility",
    fs=12, c=MUTED)

# ── Outer card border ──
outer = FancyBboxPatch((0.15, 0.15), 15.7, 10.7,
                       boxstyle="round,pad=0.01,rounding_size=0.15",
                       facecolor='none', edgecolor=DIM, linewidth=1.5, zorder=1)
ax.add_patch(outer)

plt.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
plt.savefig('unitary_representations.png', dpi=200, facecolor=BG,
            edgecolor='none', pad_inches=0.1)
plt.show()
```

The visualization is structured as four horizontal bands:

1. **Title** — bold heading with a subtle purple accent line.
2. **Three-step flow** — color-coded panels (teal → gold → coral) showing the conceptual pipeline: general representation → group-averaged inner product → unitary matrices. Each box carries its key formula.
3. **Key identity banner** — the central equation D(g⁻¹) = D⁻¹(g) = D†(g) displayed prominently with a purple glow, plus the definition of the conjugate-transpose.
4. **Worked matrix example** — a concrete 2×2 unitary matrix D(g) = (1/√2)·[[1,1],[i,−i]] shown through the two-step conjugate-transpose process (transpose → conjugate), arriving at D†(g), which is highlighted with a coral glow. A verification strip at the bottom confirms D(g)·D†(g) = I and states the key consequence: reducibility implies complete reducibility.