"""
Schur's Lemma: The Binary Dichotomy of Irreducible Representations

Visualizes the core theorem of representation theory:
For two irreducible representations D_J and D_K of a group G,
the averaged intertwining operator Σ either vanishes (inequivalent case)
or is a scalar multiple of the identity (equivalent case).

This strict binary outcome is the mathematical engine behind the
Grand Orthogonality Theorem.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D
import numpy as np

# =====================================================================
# 1. GLOBAL CONFIGURATION
# =====================================================================
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['mathtext.fontset'] = 'cm'

# Deep academic dark theme palette
BG_COLOR = '#0D1117'
PANEL_BG = '#161B22'
GRID_COLOR = '#21262D'
TEXT_COLOR = '#E6EDF3'
SUBTEXT_COLOR = '#8B949E'

# Vibrant distinct hues for representations
COLOR_G = '#58A6FF'       # Bright Blue for Group G
COLOR_J = '#F778BA'       # Pink/Magenta for V_J
COLOR_K = '#7EE787'       # Neon Green for V_K
COLOR_SIGMA = '#FFA657'   # Vivid Orange for Σ
COLOR_M = '#D2A8FF'       # Soft Purple for M
COLOR_LAMBDA = '#FFD700'  # Gold for λI

# =====================================================================
# 2. HELPER FUNCTIONS
# =====================================================================
def draw_panel(ax, x, y, w, h, title, color):
    """Draws a rounded rectangle panel with a title bar."""
    # Main body
    body = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.02,rounding_size=0.15",
                          edgecolor=color, facecolor=PANEL_BG,
                          linewidth=2.5, zorder=1)
    ax.add_patch(body)
    # Title bar
    title_h = 0.4
    title_bar = FancyBboxPatch((x, y + h - title_h), w, title_h,
                               boxstyle="round,pad=0.02,rounding_size=0.15",
                               edgecolor='none', facecolor=color,
                               alpha=0.15, zorder=2)
    ax.add_patch(title_bar)
    # Title text
    ax.text(x + w/2, y + h - title_h/2, title,
            ha='center', va='center', fontsize=12, fontweight='bold',
            color=color, zorder=3)

def draw_arrow(ax, x1, y1, x2, y2, color, label='', label_color=None, lw=2.5, style='-|>', connectionstyle="arc3,rad=0"):
    """Draws a stylized arrow with optional label."""
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                            arrowstyle=style, mutation_scale=20,
                            color=color, linewidth=lw,
                            connectionstyle=connectionstyle,
                            zorder=4)
    ax.add_patch(arrow)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        # Offset label based on connection style to avoid overlapping the arrow
        if "rad=0" in connectionstyle:
            my += 0.15
        else:
            mx += 0.2
            my += 0.1
            
        ax.text(mx, my, label, fontsize=11, color=label_color or color,
                ha='center', va='center', fontweight='bold',
                bbox=dict(facecolor=BG_COLOR, edgecolor='none', pad=2, alpha=0.8),
                zorder=5)

def draw_vector_space(ax, cx, cy, radius, color, label, dim_label):
    """Draws a stylized vector space as a circle with basis vectors."""
    # Outer glow
    for r, a in zip([radius*1.15, radius*1.05, radius], [0.05, 0.1, 0.15]):
        circle = plt.Circle((cx, cy), r, color=color, alpha=a, zorder=1)
        ax.add_patch(circle)
    # Main boundary
    circle = plt.Circle((cx, cy), radius, edgecolor=color, facecolor='none',
                        linewidth=2.5, zorder=2)
    ax.add_patch(circle)
    # Basis vectors (cross pattern)
    ax.plot([cx-radius*0.6, cx+radius*0.6], [cy, cy], color=color, lw=1.5, alpha=0.6, zorder=2)
    ax.plot([cx, cx], [cy-radius*0.6, cy+radius*0.6], color=color, lw=1.5, alpha=0.6, zorder=2)
    # Labels
    ax.text(cx, cy + radius + 0.3, label, ha='center', va='bottom',
            fontsize=14, fontweight='bold', color=color, zorder=3)
    ax.text(cx, cy - radius - 0.3, dim_label, ha='center', va='top',
            fontsize=10, color=SUBTEXT_COLOR, zorder=3)

# =====================================================================
# 3. FIGURE INITIALIZATION
# =====================================================================
fig = plt.figure(figsize=(18, 11), facecolor=BG_COLOR)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 18)
ax.set_ylim(0, 11)
ax.axis('off')

# Subtle background grid
for i in range(0, 19):
    ax.axvline(i, color=GRID_COLOR, lw=0.5, zorder=0)
for i in range(0, 12):
    ax.axhline(i, color=GRID_COLOR, lw=0.5, zorder=0)

# =====================================================================
# 4. TITLE AND INTRO
# =====================================================================
fig.text(0.5, 0.965, "Schur's Lemma: The Binary Dichotomy of Irreducible Representations",
         ha='center', va='top', fontsize=22, fontweight='bold', color=TEXT_COLOR)

intro_text = (
    "Let $D_J: G \\to GL(V_J)$ and $D_K: G \\to GL(V_K)$ be two irreducible representations.\n"
    "The averaged intertwining operator $\\Sigma = \\sum_{g \\in G} D_J(g^{-1}) M D_K(g)$ "
    "must satisfy $D_J(h)\\Sigma = \\Sigma D_K(h)$."
)
fig.text(0.5, 0.905, intro_text, ha='center', va='top', fontsize=13,
         color=SUBTEXT_COLOR, style='italic')

# =====================================================================
# 5. SHARED ELEMENTS (TOP)
# =====================================================================
# Group G
draw_panel(ax, x=7.0, y=7.8, w=4.0, h=1.2, title="Group G (Symmetry)", color=COLOR_G)
ax.text(9.0, 8.2, "Elements: $\\{e, g, h, x, \\dots \\}$",
        ha='center', va='center', fontsize=12, color=TEXT_COLOR, zorder=3)

# Probe Matrix M
draw_panel(ax, x=12.5, y=7.8, w=4.0, h=1.2, title="Arbitrary Probe Matrix M", color=COLOR_M)
ax.text(14.5, 8.2, "$M: V_K \\to V_J$",
        ha='center', va='center', fontsize=12, color=TEXT_COLOR, zorder=3)

# =====================================================================
# 6. CASE 1: INEQUIVALENT (LEFT PANEL)
# =====================================================================
case1_x = 0.5
case1_y = 1.5
case1_w = 8.0
case1_h = 5.5

draw_panel(ax, case1_x, case1_y, case1_w, case1_h, 
           "CASE 1: INEQUIVALENT ($D_J \\not\\cong D_K$)", COLOR_K)

# Vector Spaces
draw_vector_space(ax, cx=2.5, cy=4.2, radius=0.9, color=COLOR_K, 
                  label="$V_K$", dim_label="$D_K(g)$ acts here")
draw_vector_space(ax, cx=6.5, cy=4.2, radius=0.9, color=COLOR_J, 
                  label="$V_J$", dim_label="$D_J(g)$ acts here")

# Arrows for Case 1
# G to D_K
draw_arrow(ax, 8.5, 8.0, 2.5, 5.1, COLOR_G, label="$D_K$", label_color=COLOR_K, connectionstyle="arc3,rad=0.2")
# G to D_J
draw_arrow(ax, 9.5, 8.0, 6.5, 5.1, COLOR_G, label="$D_J$", label_color=COLOR_J, connectionstyle="arc3,rad=-0.2")
# M to V_K
draw_arrow(ax, 12.5, 8.0, 3.1, 4.8, COLOR_M, label="$M$", connectionstyle="arc3,rad=0.3")

# The Result: Sigma = 0
# Draw a large slashed zero
ax.plot(5.5, 3.0, 'o', markersize=50, markerfacecolor='none', 
        markeredgecolor=COLOR_SIGMA, markeredgewidth=3, zorder=4)
ax.plot([5.15, 5.85], [2.65, 3.35], color=COLOR_SIGMA, lw=3, zorder=5)

ax.text(5.5, 2.0, "$\\Sigma = 0$", ha='center', va='center', fontsize=18, 
        fontweight='bold', color=COLOR_SIGMA,
        bbox=dict(facecolor=BG_COLOR, edgecolor=COLOR_SIGMA, pad=8, boxstyle="round,pad=0.4"), zorder=6)

ax.text(4.5, 1.8, "No invertible map $S$ exists.\n$\\Sigma$ is forced to the trivial zero map.",
        ha='center', va='center', fontsize=11, color=SUBTEXT_COLOR, style='italic')


# =====================================================================
# 7. CASE 2: EQUIVALENT / IDENTICAL (RIGHT PANEL)
# =====================================================================
case2_x = 9.5
case2_y = 1.5
case2_w = 8.0
case2_h = 5.5

draw_panel(ax, case2_x, case2_y, case2_w, case2_h, 
           "CASE 2: IDENTICAL / EQUIVALENT ($D_J \\cong D_K$)", COLOR_J)

# Vector Spaces (Overlapping to show equivalence)
# V_K
draw_vector_space(ax, cx=12.0, cy=4.2, radius=1.1, color=COLOR_K, 
                  label="$V_K$", dim_label="")
# V_J (Offset slightly to show layering)
draw_vector_space(ax, cx=14.5, cy=4.2, radius=1.1, color=COLOR_J, 
                  label="$V_J$", dim_label="")

# Change of basis S
draw_arrow(ax, 13.1, 4.8, 13.4, 4.8, COLOR_LAMBDA, label="$S$", lw=3, connectionstyle="arc3,rad=0")
ax.text(13.25, 5.5, "Change of Basis", ha='center', va='center', fontsize=10, 
        color=COLOR_LAMBDA, fontweight='bold')

# Arrows for Case 2
# G to V
draw_arrow(ax, 9.0, 8.0, 12.0, 5.3, COLOR_G, label="$D_K$", label_color=COLOR_K, connectionstyle="arc3,rad=0.2")
draw_arrow(ax, 10.0, 8.0, 14.5, 5.3, COLOR_G, label="$D_J$", label_color=COLOR_J, connectionstyle="arc3,rad=-0.2")
# M to V_K
draw_arrow(ax, 14.5, 8.0, 12.6, 4.8, COLOR_M, label="$M$", connectionstyle="arc3,rad=0.3")

# The Result: Sigma = lambda * I
# Draw a stylized Identity Matrix
matrix_x = 13.25
matrix_y = 2.5
matrix_size = 0.8

# Matrix Brackets
ax.plot([matrix_x - matrix_size/2, matrix_x - matrix_size/2], 
        [matrix_y - matrix_size/2, matrix_y + matrix_size/2], color=COLOR_SIGMA, lw=2.5)
ax.plot([matrix_x - matrix_size/2, matrix_x - matrix_size/2 + 0.1], 
        [matrix_y - matrix_size/2, matrix_y - matrix_size/2], color=COLOR_SIGMA, lw=2.5)
ax.plot([matrix_x - matrix_size/2, matrix_x - matrix_size/2 + 0.1], 
        [matrix_y + matrix_size/2, matrix_y + matrix_size/2], color=COLOR_SIGMA, lw=2.5)

ax.plot([matrix_x + matrix_size/2, matrix_x + matrix_size/2], 
        [matrix_y - matrix_size/2, matrix_y + matrix_size/2], color=COLOR_SIGMA, lw=2.5)
ax.plot([matrix_x + matrix_size/2, matrix_x + matrix_size/2 - 0.1], 
        [matrix_y - matrix_size/2, matrix_y - matrix_size/2], color=COLOR_SIGMA, lw=2.5)
ax.plot([matrix_x + matrix_size/2, matrix_x + matrix_size/2 - 0.1], 
        [matrix_y + matrix_size/2, matrix_y + matrix_size/2], color=COLOR_SIGMA, lw=2.5)

# Diagonal elements
for i in range(-1, 2):
    ax.text(matrix_x + i*0.25, matrix_y + i*0.25, "$\\lambda$", 
            ha='center', va='center', fontsize=12, color=COLOR_LAMBDA, fontweight='bold')

ax.text(matrix_x, matrix_y - 1.0, "$\\Sigma = \\lambda I$", ha='center', va='center', fontsize=18, 
        fontweight='bold', color=COLOR_SIGMA,
        bbox=dict(facecolor=BG_COLOR, edgecolor=COLOR_SIGMA, pad=8, boxstyle="round,pad=0.4"), zorder=6)

ax.text(matrix_x, 1.8, "Invertible map $S$ exists.\n$\\Sigma$ commutes with all $D(h)$, hence is scalar.",
        ha='center', va='center', fontsize=11, color=SUBTEXT_COLOR, style='italic')


# =====================================================================
# 8. LEGEND AND FOOTER
# =====================================================================
legend_elements = [
    Line2D([0], [0], color=COLOR_G, lw=3, label='Group Action $D(g)$'),
    Line2D([0], [0], color=COLOR_M, lw=3, label='Arbitrary Probe $M$'),
    Line2D([0], [0], marker='o', color='none', markerfacecolor=COLOR_SIGMA, markersize=12, label='Intertwiner $\\Sigma$'),
    Line2D([0], [0], color=COLOR_LAMBDA, lw=3, label='Scalar $\\lambda$ / Change of Basis $S$')
]

ax.legend(handles=legend_elements, loc='lower center', 
          bbox_to_anchor=(0.5, -0.02), ncol=4, 
          facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR,
          fontsize=11, frameon=True)

fig.text(0.5, 0.02, "This strict binary outcome directly yields the matrix-element orthogonality (Grand Orthogonality Theorem).",
         ha='center', va='bottom', fontsize=12, color=TEXT_COLOR, style='italic')

plt.show()