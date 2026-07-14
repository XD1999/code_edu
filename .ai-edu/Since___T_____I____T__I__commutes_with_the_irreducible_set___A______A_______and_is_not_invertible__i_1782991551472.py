"""
Static diagram: Schur's Lemma — (T-λI) commutes with irreducible {A_α},
has non-trivial kernel (invariant subspace), hence must be the zero operator.
"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle, Polygon
from matplotlib.lines import Line2D
import numpy as np

# ---------- Canvas & theme ----------
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.unicode_minus": False,
    "figure.dpi": 200,
})
fig = plt.figure(figsize=(16, 11), facecolor="#0e1116")
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 16)
ax.set_ylim(0, 11)
ax.set_axis_off()
ax.set_facecolor("#0e1116")

# Palette
BG       = "#0e1116"
PANEL    = "#161b22"
PANEL_E  = "#2a313c"
INK      = "#e8edf3"
DIM      = "#9aa6b2"
ACCENT   = "#ff5d8f"   # operator T-λI
GOLD     = "#ffc857"   # A_α family
TEAL     = "#3ddbd9"   # kernel / invariant subspace
VIOLET   = "#a78bfa"   # conclusion
GRID     = "#1d2330"

# subtle grid
for x in np.arange(0, 16, 0.5):
    ax.plot([x, x], [0, 11], color=GRID, lw=0.4, zorder=0, alpha=0.6)
for y in np.arange(0, 11, 0.5):
    ax.plot([0, 16], [y, y], color=GRID, lw=0.4, zorder=0, alpha=0.6)

# ---------- Title ----------
ax.text(8, 10.55, "Schur's Lemma — The Zero-Operator Verdict",
        ha="center", va="center", fontsize=22, fontweight="bold", color=INK)
ax.text(8, 10.05,
        r"$(T-\lambda I)$  commutes with the irreducible family $\{A_\alpha\}$,  "
        r"is non-invertible  $\Rightarrow$  $T-\lambda I = 0$",
        ha="center", va="center", fontsize=13, color=DIM)

# ---------- Helper ----------
def panel(x, y, w, h, fc=PANEL, ec=PANEL_E, lw=1.6, rad=0.04):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle=f"round,pad=0.02,rounding_size={rad}",
                       linewidth=lw, edgecolor=ec, facecolor=fc, zorder=2)
    ax.add_patch(p)
    return p

def op_block(cx, cy, w, h, label, sub, fill, edge, text_col=INK):
    p = FancyBboxPatch((cx-w/2, cy-h/2), w, h,
                       boxstyle="round,pad=0.02,rounding_size=0.10",
                       linewidth=2.4, edgecolor=edge,
                       facecolor=fill, zorder=4)
    ax.add_patch(p)
    ax.text(cx, cy+0.18, label, ha="center", va="center",
            fontsize=15, fontweight="bold", color=text_col, zorder=5)
    ax.text(cx, cy-0.28, sub, ha="center", va="center",
            fontsize=9.5, color=text_col, zorder=5, alpha=0.85)

def double_arrow(p1, p2, color=INK, lw=2.0, ls="-"):
    a = FancyArrowPatch(p1, p2, arrowstyle="<|-|>", mutation_scale=18,
                        color=color, lw=lw, linestyle=ls, zorder=3)
    ax.add_patch(a)

def arrow(p1, p2, color=INK, lw=2.0, style="-|>", ls="-"):
    a = FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=18,
                        color=color, lw=lw, zorder=3)
    ax.add_patch(a)

# ============================================================
# LEFT PANEL — Commutation structure
# ============================================================
panel(0.4, 1.0, 7.6, 8.6)
ax.text(4.2, 9.25, "①  Commutation with irreducible family",
        ha="center", va="center", fontsize=13.5, fontweight="bold", color=INK)
ax.text(4.2, 8.85, r"$[T-\lambda I,\; A_\alpha] = 0 \quad \forall \alpha$",
        ha="center", va="center", fontsize=11.5, color=GOLD)

# Central operator T-λI
op_block(4.2, 5.6, 2.6, 1.5,
         r"$T - \lambda I$", "central operator",
         fill="#2a1320", edge=ACCENT)

# Surrounding A_α nodes (irreducible family)
import math
nA = 5
radius = 2.7
centers = []
for i in range(nA):
    ang = math.pi/2 + i * 2*math.pi/nA
    cx = 4.2 + radius * math.cos(ang)
    cy = 5.6 + radius * math.sin(ang) * 0.78
    centers.append((cx, cy))
    op_block(cx, cy, 1.35, 0.95,
             rf"$A_{{{i+1}}}$", "irreducible",
             fill="#2a2410", edge=GOLD, text_col=INK)

# Commutation double-arrows from each A_α to T-λI
for (cx, cy) in centers:
    # vector toward center
    dx, dy = 4.2 - cx, 5.6 - cy
    d = math.hypot(dx, dy)
    ux, uy = dx/d, dy/d
    # start/end offsets so arrows don't overlap boxes
    sx, sy = cx + ux*0.78, cy + uy*0.55
    ex, ey = 4.2 - ux*1.45, 5.6 - uy*0.85
    double_arrow((sx, sy), (ex, ey), color="#5b6472", lw=1.8)

# Legend chip for commutation
ax.add_patch(FancyBboxPatch((0.9, 1.35), 2.6, 0.55,
             boxstyle="round,pad=0.02,rounding_size=0.08",
             facecolor="#1c2230", edgecolor=PANEL_E, lw=1.4, zorder=3))
ax.plot([1.1, 1.55], [1.62, 1.62], color="#5b6472", lw=2.0, zorder=4)
ax.text(1.65, 1.62, "commutes  [·,·]=0", color=DIM,
        fontsize=9.5, va="center", zorder=4)

# Note: irreducibility
ax.add_patch(FancyBboxPatch((3.9, 1.35), 3.7, 0.55,
             boxstyle="round,pad=0.02,rounding_size=0.08",
             facecolor="#1c2230", edgecolor=PANEL_E, lw=1.4, zorder=3))
ax.text(4.05, 1.62,
        "irreducible: no non-trivial invariant subspace under all $A_\\alpha$",
        color=DIM, fontsize=9.0, va="center", zorder=4)

# ============================================================
# RIGHT PANEL — Kernel is a non-trivial invariant subspace
# ============================================================
panel(8.2, 1.0, 7.4, 8.6)
ax.text(11.9, 9.25, "②  Non-invertibility  ⟹  non-trivial kernel",
        ha="center", va="center", fontsize=13.5, fontweight="bold", color=INK)
ax.text(11.9, 8.85,
        r"$\ker(T-\lambda I) \neq \{0\}$,  invariant under every $A_\alpha$",
        ha="center", va="center", fontsize=11.5, color=TEAL)

# Vector space V as a large rounded region
V = FancyBboxPatch((8.6, 2.0), 6.6, 5.9,
                   boxstyle="round,pad=0.02,rounding_size=0.18",
                   linewidth=2.2, edgecolor="#3a4458",
                   facecolor="#10151f", zorder=3)
ax.add_patch(V)
ax.text(8.85, 7.65, r"$V$", fontsize=15, color=INK,
        fontweight="bold", va="center")

# Kernel subspace (highlighted)
ker = FancyBboxPatch((9.2, 2.5), 3.4, 2.6,
                     boxstyle="round,pad=0.02,rounding_size=0.14",
                     linewidth=2.6, edgecolor=TEAL,
                     facecolor="#0c2a2a", alpha=0.95, zorder=4)
ax.add_patch(ker)
ax.text(10.9, 4.55, r"$\ker(T-\lambda I)$",
        ha="center", va="center", fontsize=13, color=TEAL,
        fontweight="bold", zorder=5)
ax.text(10.9, 4.05, "non-trivial invariant subspace",
        ha="center", va="center", fontsize=9, color="#9fe9e6", zorder=5)

# A_α acting inside kernel: self-loop arrow
loop = FancyArrowPatch((9.6, 3.2), (12.2, 3.2),
                       connectionstyle="arc3,rad=-0.55",
                       arrowstyle="-|>", mutation_scale=16,
                       color=GOLD, lw=2.0, zorder=5)
ax.add_patch(loop)
ax.text(10.9, 2.75, r"$A_\alpha(\ker) \subseteq \ker$",
        ha="center", va="center", fontsize=10, color=GOLD, zorder=6)

# A non-zero vector v in the kernel
ax.plot(10.4, 3.7, "o", color="#fff3b0", markersize=9,
        markeredgecolor="#ffc857", markeredgewidth=1.5, zorder=6)
ax.text(10.55, 3.85, r"$v\neq 0$", fontsize=10, color="#fff3b0", zorder=6)

# (T-λI) sends v to 0
arrow((10.4, 3.7), (10.9, 3.0), color=ACCENT, lw=2.2)
ax.text(10.0, 3.25, r"$(T-\lambda I)v = 0$",
        fontsize=9.5, color=ACCENT, zorder=6)

# Outside the kernel: a generic w mapped somewhere in V
ax.plot(13.7, 6.4, "o", color="#cbd6e2", markersize=8,
        markeredgecolor="#7d8a99", markeredgewidth=1.4, zorder=6)
ax.text(13.85, 6.55, r"$w$", fontsize=11, color="#cbd6e2", zorder=6)
arrow((13.7, 6.4), (12.6, 5.4), color=ACCENT, lw=1.8, ls="--")
ax.text(12.95, 6.05, r"$(T-\lambda I)w$", fontsize=9.5,
        color=ACCENT, zorder=6, alpha=0.9)

# ============================================================
# BOTTOM — Logical flow to conclusion
# ============================================================
panel(0.4, 0.05, 15.2, 0.78, fc="#1a1024", ec="#3a2a4a", lw=1.6)

# Three premise chips + conclusion
def chip(x, w, label, color):
    ax.add_patch(FancyBboxPatch((x, 0.18), w, 0.52,
                 boxstyle="round,pad=0.02,rounding_size=0.10",
                 facecolor="#0e1116", edgecolor=color, lw=2.0, zorder=4))
    ax.text(x+w/2, 0.44, label, ha="center", va="center",
            fontsize=10.5, color=INK, zorder=5)

chip(0.7, 3.7, r"$[T-\lambda I, A_\alpha]=0$", "#7d8a99")
arrow((4.5, 0.44), (5.0, 0.44), color="#5b6472", lw=2.0)
chip(5.1, 3.6, r"$\{A_\alpha\}$ irreducible", GOLD)
arrow((8.8, 0.44), (9.3, 0.44), color="#5b6472", lw=2.0)
chip(9.4, 3.4, r"$\ker(T-\lambda I)\neq 0$", TEAL)
arrow((12.9, 0.44), (13.4, 0.44), color=VIOLET, lw=2.4)
chip(13.5, 2.0, r"$T-\lambda I = 0$", VIOLET)

# Schur's lemma callout
ax.add_patch(FancyBboxPatch((5.6, 9.55), 4.8, 0.0,))  # noop placeholder removed

# Big verdict arrow from right panel to conclusion
arrow((11.9, 1.05), (14.5, 0.85), color=VIOLET, lw=2.6, style="-|>")
ax.text(13.4, 1.25, "Schur's Lemma",
        fontsize=11, color=VIOLET, fontweight="bold",
        ha="center", zorder=6,
        bbox=dict(boxstyle="round,pad=0.25", fc="#0e1116",
                  ec=VIOLET, lw=1.4))

# ---------- Save & show ----------
plt.savefig("schur_lemma.png", dpi=220, facecolor=BG, bbox_inches="tight")
plt.show()