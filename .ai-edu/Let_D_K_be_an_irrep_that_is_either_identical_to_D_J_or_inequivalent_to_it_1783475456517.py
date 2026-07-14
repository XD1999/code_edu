"""
Visualization: "Let D_K be an irrep that is either identical to D_J or inequivalent to it"

This script generates a polished, static diagram illustrating the dichotomy of 
irreducible representations (irreps) in group theory, which is the foundation 
of Schur's Lemma and the Grand Orthogonality Theorem.

Visual Strategy:
- A central node represents an arbitrary irrep D_K.
- It branches into two mutually exclusive cases: Identical (D_K ≅ D_J) and Inequivalent.
- The 'Identical' branch shows a commutative diagram demonstrating that D_K(g) and D_J(g) 
  differ only by a similarity transform S.
- The 'Inequivalent' branch shows two completely disjoint representation spaces, 
  emphasizing that no intertwining matrix exists (except the zero matrix).
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.path import Path
import matplotlib.font_manager as fm
import numpy as np

# --- Configuration & Styling ---
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.unicode'] = False

# Color Palette (Vibrant, Cel-shaded inspired)
BG_COLOR = '#F7F9FB'        # Clean off-white background
DARK_TEXT = '#1A1A2E'       # Deep dark blue/black for text
SUBTLE_TEXT = '#5D5D7A'     # Grey for secondary text

# Branch Colors
C_IDENTICAL = '#FF6B6B'     # Warm vibrant red
C_IDENTICAL_LIGHT = '#FFD1D1'
C_INEQUIVALENT = '#4ECDC4'  # Bright teal
C_INEQUIVALENT_LIGHT = '#D1F0EE'
C_CENTRAL = '#FFD93D'       # Bright yellow for central node
C_CENTRAL_LIGHT = '#FFF6CC'

# Matrix Colors
C_MATRIX_FILL = '#FFFFFF'
C_MATRIX_EDGE = DARK_TEXT

def draw_matrix(ax, x, y, size=1.0, label="", color_edge=DARK_TEXT, lw=2.5):
    """Draws a stylized matrix (square with brackets)."""
    half = size / 2
    # Matrix fill
    rect = mpatches.Rectangle((x - half, y - half), size, size, 
                              facecolor=C_MATRIX_FILL, edgecolor='none', zorder=2)
    ax.add_patch(rect)
    
    # Brackets
    bracket_w = 0.12
    bracket_len = size * 0.8
    b_y = y - bracket_len/2
    
    # Left bracket
    left_bracket = Path([
        (x - half + bracket_w, b_y), 
        (x - half, b_y), 
        (x - half, y), 
        (x - half, b_y + bracket_len), 
        (x - half + bracket_w, b_y + bracket_len)
    ], [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO, Path.LINETO])
    
    # Right bracket
    right_bracket = Path([
        (x + half - bracket_w, b_y), 
        (x + half, b_y), 
        (x + half, y), 
        (x + half, b_y + bracket_len), 
        (x + half - bracket_w, b_y + bracket_len)
    ], [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO, Path.LINETO])
    
    ax.add_patch(mpatches.PathPatch(left_bracket, facecolor='none', edgecolor=color_edge, lw=lw, zorder=3))
    ax.add_patch(mpatches.PathPatch(right_bracket, facecolor='none', edgecolor=color_edge, lw=lw, zorder=3))
    
    if label:
        ax.text(x, y - size/2 - 0.25, label, ha='center', va='top', 
                fontsize=14, color=DARK_TEXT, fontweight='bold', zorder=4)

def draw_arrow(ax, start, end, color=DARK_TEXT, lw=2.5, style='->', mutation=20):
    """Draws a fancy arrow between two points."""
    arrow = FancyArrowPatch(start, end, arrowstyle=style, mutation_scale=mutation,
                            color=color, lw=lw, zorder=1,
                            connectionstyle="arc3,rad=0")
    ax.add_patch(arrow)

def draw_box(ax, x, y, w, h, text, facecolor, edgecolor, text_color=DARK_TEXT, fontsize=13, boxstyle="round,pad=0.1"):
    """Draws a rounded rectangle with text."""
    box = FancyBboxPatch((x - w/2, y - h/2), w, h, 
                         boxstyle=boxstyle, 
                         facecolor=facecolor, edgecolor=edgecolor, 
                         linewidth=2.5, zorder=2)
    ax.add_patch(box)
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, 
            color=text_color, fontweight='bold', zorder=3, wrap=True)

# --- Figure Setup ---
fig, ax = plt.subplots(figsize=(16, 10), dpi=150)
ax.set_facecolor(BG_COLOR)
fig.patch.set_facecolor(BG_COLOR)
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.axis('off')

# --- Title ---
ax.text(8, 9.5, "Dichotomy of Irreps in Group Theory", 
        ha='center', va='center', fontsize=22, fontweight='bold', color=DARK_TEXT)
ax.text(8, 9.0, "Let $D_K$ be an irrep that is either identical to $D_J$ or inequivalent to it", 
        ha='center', va='center', fontsize=15, color=SUBTLE_TEXT, style='italic')

# --- Central Node ---
draw_box(ax, 8, 7.8, 3.5, 1.0, "Irrep $D_K(g)$", 
         facecolor=C_CENTRAL_LIGHT, edgecolor=C_CENTICAL if False else '#E6C200', fontsize=16)
# Note: Using a slightly darker yellow for edge for contrast
ax.patches[-1].set_edgecolor('#D4AC0D') 

# --- Branch Lines ---
# Left Branch (Identical)
ax.plot([8, 4.5], [7.3, 5.5], color=C_IDENTICAL, lw=3, zorder=1, solid_capstyle='round')
# Right Branch (Inequivalent)
ax.plot([8, 11.5], [7.3, 5.5], color=C_INEQUIVALENT, lw=3, zorder=1, solid_capstyle='round')

# --- Left Side: Identical ---
# Header
draw_box(ax, 4.5, 5.2, 4.5, 0.8, "Case 1: Identical ($D_K \\cong D_J$)", 
         facecolor=C_IDENTICAL_LIGHT, edgecolor=C_IDENTICAL, fontsize=14)

# Commutative Diagram Elements
# D_J(g) matrix
draw_matrix(ax, 2.5, 3.5, size=1.2, label="$D_J(g)$", color_edge=C_IDENTICAL)
# D_K(g) matrix
draw_matrix(ax, 6.5, 3.5, size=1.2, label="$D_K(g)$", color_edge=C_IDENTICAL)

# Intertwiner S
draw_box(ax, 2.5, 1.8, 1.0, 0.6, "$S$", facecolor='white', edgecolor=DARK_TEXT, fontsize=14)
draw_box(ax, 6.5, 1.8, 1.0, 0.6, "$S^{-1}$", facecolor='white', edgecolor=DARK_TEXT, fontsize=14)

# Arrows for commutative diagram
# Top arrow (D_J to D_K)
draw_arrow(ax, (3.2, 3.7), (5.8, 3.7), color=DARK_TEXT, lw=2)
ax.text(4.5, 3.95, "Similarity Transform", ha='center', va='bottom', fontsize=11, color=SUBTLE_TEXT)

# Down arrows
draw_arrow(ax, (2.5, 2.9), (2.5, 2.1), color=DARK_TEXT, lw=2)
draw_arrow(ax, (6.5, 2.9), (6.5, 2.1), color=DARK_TEXT, lw=2)

# Bottom arrow (S^{-1} to S)
draw_arrow(ax, (6.0, 1.8), (3.0, 1.8), color=DARK_TEXT, lw=2)

# Equation annotation
ax.text(4.5, 0.8, "$D_K(g) = S^{-1} D_J(g) S$", 
        ha='center', va='center', fontsize=14, color=DARK_TEXT, 
        bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=C_IDENTICAL, lw=2))

# --- Right Side: Inequivalent ---
# Header
draw_box(ax, 11.5, 5.2, 5.0, 0.8, "Case 2: Inequivalent ($D_K \\not\\cong D_J$)", 
         facecolor=C_INEQUIVALENT_LIGHT, edgecolor=C_INEQUIVALENT, fontsize=14)

# Disjoint Spaces Visualization
# Space V_J
circle_J = mpatches.Circle((10.5, 3.2), 0.9, facecolor=C_INEQUIVALENT_LIGHT, 
                           edgecolor=C_INEQUIVALENT, lw=2.5, zorder=2)
ax.add_patch(circle_J)
ax.text(10.5, 3.2, "$V_J$", ha='center', va='center', fontsize=14, fontweight='bold', color=DARK_TEXT)
draw_matrix(ax, 10.5, 3.2, size=0.8, color_edge=C_INEQUIVALENT) # Matrix inside space

# Space V_K
circle_K = mpatches.Circle((12.5, 3.2), 0.9, facecolor=C_INEQUIVALENT_LIGHT, 
                           edgecolor=C_INEQUIVALENT, lw=2.5, zorder=2)
ax.add_patch(circle_K)
ax.text(12.5, 3.2, "$V_K$", ha='center', va='center', fontsize=14, fontweight='bold', color=DARK_TEXT)
draw_matrix(ax, 12.5, 3.2, size=0.8, color_edge=C_INEQUIVALENT) # Matrix inside space

# Disconnection Symbol / Zero Matrix
ax.text(11.5, 3.2, "$\\times$", ha='center', va='center', fontsize=24, color='red', fontweight='bold')
ax.text(11.5, 2.0, "No Intertwining Exists", ha='center', va='center', fontsize=11, color=SUBTLE_TEXT)

# Equation annotation
ax.text(11.5, 0.8, "Intertwiner $M = 0$ (by Schur's Lemma)", 
        ha='center', va='center', fontsize=14, color=DARK_TEXT,
        bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=C_INEQUIVALENT, lw=2))

# --- Footer / Context ---
ax.text(8, 0.15, "This dichotomy underpins the Grand Orthogonality Theorem: $\\frac{1}{|G|} \\sum_{g \\in G} D^J_{ij}(g^{-1}) D^K_{kl}(g) = \\frac{1}{\\dim J} \\delta_{jk} \\delta_{il} \\delta_{JK}$", 
        ha='center', va='center', fontsize=12, color=SUBTLE_TEXT, style='italic')

# --- Layout Adjustments ---
# Add subtle grid lines in background for texture (optional, very subtle)
# ax.grid(True, color='grey', alpha=0.1, linewidth=0.5)

plt.tight_layout()
plt.show()