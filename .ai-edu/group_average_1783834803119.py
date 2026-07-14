"""
Group Average Visualization
============================
A portfolio-quality static diagram illustrating the group averaging process
in representation theory and its consequence via Schur's Lemma.
"""

from matplotlib.colors import to_rgba
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D
import numpy as np

# ============================================================
# Configuration & Color Palette
# ============================================================
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
    'font.size': 11,
    'mathtext.fontset': 'cm'
})

# Deep navy background for a premium dark-mode aesthetic
BG_COLOR = '#0B1026'
PANEL_BG = '#141B3A'
GRID_COLOR = '#1E2854'

# Vibrant, distinct hues for different conceptual elements
C_GROUP = '#00D9FF'      # Cyan - Symmetry / Group
C_INPUT = '#FFB347'     # Orange - Arbitrary / Asymmetric Input
C_AVG = '#9D4EDD'       # Purple - The Averaging Process
C_EQUIV = '#39FF14'     # Neon Green - Equivalent / Non-zero
C_INEQUIV = '#FF3366'   # Red - Inequivalent / Zero
C_TEXT = '#F4F4F9'      # Off-white for primary text
C_TEXT_DIM = '#A0A8C0'  # Dimmer text for annotations

# ============================================================
# Figure Setup
# ============================================================
fig = plt.figure(figsize=(16, 10), facecolor=BG_COLOR)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.set_facecolor(BG_COLOR)
ax.axis('off')

# Subtle background grid for technical aesthetic
for x in np.linspace(0, 16, 33):
    ax.plot([x, x], [0, 10], color=GRID_COLOR, lw=0.5, zorder=0)
for y in np.linspace(0, 10, 21):
    ax.plot([0, 16], [y, y], color=GRID_COLOR, lw=0.5, zorder=0)

# ============================================================
# Helper Functions
# ============================================================
def draw_matrix_glyph(ax, x, y, color, label, sublabel, asymmetry=0.0, size=0.8):
    """Draws a stylized matrix representation with an optional asymmetry skew."""
    # Outer bounding box
    box = FancyBboxPatch((x - size/2, y - size/2), size, size,
                         boxstyle="round,pad=0.02",
                         linewidth=2.5, edgecolor=color, facecolor='#1A2140', zorder=3)
    ax.add_patch(box)
    
    # Inner grid representing matrix elements
    res = 4
    cell = size / res
    for i in range(res):
        for j in range(res):
            # Create a pseudo-random but fixed pattern for the matrix entries
            intensity = 0.2 + 0.8 * ((np.sin(i*1.3 + j*0.7 + asymmetry*5) + 1) / 2)
            # Apply asymmetry skew
            if asymmetry > 0:
                intensity *= (1.0 - asymmetry * abs(i - j) / res)
            else:
                intensity *= (1.0 + asymmetry * (i == j)) # Skew towards diagonal
                
            fill = to_rgba(color, alpha=intensity * 0.6)  # ✅ Correct
            r = Rectangle((x - size/2 + j*cell, y - size/2 + i*cell), cell, cell,
                          facecolor=fill, edgecolor=color, linewidth=0.5, zorder=4)
            ax.add_patch(r)
            
    # Labels
    ax.text(x, y - size/2 - 0.25, label, ha='center', va='top', 
            fontsize=14, color=color, fontweight='bold', zorder=5)
    ax.text(x, y - size/2 - 0.55, sublabel, ha='center', va='top', 
            fontsize=9, color=C_TEXT_DIM, style='italic', zorder=5)

def draw_panel(ax, x, y, w, h, title):
    """Draws a translucent rounded panel for sectioning."""
    panel = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0.05,rounding_size=0.15",
                           linewidth=1.5, edgecolor=GRID_COLOR,
                           facecolor=PANEL_BG, alpha=0.6, zorder=1)
    ax.add_patch(panel)
    ax.text(x + 0.2, y + h - 0.3, title, fontsize=10, color=C_TEXT_DIM,
            fontweight='bold', va='top', zorder=2)

# ============================================================
# Title & Header
# ============================================================
ax.text(8.0, 9.5, 'THE GROUP AVERAGE', fontsize=28, color=C_TEXT, 
        ha='center', va='center', fontweight='bold', zorder=10)
ax.text(8.0, 9.0, r'$\Sigma = \sum_{g \in G} D^J(g^{-1}) \, M \, D^K(g)$', 
        fontsize=18, color=C_GROUP, ha='center', va='center', zorder=10)

# ============================================================
# Left Panel: The Averaging Process
# ============================================================
draw_panel(ax, 0.3, 0.5, 7.4, 8.0, "THE SYMMETRY FILTER")

# 1. Group Elements (Top)
ax.text(4.0, 8.0, 'Symmetry Operations $g \in G$', fontsize=12, color=C_GROUP, 
        ha='center', fontweight='bold', zorder=5)
# Draw a ring of group elements
ring_radius = 0.9
ring_center = (4.0, 6.8)
for i in range(6):
    angle = np.pi/2 + i * (2*np.pi/6)
    gx, gy = ring_center[0] + ring_radius*np.cos(angle), ring_center[1] + ring_radius*np.sin(angle)
    circle = mpatches.Circle((gx, gy), 0.25, facecolor=PANEL_BG, edgecolor=C_GROUP, 
                             linewidth=2, zorder=5)
    ax.add_patch(circle)
    ax.text(gx, gy, r'$g_{}$'.format(i+1), ha='center', va='center', 
            color=C_GROUP, fontsize=11, fontweight='bold', zorder=6)

# Central group label
ax.text(ring_center[0], ring_center[1], r'$G$', ha='center', va='center', 
        fontsize=20, color=C_GROUP, fontweight='bold', zorder=6)

# 2. Arbitrary Matrix M (Middle Left)
draw_matrix_glyph(ax, x=1.8, y=4.5, color=C_INPUT, 
                  label=r'$M$', sublabel='Arbitrary / Asymmetric', asymmetry=0.6)

# 3. Conjugation Arrows (The Process)
arrow_style = "Simple,head_length=12,head_width=8,tail_width=2"
arr1 = FancyArrowPatch((3.0, 4.5), (3.8, 4.5), arrowstyle=arrow_style, 
                       color=C_AVG, connectionstyle="arc3,rad=0.2", zorder=4)
arr2 = FancyArrowPatch((4.8, 4.5), (5.6, 4.5), arrowstyle=arrow_style, 
                       color=C_AVG, connectionstyle="arc3,rad=-0.2", zorder=4)
ax.add_patch(arr1)
ax.add_patch(arr2)

ax.text(3.4, 5.2, r'$D^J(g^{-1})$', ha='center', color=C_AVG, fontsize=11, zorder=5)
ax.text(5.2, 5.2, r'$D^K(g)$', ha='center', color=C_AVG, fontsize=11, zorder=5)

# 4. Summation Symbol and Result (Middle Right)
ax.text(6.2, 4.5, r'$\sum$', fontsize=36, color=C_AVG, ha='center', va='center', 
        fontweight='bold', zorder=5)

draw_matrix_glyph(ax, x=7.0, y=4.5, color=C_AVG, 
                  label=r'$\Sigma$', sublabel='Symmetrized', asymmetry=-0.8, size=0.7)

# 5. Downward Arrow to Consequence
arr_down = FancyArrowPatch((4.0, 3.5), (4.0, 2.5), arrowstyle="Simple,head_length=15,head_width=12,tail_width=3", 
                           color=C_TEXT_DIM, zorder=4)
ax.add_patch(arr_down)
ax.text(4.2, 3.0, 'Apply Schur\'s Lemma', ha='left', va='center', 
        color=C_TEXT_DIM, fontsize=10, style='italic', zorder=5)

# ============================================================
# Right Panel: The Consequence (Schur's Lemma)
# ============================================================
draw_panel(ax, 8.3, 0.5, 7.4, 8.0, "THE EMERGENT MACROSCOPIC PROPERTY")

# Split into two outcomes
mid_y = 4.5

# Case 1: Inequivalent (J != K) -> Zero
ax.text(9.5, 7.5, r'Case 1: $J \neq K$ (Inequivalent)', fontsize=12, color=C_INEQUIV, 
        fontweight='bold', zorder=5)
ax.text(9.5, 7.1, 'Incompatible symmetry spaces', fontsize=9, color=C_TEXT_DIM, 
        style='italic', zorder=5)

# Draw a zeroed-out matrix
draw_matrix_glyph(ax, x=9.5, y=6.0, color=C_INEQUIV, 
                  label=r'$\Sigma = 0$', sublabel='Annihilation', asymmetry=0.0, size=0.8)
# Explicitly draw an empty/dark matrix to signify zero
zero_box = FancyBboxPatch((9.5-0.4, 6.0-0.4), 0.8, 0.8,
                          boxstyle="round,pad=0.02",
                          linewidth=2.5, edgecolor=C_INEQUIV, facecolor='#1A2140', zorder=4)
ax.add_patch(zero_box)
ax.text(9.5, 6.0, '0', fontsize=24, color=C_INEQUIV, ha='center', va='center', 
        fontweight='bold', zorder=5)

# Case 2: Equivalent (J = K) -> Scalar Identity
ax.text(14.5, 7.5, r'Case 2: $J = K$ (Equivalent)', fontsize=12, color=C_EQUIV, 
        fontweight='bold', zorder=5)
ax.text(14.5, 7.1, 'Matching symmetry spaces', fontsize=9, color=C_TEXT_DIM, 
        style='italic', zorder=5)

# Draw a scalar identity matrix
draw_matrix_glyph(ax, x=14.5, y=6.0, color=C_EQUIV, 
                  label=r'$\Sigma = \lambda I$', sublabel='Isotropic Scaling', asymmetry=-1.0, size=0.8)

# ============================================================
# Bottom Annotations: Reductionist Philosophy
# ============================================================
ax.text(8.0, 2.0, 'REDUCTIONIST VIEW', fontsize=14, color=C_TEXT, 
        ha='center', fontweight='bold', zorder=5)

# Text box for explanation
textstr = (
    "Complex, arbitrary microscopic interactions ($M$) are bombarded by all fundamental symmetries ($g \in G$).\n"
    "The averaging process acts as a rigid filter: the asymmetric internal structure of $M$ is annihilated.\n"
    "What emerges is either absolute nothingness ($0$) or a perfectly uniform, isotropic scaling ($\lambda I$)."
)
props = dict(boxstyle='round,pad=0.8', facecolor=PANEL_BG, edgecolor=GRID_COLOR, alpha=0.8)
ax.text(8.0, 1.2, textstr, fontsize=10, color=C_TEXT, ha='center', va='center', 
        bbox=props, zorder=5, linespacing=1.5)

# ============================================================
# Display
# ============================================================
plt.show()