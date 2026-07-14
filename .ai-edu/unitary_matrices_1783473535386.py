Looking at this concept: the core idea is that **unitary matrices preserve inner products** (and thus lengths/angles), which is the geometric essence behind the Weyl-unitary-trick for finite-group representations. The most illuminating visualization shows a vector transformed by a unitary matrix while its length and inner product with another vector remain invariant — contrasted with a non-unitary transformation that breaks this invariance.

I'll build a polished static figure with three panels: (1) the defining property $U^\dagger U = I$, (2) geometric preservation under $U$ vs. distortion under a non-unitary $A$, and (3) the averaging construction of the invariant inner product.

```python
"""
Unitary Matrices — A Portfolio-Quality Visualization
=====================================================
Self-contained matplotlib figure illustrating:
  • The defining algebraic property  U† U = I
  • Geometric preservation of inner products under U
    vs. distortion under a non-unitary matrix A
  • The Weyl averaging construction of a U-invariant inner product
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle, Arc
from matplotlib.lines import Line2D
from matplotlib.path import Path
import matplotlib.patheffects as pe

# ----------------------------------------------------------------------
# 0.  Global aesthetic configuration
# ----------------------------------------------------------------------
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 12,
    "axes.linewidth": 1.4,
    "mathtext.fontset": "cm",
})

# Deep, slightly desaturated palette — presentation quality
BG          = "#0E1320"
PANEL_BG    = "#161D2E"
PANEL_EDGE  = "#2A3450"
GRID        = "#1F2840"
INK         = "#EAF0FA"
INK_DIM     = "#9FB0CC"
INK_FAINT   = "#5E6E8C"
GOLD        = "#F4C95D"
TEAL        = "#5DD3C4"
CORAL       = "#FF7B7B"
VIOLET      = "#B98CFF"
MINT        = "#7FE3A1"
SKY         = "#6FB7FF"

# ----------------------------------------------------------------------
# 1.  Data: a unitary and a non-unitary matrix
# ----------------------------------------------------------------------
theta = np.pi / 5
U = np.array([
    [np.cos(theta), -np.sin(theta)],
    [np.sin(theta),  np.cos(theta)],
])
A = np.array([
    [1.35, 0.55],
    [0.20, 0.85],
])
v  = np.array([1.30, 0.55])
w  = np.array([0.45, 1.25])
Uv, Uw = U @ v, U @ w
Av, Aw = A @ v, A @ w

# ----------------------------------------------------------------------
# 2.  Helper drawing utilities
# ----------------------------------------------------------------------
def panel_bg(ax, title, subtitle=None):
    ax.set_facecolor(PANEL_BG)
    for s in ax.spines.values():
        s.set_color(PANEL_EDGE); s.set_linewidth(1.6)
    ax.set_title(title, color=INK, fontsize=15.5, fontweight="bold",
                 pad=12, loc="left")
    if subtitle:
        ax.text(0.0, 1.02, subtitle, transform=ax.transAxes,
                color=INK_DIM, fontsize=10.5, va="bottom", ha="left",
                style="italic")

def style_axes(ax, lim=2.0):
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    # subtle grid
    for g in np.linspace(-lim, lim, 9):
        ax.axhline(g, color=GRID, lw=0.6, zorder=0)
        ax.axvline(g, color=GRID, lw=0.6, zorder=0)
    # axes
    ax.axhline(0, color=INK_FAINT, lw=1.2, zorder=1)
    ax.axvline(0, color=INK_FAINT, lw=1.2, zorder=1)

def vec_arrow(ax, start, end, color, lw=3.0, zorder=6, label=None,
              label_offset=(0.0, 0.0), label_color=None, head=18):
    arrow = FancyArrowPatch(
        start, end,
        arrowstyle=f"-|>", mutation_scale=head,
        color=color, lw=lw, zorder=zorder,
        capstyle="round", joinstyle="round",
        path_effects=[pe.withStroke(linewidth=lw+2.5, foreground="black",
                                    alpha=0.55)],
    )
    ax.add_patch(arrow)
    if label is not None:
        lx = end[0] + label_offset[0]
        ly = end[1] + label_offset[1]
        ax.text(lx, ly, label, color=label_color or color,
                fontsize=14, fontweight="bold", ha="center", va="center",
                zorder=8,
                path_effects=[pe.withStroke(linewidth=3.5,
                                            foreground="black", alpha=0.7)])

def unit_circle(ax, color=GOLD, lw=2.0, alpha=0.85, zorder=3, ls="-"):
    ax.add_patch(Circle((0, 0), 1.0, fill=False, edgecolor=color,
                        lw=lw, alpha=alpha, zorder=zorder, linestyle=ls))

def angle_arc(ax, v1, v2, color, radius=0.45, lw=2.0, zorder=5, label=None):
    a1 = np.arctan2(v1[1], v1[0])
    a2 = np.arctan2(v2[1], v2[0])
    da = (a2 - a1) % (2 * np.pi)
    if da > np.pi:
        a1, a2 = a2, a1 + 2*np.pi
        da = (a2 - a1) % (2 * np.pi)
    arc = Arc((0, 0), 2*radius, 2*radius,
              theta1=np.degrees(a1), theta2=np.degrees(a2),
              color=color, lw=lw, zorder=zorder)
    ax.add_patch(arc)
    if label is not None:
        mid = (a1 + a2) / 2 if a2 > a1 else (a1 + a2 + 2*np.pi)/2
        r = radius + 0.22
        ax.text(r*np.cos(mid), r*np.sin(mid), label,
                color=color, fontsize=12.5, fontweight="bold",
                ha="center", va="center", zorder=7,
                path_effects=[pe.withStroke(linewidth=3,
                                            foreground="black", alpha=0.6)])

def callout(ax, xy_target, xy_text, text, color=INK, fontsize=10.5,
            box_face="#1F2A44", box_edge="#3A4866"):
    ax.annotate(
        text, xy=xy_target, xytext=xy_text,
        fontsize=fontsize, color=color, ha="center", va="center",
        bbox=dict(boxstyle="round,pad=0.5", fc=box_face,
                  ec=box_edge, lw=1.4, alpha=0.96),
        arrowprops=dict(arrowstyle="-|>", color=box_edge,
                        lw=1.6, shrinkA=0, shrinkB=6,
                        connectionstyle="arc3,rad=0.15"),
        zorder=12,
    )

def matrix_cell(ax, x, y, val, color, fontsize=15, bold=True):
    ax.text(x, y, val, color=color, fontsize=fontsize,
            ha="center", va="center",
            fontweight="bold" if bold else "normal",
            family="monospace", zorder=6)

# ----------------------------------------------------------------------
# 3.  Figure & layout
# ----------------------------------------------------------------------
fig = plt.figure(figsize=(18, 11.5), facecolor=BG,
                 dpi=150, linewidth=0.0)

# Title block
fig.text(0.5, 0.965, "Unitary Matrices",
         color=INK, fontsize=30, fontweight="bold",
         ha="center", va="center")
fig.text(0.5, 0.918,
         r"$U^{\dagger}\,U \;=\; I$   preserves inner products, lengths, and angles",
         color=GOLD, fontsize=16.5, ha="center", va="center",
         style="italic")
fig.text(0.5, 0.885,
         "Every representation of a finite group can be made unitary — "
         "the foundation of complete reducibility.",
         color=INK_DIM, fontsize=12.5, ha="center", va="center")

# Three panels
gs = fig.add_gridspec(1, 3, left=0.045, right=0.955,
                      bottom=0.10, top=0.84, wspace=0.10)
ax1 = fig.add_subplot(gs[0, 0])
ax2 = fig.add_subplot(gs[0, 1])
ax3 = fig.add_subplot(gs[0, 2])

# ======================================================================
# PANEL 1 — Algebraic definition:  U† U = I
# ======================================================================
panel_bg(ax1, "Defining Property",
         "Conjugate-transpose is the inverse")

ax1.set_xlim(-0.2, 5.2)
ax1.set_ylim(-0.2, 4.6)
ax1.set_aspect("equal")
ax1.set_xticks([]); ax1.set_yticks([])
for s in ax1.spines.values():
    s.set_visible(False)

# --- U† ---
ax1.text(0.55, 3.7, r"$U^{\dagger}$", color=TEAL, fontsize=30,
         ha="center", va="center", fontweight="bold")
for i in range(2):
    for j in range(2):
        matrix_cell(ax1, 0.55 + 0.55*j, 2.9 - 0.55*i,
                    f"{U[j,i]:+.2f}", TEAL, fontsize=14)
ax1.add_patch(mpatches.Rectangle((0.18, 2.18), 0.74, 1.64,
                                 fill=False, edgecolor=TEAL, lw=2.2))

# --- U ---
ax1.text(2.25, 3.7, r"$U$", color=CORAL, fontsize=30,
         ha="center", va="center", fontweight="bold")
for i in range(2):
    for j in range(2):
        matrix_cell(ax1, 2.25 + 0.55*j, 2.9 - 0.55*i,
                    f"{U[i,j]:+.2f}", CORAL, fontsize=14)
ax1.add_patch(mpatches.Rectangle((1.88, 2.18), 0.74, 1.64,
                                 fill=False, edgecolor=CORAL, lw=2.2))

# --- equals ---
ax1.text(3.55, 2.95, "=", color=INK, fontsize=34,
         ha="center", va="center", fontweight="bold")

# --- I ---
ax1.text(4.55, 3.7, r"$I$", color=GOLD, fontsize=30,
         ha="center", va="center", fontweight="bold")
matrix_cell(ax1, 4.30, 3.15, "1", GOLD, fontsize=16)
matrix_cell(ax1, 4.80, 3.15, "0", INK_FAINT, fontsize=14, bold=False)
matrix_cell(ax1, 4.30, 2.60, "0", INK_FAINT, fontsize=14, bold=False)
matrix_cell(ax1, 4.80, 2.60, "1", GOLD, fontsize=16)
ax1.add_patch(mpatches.Rectangle((4.13, 2.32), 0.84, 1.10,
                                 fill=False, edgecolor=GOLD, lw=2.2))

# --- property list ---
props = [
    (r"$U^{-1} = U^{\dagger}$",            TEAL),
    (r"$\|U\mathbf{v}\| = \|\mathbf{v}\|$",  MINT),
    (r"$\langle U\mathbf{v},\,U\mathbf{w}\rangle = \langle\mathbf{v},\,\mathbf{w}\rangle$",
                                            SKY),
    (r"$|\det U| = 1$",                     VIOLET),
]
for k, (txt, col) in enumerate(props):
    y = 1.45 - 0.42*k
    ax1.text(0.25, y, "●", color=col, fontsize=14, va="center")
    ax1.text(0.55, y, txt, color=INK, fontsize=13.5, va="center")

# small caption
ax1.text(2.5, -0.05,
         "Columns of  U  are orthonormal:  orthonormal basis → orthonormal basis",
         color=INK_DIM, fontsize=11, ha="center", va="center", style="italic")

# ======================================================================
# PANEL 2 — Geometry: preservation vs. distortion
# ======================================================================
panel_bg(ax2, "Geometric Meaning",
         "Unitary preserves  ·  |  Non-unitary distorts")

style_axes(ax2, lim=2.05)
unit_circle(ax2, color=GOLD, lw=2.2, alpha=0.9)

# --- original vectors ---
vec_arrow(ax2, (0, 0), tuple(v),  SKY,  lw=3.2,
          label=r"$\mathbf{v}$",  label_offset=(0.10, 0.16))
vec_arrow(ax2, (0, 0), tuple(w),  MINT, lw=3.2,
          label=r"$\mathbf{w}$",  label_offset=(-0.18, 0.14))
angle_arc(ax2, v, w, color=GOLD, radius=0.55, lw=2.2,
          label=r"$\theta$")

# --- U-transformed (preserved) ---
vec_arrow(ax2, (0, 0), tuple(Uv), SKY,  lw=3.0, ls=(0, (6, 3)),
          label=r"$U\mathbf{v}$", label_offset=(0.12, -0.22))
vec_arrow(ax2, (0, 0), tuple(Uw), MINT, lw=3.0, ls=(0, (6, 3)),
          label=r"$U\mathbf{w}$", label_offset=(-0.30, -0.18))
angle_arc(ax2, Uv, Uw, color=GOLD, radius=0.78, lw=2.0,
          label=r"$\theta$")

# --- A-transformed (distorted) ---
vec_arrow(ax2, (0, 0), tuple(Av), CORAL, lw=3.0,
          label=r"$A\mathbf{v}$", label_offset=(0.10, -0.10))
vec_arrow(ax2, (0, 0), tuple(Aw), VIOLET, lw=3.0,
          label=r"$A\mathbf{w}$", label_offset=(0.10, 0.18))
angle_arc(ax2, Av, Aw, color=CORAL, radius=1.05, lw=2.0,
          label=r"$\theta'$")

# callouts
callout(ax2, tuple(Uv), (1.55, 1.85),
        "length & angle preserved", color=SKY, fontsize=10.5)
callout(ax2, tuple(Av), (1.65, -1.55),
        "length & angle distorted", color=CORAL, fontsize=10.5)

# legend
legend_items = [
    Line2D([0], [0], color=SKY,   lw=3,   label=r"$\mathbf{v},\,U\mathbf{v}$"),
    Line2D([0], [0], color=MINT,  lw=3,   label=r"$\mathbf{w},\,U\mathbf{w}$"),
    Line2D([0], [0], color=CORAL, lw=3,   label=r"$A\mathbf{v}$ (non-unitary)"),
    Line2D([0], [0], color=VIOLET,lw=3,   label=r"$A\mathbf{w}$ (non-unitary)"),
    Line2D([0], [0], color=GOLD,  lw=2,   label="unit circle"),
]
leg = ax2.legend(handles=legend_items, loc="lower left",
                 bbox_to_anchor=(0.02, 0.02),
                 facecolor="#1F2A44", edgecolor="#3A4866",
                 labelcolor=INK, fontsize=10, framealpha=0.95)
leg.get_frame().set_linewidth(1.4)

# ======================================================================
# PANEL 3 — Weyl averaging construction
# ======================================================================
panel_bg(ax3, "Averaging Construction",
         "Building a U-invariant inner product")

ax3.set_xlim(-0.1, 5.1)
ax3.set_ylim(-0.1, 4.7)
ax3.set_aspect("equal")
ax3.set_xticks([]); ax3.set_yticks([])
for s in ax3.spines.values():
    s.set_visible(False)

# --- top: the formula -----------------------------------------------
ax3.text(2.5, 4.35,
         r"$\langle \mathbf{x},\,\mathbf{y}\rangle \;=\; "
         r"\frac{1}{|G|}\sum_{g\in G}\,"
         r "(D(g)\mathbf{x},\,D(g)\mathbf{y})$",
         color=GOLD, fontsize=17, ha="center", va="center")

# --- the three group elements (mini panels) -------------------------
elem_centers = [(0.85, 2.55), (2.50, 2.55), (4.15, 2.55)]
elem_labels  = [r"$g_1 = e$", r"$g_2$", r"$g_3$"]
elem_mats    = [np.eye(2),
                np.array([[np.cos(np.pi/3), -np.sin(np.pi/3)],
                          [np.sin(np.pi/3),  np.cos(np.pi/3)]]),
                np.array([[np.cos(2*np.pi/3), -np.sin(2*np.pi/3)],
                          [np.sin(2*np.pi/3),  np.cos(2*np.pi/3)]])]
elem_colors  = [SKY, MINT, VIOLET]

for (cx, cy), lab, mat, col in zip(elem_centers, elem_labels,
                                   elem_mats, elem_colors):
    # mini frame
    ax3.add_patch(FancyBboxPatch(
        (cx-0.62, cy-0.85), 1.24, 1.85,
        boxstyle="round,pad=0.04,rounding_size=0.10",
        fc="#1A2238", ec=col, lw=1.8, alpha=0.95, zorder=2))
    # label
    ax3.text(cx, cy+0.78, lab, color=col, fontsize=13.5,
             ha="center", va="center", fontweight="bold")
    # matrix entries
    for i in range(2):
        for j in range(2):
            val = mat[i, j]
            txt = f"{val:+.2f}" if abs(val) > 1e-6 else " 0.00"
            if abs(abs(val) - 1) < 1e-6:
                txt = f"{val:+.2f}"
            matrix_cell(ax3, cx - 0.22 + 0.44*j, cy + 0.18 - 0.44*i,
                        txt, INK, fontsize=12.5)
    # bracket
    ax3.plot([cx-0.40, cx-0.40, cx+0.40, cx+0.40],
             [cy+0.40, cy-0.40, cy-0.40, cy+0.40],
             color=col, lw=1.8, zorder=4)
    # tiny "D(g)" tag
    ax3.text(cx, cy-0.62, r"$D(g)$", color=INK_DIM, fontsize=10.5,
             ha="center", va="center", style="italic")

# plus signs between
ax3.text(1.67, 2.55, "+", color=INK, fontsize=22, ha="center",
         va="center", fontweight="bold")
ax3.text(3.32, 2.55, "+", color=INK, fontsize=22, ha="center",
         va="center", fontweight="bold")

# --- the "1/|G|" factor on the left ---------------------------------
ax3.text(0.10, 2.55, r"$\frac{1}{|G|}$", color=GOLD, fontsize=20,
         ha="center", va="center", fontweight="bold")

# --- arrow down to the result ---------------------------------------
ax3.annotate("", xy=(2.5, 1.45), xytext=(2.5, 1.75),
             arrowprops=dict(arrowstyle="-|>", color=INK_DIM,
                             lw=2.0, shrinkA=0, shrinkB=0))

# --- result box: invariant inner product ----------------------------
ax3.add_patch(FancyBboxPatch(
    (1.15, 0.55), 2.7, 0.85,
    boxstyle="round,pad=0.05,rounding_size=0.12",
    fc="#243150", ec=GOLD, lw=2.0, alpha=0.97, zorder=3))
ax3.text(2.5, 1.10, r"$\langle\,\cdot\,,\,\cdot\,\rangle$",
         color=GOLD, fontsize=18, ha="center", va="center",
         fontweight="bold")
ax3.text(2.5, 0.72, "U-invariant inner product",
         color=INK, fontsize=11.5, ha="center", va="center")

# --- consequence banner ---------------------------------------------
ax3.add_patch(FancyBboxPatch(
    (0.30, -0.05), 4.40, 0.42,
    boxstyle="round,pad=0.04,rounding_size=0.08",
    fc="#2A1B2E", ec=VIOLET, lw=1.6, alpha=0.95, zorder=3))
ax3.text(2.5, 0.16,
         "⟹  reducible  ⟺  completely reducible",
         color=VIOLET, fontsize=12.5, ha="center", va="center",
         fontweight="bold")

# ----------------------------------------------------------------------
# 4.  Footer
# ----------------------------------------------------------------------
fig.text(0.5, 0.055,
         "Weyl's trick:  average any inner product over the group  →  "
         "the representation becomes unitary in the new basis.",
         color=INK_DIM, fontsize=12, ha="center", va="center", style="italic")
fig.text(0.5, 0.025,
         "D(g⁻¹) = D⁻¹(g) = D†(g)     ·     "
         "⟨D(g)x, D(g)y⟩ = ⟨x, y⟩     ·     |det U| = 1",
         color=INK_FAINT, fontsize=11, ha="center", va="center",
         family="monospace")

# ----------------------------------------------------------------------
# 5.  Render
# ----------------------------------------------------------------------
plt.savefig("unitary_matrices.png", dpi=200, facecolor=BG,
            bbox_inches="tight", pad_inches=0.3)
plt.show()
```

### What the figure communicates

**Panel 1 — Defining Property.** Shows $U^\dagger U = I$ concretely with a real rotation matrix, so the viewer sees *exactly* what the conjugate-transpose does. The four bullet points enumerate the equivalent characterizations (inverse = adjoint, length-preserving, inner-product-preserving, $|\det U|=1$).

**Panel 2 — Geometric Meaning.** The unit circle (gold) is the visual anchor. The original vectors $\mathbf{v}, \mathbf{w}$ (solid) and their images $U\mathbf{v}, U\mathbf{w}$ (dashed, same colors) lie on the same circle with the same angle $\theta$ between them — preservation made visible. The non-unitary $A$ sends them to $A\mathbf{v}, A\mathbf{w}$ (coral/violet), which break the circle and change both lengths and the angle to $\theta'$.

**Panel 3 — Averaging Construction.** The Weyl formula sits on top. Below it, three sample group elements $g_1=e, g_2, g_3$ with their matrices $D(g)$ are summed (with the $1/|G|$ prefactor) and the result flows down to a gold-bordered "U-invariant inner product" box, which in turn implies the banner consequence: *reducible ⟺ completely reducible*.

The dark theme with a gold/teal/coral/violet palette gives a presentation-grade aesthetic; bold strokes, drop-shadow path effects on arrows, rounded callout boxes, and a monospace footer with the key identities complete the portfolio look.