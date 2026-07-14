"""
Visualization: Intertwining Operator & Schur's Lemma
Concept: The sum Ξ = Σ_{g∈G} D_J(g⁻¹) M D_K(g) obeys D_J(g)Ξ = ΞD_K(g) for any g.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D
import numpy as np

# ---------- Aesthetic Configuration ----------
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['mathtext.fontset'] = 'cm'

# Palette: deep navy ground, warm gold for J, cool teal for K, coral for M
BG       = '#0E1525'
PANEL    = '#161E33'
INK      = '#F5F0E1'
INK_SOFT = '#B8C0D4'
GOLD     = '#F4B942'
GOLD_DK  = '#A87A1A'
TEAL     = '#4ECDC4'
TEAL_DK  = '#1E7A75'
CORAL    = '#FF6B6B'
CORAL_DK = '#A83838'
GRID     = '#1F2A44'

# ---------- Figure & Canvas ----------
fig = plt.figure(figsize=(16, 11), facecolor=BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 16)
ax.set_ylim(0, 11)
ax.axis('off')

# Subtle background grid
for x in np.arange(0, 16, 0.5):
    ax.plot([x, x], [0, 11], color=GRID, lw=0.4, alpha=0.35, zorder=0)
for y in np.arange(0, 11, 0.5):
    ax.plot([0, 16], [y, y], color=GRID, lw=0.4, alpha=0.35, zorder=0)

# ---------- Title Block ----------
title_box = FancyBboxPatch((0.5, 9.7), 15, 1.1,
                           boxstyle="round,pad=0.02,rounding_size=0.12",
                           facecolor=PANEL, edgecolor=GOLD, lw=1.8, zorder=2)
ax.add_patch(title_box)
ax.text(8, 10.42, "Intertwining Operator  &  Schur's Lemma",
        ha='center', va='center', fontsize=22, fontweight='bold', color=INK, zorder=3)
ax.text(8, 10.02, r"$\Xi \;=\; \sum_{g \in G}\, D_J(g^{-1})\, M\, D_K(g)$    obeys    "
                  r"$D_J(g)\,\Xi \;=\; \Xi\, D_K(g)$    for any  $g \in G$",
        ha='center', va='center', fontsize=13.5, color=INK_SOFT, zorder=3)

# ---------- Helper: Matrix Block ----------
def matrix_block(ax, cx, cy, w, h, color, dark, label_top, label_bot, n=3):
    """Draw a stylized matrix as a grid of cells."""
    cell = w / n
    # Outer frame
    frame = FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                           boxstyle="round,pad=0.0,rounding_size=0.06",
                           facecolor=dark, edgecolor=color, lw=2.4, zorder=3)
    ax.add_patch(frame)
    # Cells
    for i in range(n):
        for j in range(n):
            x = cx - w/2 + j * cell
            y = cy - h/2 + i * cell
            shade = color if (i + j) % 2 == 0 else dark
            ax.add_patch(mpatches.Rectangle((x, y), cell, cell,
                                             facecolor=shade, edgecolor=dark,
                                             lw=0.8, alpha=0.55, zorder=4))
    # Brackets
    bw = 0.10
    ax.plot([cx - w/2 - bw, cx - w/2 - bw, cx - w/2 - bw + 0.18],
            [cy - h/2 + 0.18, cy + h/2 - 0.18, cy + h/2],
            color=INK, lw=2.2, zorder=5, solid_capstyle='round')
    ax.plot([cx - w/2 - bw, cx - w/2 - bw],
            [cy + h/2 - 0.18, cy + h/2], color=INK, lw=2.2, zorder=5)
    ax.plot([cx + w/2 + bw, cx + w/2 + bw, cx + w/2 + bw - 0.18],
            [cy - h/2 + 0.18, cy + h/2 - 0.18, cy - h/2],
            color=INK, lw=2.2, zorder=5, solid_capstyle='round')
    ax.plot([cx + w/2 + bw, cx + w/2 + bw],
            [cy - h/2 + 0.18, cy - h/2], color=INK, lw=2.2, zorder=5)
    # Labels
    ax.text(cx, cy + h/2 + 0.42, label_top, ha='center', va='bottom',
            fontsize=15, fontweight='bold', color=color, zorder=6)
    ax.text(cx, cy - h/2 - 0.42, label_bot, ha='center', va='top',
            fontsize=10.5, color=INK_SOFT, zorder=6)

# ---------- Helper: Arrow ----------
def flow_arrow(ax, x0, y0, x1, y1, color=INK_SOFT, label=None, lw=2.2):
    arr = FancyArrowPatch((x0, y0), (x1, y1),
                          arrowstyle='-|>', mutation_scale=22,
                          color=color, lw=lw, zorder=5,
                          connectionstyle="arc3,rad=0.0")
    ax.add_patch(arr)
    if label:
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        ax.text(mx, my + 0.28, label, ha='center', va='bottom',
                fontsize=11, color=INK, fontweight='bold', zorder=6,
                bbox=dict(boxstyle="round,pad=0.25", facecolor=BG,
                          edgecolor=color, lw=1.0, alpha=0.92))

# ---------- Helper: Annotation Box ----------
def annot(ax, x, y, w, h, title, body, accent):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle="round,pad=0.02,rounding_size=0.10",
                         facecolor=PANEL, edgecolor=accent, lw=1.6, zorder=3)
    ax.add_patch(box)
    ax.text(x + 0.22, y + h - 0.30, title, ha='left', va='top',
            fontsize=11.5, fontweight='bold', color=accent, zorder=4)
    ax.text(x + 0.22, y + h - 0.72, body, ha='left', va='top',
            fontsize=9.8, color=INK_SOFT, zorder=4, linespacing=1.45)

# =====================================================================
#  LEFT PANEL: Construction of Ξ
# =====================================================================
panel_L = FancyBboxPatch((0.4, 0.4), 7.2, 8.9,
                         boxstyle="round,pad=0.02,rounding_size=0.14",
                         facecolor=PANEL, edgecolor='#2A3556', lw=1.2, zorder=1)
ax.add_patch(panel_L)
ax.text(4.0, 9.05, "1 ·  Construction of  Ξ",
        ha='center', va='center', fontsize=15, fontweight='bold',
        color=GOLD, zorder=4)

# Sum symbol
ax.text(1.05, 5.6, r"$\sum_{g \in G}$", fontsize=30, color=CORAL,
        fontweight='bold', ha='center', va='center', zorder=5)

# Three matrices in a row: D_J(g⁻¹), M, D_K(g)
matrix_block(ax, 2.55, 5.6, 1.5, 1.5, GOLD, GOLD_DK,
             r"$D_J(g^{-1})$", "irrep J", n=3)
matrix_block(ax, 4.45, 5.6, 1.5, 1.5, CORAL, CORAL_DK,
             r"$M$", "arbitrary", n=3)
matrix_block(ax, 6.35, 5.6, 1.5, 1.5, TEAL, TEAL_DK,
             r"$D_K(g)$", "irrep K", n=3)

# Equals sign and result
ax.text(4.0, 3.85, r"$=$", fontsize=26, color=INK, ha='center', va='center', zorder=5)
matrix_block(ax, 4.0, 2.75, 1.7, 1.7, INK, '#3A4365',
             r"$\Xi$", "intertwiner", n=3)

# Arrow from product to result
flow_arrow(ax, 4.0, 4.75, 4.0, 3.75, color=CORAL, label="sum over group", lw=2.4)

# Annotation: arbitrary M
annot(ax, 0.7, 0.7, 6.6, 1.55,
      "Arbitrary bridge  M",
      "M has dim_J rows and dim_K columns.\n"
      "It is otherwise completely arbitrary —\n"
      "no symmetry is assumed.",
      CORAL)

# =====================================================================
#  RIGHT PANEL: The intertwining property D_J(g)Ξ = ΞD_K(g)
# =====================================================================
panel_R = FancyBboxPatch((7.9, 0.4), 7.7, 8.9,
                         boxstyle="round,pad=0.02,rounding_size=0.14",
                         facecolor=PANEL, edgecolor='#2A3556', lw=1.2, zorder=1)
ax.add_patch(panel_R)
ax.text(11.75, 9.05, "2 ·  Intertwining Property",
        ha='center', va='center', fontsize=15, fontweight='bold',
        color=TEAL, zorder=4)

# --- LHS: D_J(g) Ξ ---
ax.text(9.15, 7.35, "LHS", fontsize=10, color=GOLD, ha='center',
        fontweight='bold', zorder=5)
matrix_block(ax, 9.15, 6.4, 1.3, 1.3, GOLD, GOLD_DK,
             r"$D_J(g)$", "", n=3)
ax.text(10.15, 6.4, r"$\Xi$", fontsize=20, color=INK, ha='center', va='center',
        fontweight='bold', zorder=5)
matrix_block(ax, 11.15, 6.4, 1.3, 1.3, INK, '#3A4365',
             "", "intertwiner", n=3)

# Equals
ax.text(11.75, 6.4, r"$=$", fontsize=22, color=INK, ha='center', va='center', zorder=5)

# --- RHS: Ξ D_K(g) ---
matrix_block(ax, 12.35, 6.4, 1.3, 1.3, INK, '#3A4365',
             "", "intertwiner", n=3)
ax.text(13.35, 6.4, r"$\Xi$", fontsize=20, color=INK, ha='center', va='center',
        fontweight='bold', zorder=5)
matrix_block(ax, 14.35, 6.4, 1.3, 1.3, TEAL, TEAL_DK,
             r"$D_K(g)$", "", n=3)
ax.text(13.35, 7.35, "RHS", fontsize=10, color=TEAL, ha='center',
        fontweight='bold', zorder=5)

# Commutative-style loop arrow between LHS and RHS
loop = FancyArrowPatch((9.9, 5.55), (13.6, 5.55),
                       arrowstyle='-|>', mutation_scale=20,
                       color=INK_SOFT, lw=1.8, zorder=5,
                       connectionstyle="arc3,rad=-0.35")
ax.add_patch(loop)
ax.text(11.75, 4.95, "holds for every  g ∈ G",
        ha='center', va='center', fontsize=10.5, color=INK_SOFT,
        style='italic', zorder=6)

# --- Schur's Lemma conclusion ---
schur_box = FancyBboxPatch((8.3, 2.55), 6.9, 1.85,
                          boxstyle="round,pad=0.02,rounding_size=0.12",
                          facecolor='#1B2540', edgecolor=GOLD, lw=1.8, zorder=3)
ax.add_patch(schur_box)
ax.text(11.75, 4.12, "Schur's Lemma  ⇒",
        ha='center', va='center', fontsize=12.5, fontweight='bold',
        color=GOLD, zorder=4)
ax.text(11.75, 3.55, r"$\Xi_{il} \;=\; \lambda(M)\,\delta_{il}\,\delta_{JK}$",
        ha='center', va='center', fontsize=15, color=INK, zorder=4)
ax.text(11.75, 2.95, "If  J = K :  Ξ is a scalar multiple of the identity.\n"
                     "If  J ≠ K :  Ξ = 0  (the zero matrix).",
        ha='center', va='center', fontsize=9.8, color=INK_SOFT, zorder=4,
        linespacing=1.5)

# Annotation: why it intertwines
annot(ax, 8.3, 0.7, 6.9, 1.55,
      "Why  D_J(g) Ξ = Ξ D_K(g) ?",
      "Insert the definition of Ξ and use the\n"
      "group property  g⁻¹h = (hg⁻¹)⁻¹  to reindex\n"
      "the sum. The equality then drops out.",
      TEAL)

# =====================================================================
#  Bottom legend strip
# =====================================================================
legend_elems = [
    mpatches.Patch(facecolor=GOLD, edgecolor=GOLD_DK, label=r'$D_J$  — irrep J'),
    mpatches.Patch(facecolor=CORAL, edgecolor=CORAL_DK, label=r'$M$  — arbitrary matrix'),
    mpatches.Patch(facecolor=TEAL, edgecolor=TEAL_DK, label=r'$D_K$  — irrep K'),
    mpatches.Patch(facecolor=INK, edgecolor='#3A4365', label=r'$\Xi$  — intertwiner'),
]
leg = ax.legend(handles=legend_elems, loc='lower center',
                bbox_to_anchor=(0.5, -0.005), ncol=4,
                frameon=True, facecolor=PANEL, edgecolor='#2A3556',
                labelcolor=INK_SOFT, fontsize=10.5,
                handlelength=1.6, handleheight=1.1, borderpad=0.8)
leg.get_frame().set_linewidth(1.2)

# ---------- Save & Show ----------
plt.savefig('intertwining_operator_schur_lemma.png',
            dpi=200, facecolor=BG, bbox_inches='tight', pad_inches=0.2)
plt.show()