"""
Schur's Lemma — Intertwiner Construction
A polished static visualization of the identity
    D_J(g) · Σ = Σ · D_K(g)   for all g ∈ G
where  Σ = Σ_{g∈G} D_J(g⁻¹) M D_K(g).
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D
import numpy as np

# ──────────────────────────────────────────────────────────────────────────────
# 1.  GLOBAL STYLE
# ──────────────────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "mathtext.fontset": "dejavusans",
    "axes.unicode_minus": False,
})

# Deep navy canvas — lets the warm/cool accents pop
BG          = "#0e1322"
PANEL       = "#161d31"
INK         = "#eef1f8"
INK_DIM     = "#9aa6c4"
INK_FAINT   = "#5a6485"
GRID        = "#1f2740"

# Accent palette (vibrant, distinct)
C_J         = "#ff5e7e"   # rose   — irrep J
C_K         = "#4dd2ff"   # cyan   — irrep K
C_M         = "#ffd166"  # gold   — arbitrary matrix M
C_SIGMA     = "#a3f7bf"  # mint   — the intertwiner Σ
C_G         = "#c4a7ff"  # violet — group element g
C_GINV      = "#7fb3ff"  # blue   — inverse g⁻¹

fig = plt.figure(figsize=(15, 9.5), facecolor=BG)
ax  = fig.add_axes([0, 0, 1, 1]); ax.set_facecolor(BG)
ax.set_xlim(0, 15); ax.set_ylim(0, 9.5); ax.axis("off")

# ──────────────────────────────────────────────────────────────────────────────
# 2.  HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def rrect(x, y, w, h, fc, ec, lw=2.2, alpha=1.0, rad=0.18, z=3):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle=f"round,pad=0.02,rounding_size={rad}",
                       fc=fc, ec=ec, lw=lw, alpha=alpha, zorder=z,
                       mutation_aspect=0.55)
    ax.add_patch(p); return p

def chip(x, y, label, fc, ec, fs=13, w=1.05, h=0.52, z=5):
    rrect(x - w/2, y - h/2, w, h, fc, ec, lw=2.0, rad=0.12, z=z)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fs, fontweight="bold", color=ec, zorder=z+1)

def arrow(x0, y0, x1, y1, color, lw=2.6, style="-|>",
          conn="arc3,rad=0", z=4, alpha=1.0, ms=14):
    a = FancyArrowPatch((x0, y0), (x1, y1),
                        arrowstyle=style, color=color, lw=lw,
                        connectionstyle=conn, zorder=z,
                        mutation_scale=ms, alpha=alpha,
                        capstyle="round", joinstyle="round")
    ax.add_patch(a); return a

def text(x, y, s, fs=12, c=INK, weight="normal", ha="center",
         va="center", style="normal", z=6, alpha=1.0, rot=0):
    ax.text(x, y, s, fontsize=fs, color=c, fontweight=weight,
            ha=ha, va=va, style=style, zorder=z, alpha=alpha,
            rotation=rot)

# ──────────────────────────────────────────────────────────────────────────────
# 3.  TITLE BLOCK
# ──────────────────────────────────────────────────────────────────────────────
rrect(0.4, 8.35, 14.2, 0.95, PANEL, GRID, lw=1.5, rad=0.14, z=2)
text(7.5, 8.92, "Schur's Lemma  ·  Intertwiner Construction",
     fs=21, weight="bold", c=INK)
text(7.5, 8.55,
     r"$\Sigma\;=\;\sum_{g\,\in\,G}\,D_{J}(g^{-1})\,M\,D_{K}(g)$"
     "        obeys        "
     r"$D_{J}(g)\,\Sigma\;=\;\Sigma\,D_{K}(g)$"
     "   for every  g ∈ G",
     fs=14.5, c=INK_DIM)

# ──────────────────────────────────────────────────────────────────────────────
# 4.  LEFT PANEL — CONSTRUCTION OF Σ
# ──────────────────────────────────────────────────────────────────────────────
rrect(0.4, 0.4, 7.0, 7.6, PANEL, GRID, lw=1.5, rad=0.16, z=1)
text(3.9, 7.55, "Construction of the Intertwiner  Σ",
     fs=15.5, weight="bold", c=INK)
text(3.9, 7.18, "sum over every group element  g ∈ G",
     fs=11, c=INK_DIM, style="italic")

# Summation symbol (large, decorative)
text(0.95, 5.55, "Σ", fs=58, c=C_SIGMA, weight="bold")
text(0.95, 4.45, "g ∈ G", fs=10.5, c=INK_DIM)

# Product chain:  D_J(g⁻¹) · M · D_K(g)
y_prod = 5.55
chip(2.05, y_prod, r"$D_{J}(g^{-1})$", C_GINV, C_GINV, fs=12.5, w=1.55)
chip(3.55, y_prod, r"$M$",            C_M,    C_M,    fs=14,   w=0.85)
chip(5.05, y_prod, r"$D_{K}(g)$",     C_G,    C_G,    fs=12.5, w=1.45)

# tiny dots between chips
for dx in (2.93, 4.43):
    text(dx, y_prod, "·", fs=16, c=INK_FAINT)

# arrows showing the product flow
arrow(2.78, y_prod, 3.12, y_prod, INK_FAINT, lw=2.0, ms=11)
arrow(3.98, y_prod, 4.32, y_prod, INK_FAINT, lw=2.0, ms=11)

# "one term per g" annotation
text(3.55, 6.35, "one term per group element  g",
     fs=10.5, c=INK_DIM, style="italic")

# ── Resulting Σ block ──
rrect(2.35, 3.55, 2.4, 1.15, "#1c2942", C_SIGMA, lw=2.6, rad=0.16, z=4)
text(3.55, 4.30, "Σ",  fs=30, weight="bold", c=C_SIGMA)
text(3.55, 3.85, "intertwiner", fs=9.5, c=INK_DIM, style="italic")

# big downward arrow from product to Σ
arrow(3.55, 5.05, 3.55, 4.78, C_SIGMA, lw=3.2, ms=18)

# ── Key property box ──
rrect(0.75, 1.55, 5.6, 1.55, "#1a2238", GRID, lw=1.4, rad=0.14, z=3)
text(3.55, 2.78, "Key property", fs=11, weight="bold", c=C_SIGMA)
text(3.55, 2.40,
     r"$D_{J}(g)\,\Sigma\;=\;\Sigma\,D_{K}(g)$",
     fs=15, c=INK, weight="bold")
text(3.55, 1.92,
     "Σ intertwines  $D_{J}$  and  $D_{K}$",
     fs=10.5, c=INK_DIM, style="italic")

# ── Schur's lemma consequence ──
rrect(0.75, 0.62, 5.6, 0.72, "#15203a", GRID, lw=1.2, rad=0.12, z=3)
text(3.55, 0.98,
     "Schur:  if  $D_{J}\!\not\cong\!D_{K}$  then  Σ = 0 ;   "
     "if  $D_{J}\!=\!D_{K}$  then  Σ = λ·I",
     fs=10, c=INK_DIM)

# ──────────────────────────────────────────────────────────────────────────────
# 5.  RIGHT PANEL — COMMUTATIVE DIAGRAM
# ──────────────────────────────────────────────────────────────────────────────
rrect(7.6, 0.4, 6.95, 7.6, PANEL, GRID, lw=1.5, rad=0.16, z=1)
text(11.075, 7.55, "Intertwining Commutative Diagram",
     fs=15.5, weight="bold", c=INK)
text(11.075, 7.18, "the same  g  acts on both sides",
     fs=11, c=INK_DIM, style="italic")

# Four vector-space nodes
def vs_node(x, y, label, sub, color):
    rrect(x-0.95, y-0.42, 1.9, 0.84, "#1c2942", color, lw=2.4, rad=0.14, z=4)
    text(x, y+0.12, label, fs=15, weight="bold", c=color)
    text(x, y-0.22, sub, fs=9.5, c=INK_DIM, style="italic")

vs_node(9.25,  6.05, r"$V_{J}$", "domain of  $D_{J}$", C_J)
vs_node(12.9,  6.05, r"$V_{J}$", "codomain",            C_J)
vs_node(9.25,  2.55, r"$V_{K}$", "domain of  $D_{K}$", C_K)
vs_node(12.9,  2.55, r"$V_{K}$", "codomain",            C_K)

# Top arrow:  D_J(g)
arrow(10.25, 6.05, 11.9, 6.05, C_J, lw=3.0, ms=16)
text(11.075, 6.32, r"$D_{J}(g)$", fs=14, weight="bold", c=C_J)

# Bottom arrow:  D_K(g)
arrow(10.25, 2.55, 11.9, 2.55, C_K, lw=3.0, ms=16)
text(11.075, 2.28, r"$D_{K}(g)$", fs=14, weight="bold", c=C_K)

# Left vertical arrow:  Σ  (down)
arrow(9.25, 5.58, 9.25, 3.05, C_SIGMA, lw=3.0, ms=16)
text(8.78, 4.30, "Σ", fs=20, weight="bold", c=C_SIGMA, rot=90)

# Right vertical arrow:  Σ  (down)
arrow(12.9, 5.58, 12.9, 3.05, C_SIGMA, lw=3.0, ms=16)
text(13.38, 4.30, "Σ", fs=20, weight="bold", c=C_SIGMA, rot=90)

# Centre equality badge
rrect(10.55, 3.95, 1.05, 0.7, "#1a2238", C_SIGMA, lw=1.8, rad=0.35, z=5)
text(11.075, 4.30, "=", fs=22, weight="bold", c=C_SIGMA)

# Caption under diagram
text(11.075, 1.55,
     "Starting from either  $V_{J}$  or  $V_{K}$,",
     fs=11, c=INK_DIM)
text(11.075, 1.20,
     "the two paths give identical results.",
     fs=11, c=INK_DIM)
text(11.075, 0.78,
     r"⇒  $D_{J}(g)\,\Sigma\;=\;\Sigma\,D_{K}(g)$",
     fs=12.5, c=C_SIGMA, weight="bold")

# ──────────────────────────────────────────────────────────────────────────────
# 6.  LEGEND
# ──────────────────────────────────────────────────────────────────────────────
legend_items = [
    (r"$D_{J}$",  "irrep  J",  C_J),
    (r"$D_{K}$",  "irrep  K",  C_K),
    ("M",         "arbitrary matrix", C_M),
    ("Σ",         "intertwiner",      C_SIGMA),
    ("g",         "group element",    C_G),
]
lx = 0.6
for label, desc, col in legend_items:
    rrect(lx, 0.08, 0.42, 0.30, col, col, lw=1.5, rad=0.08, z=6, alpha=0.85)
    text(lx+0.21, 0.23, label, fs=10, weight="bold", c=BG, z=7)
    text(lx+0.50, 0.23, desc, fs=9.5, c=INK_DIM, ha="left", z=7)
    lx += 2.75

# ──────────────────────────────────────────────────────────────────────────────
# 7.  RENDER
# ──────────────────────────────────────────────────────────────────────────────
plt.savefig("schur_intertwiner.png", dpi=200, facecolor=BG,
            bbox_inches="tight", pad_inches=0.15)
plt.show()