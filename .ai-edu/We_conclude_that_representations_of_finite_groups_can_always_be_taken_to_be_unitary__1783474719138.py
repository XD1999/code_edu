"""
Visualization: "Representations of finite groups can always be taken to be unitary."

This script generates a polished, static, portfolio-quality diagram illustrating
the averaging trick (Weyl's unitary trick) for finite groups. It shows how an
arbitrary representation D(g) is transformed into a unitary representation U(g)
by constructing a G-invariant inner product via group averaging, followed by a
change of basis.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
from matplotlib.path import Path
import matplotlib.patheffects as path_effects
import numpy as np

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

fig = plt.figure(figsize=(20, 11), dpi=200)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 20)
ax.set_ylim(0, 11)
ax.axis('off')

# ----------------------------------------------------------------------------
# Color Palette (Vibrant, distinct, presentation-quality)
# ----------------------------------------------------------------------------
C_BG = '#0F1115'          # Deep charcoal background
C_PANEL = '#1A1D24'       # Panel background
C_PANEL_EDGE = '#2D3139'  # Panel border
C_TEXT = '#F0F3F5'        # Primary text
C_SUBTEXT = '#A0A6AD'     # Secondary text
C_ACCENT = '#FFD93D'      # Gold accent
C_ORIG = '#FF6B6B'        # Red for original representation
C_NEW = '#4ECDC4'         # Teal for new unitary representation
C_GREEN = '#95E068'       # Green for positive checkmark
C_BLUE = '#6B8EDE'        # Blue for basis change

# Background
fig.patch.set_facecolor(C_BG)
ax.set_facecolor(C_BG)

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------

def draw_panel(x, y, w, h, color=C_PANEL, edge=C_PANEL_EDGE, lw=2, rad=0.15):
    """Draw a rounded rectangle panel."""
    panel = FancyBboxPatch((x, y), w, h,
                           boxstyle=f"round,pad=0.02,rounding_size={rad}",
                           linewidth=lw, edgecolor=edge, facecolor=color, zorder=1)
    ax.add_patch(panel)

def draw_text(x, y, text, size=14, color=C_TEXT, weight='normal', ha='center', va='center', style='normal', zorder=5):
    """Draw text with optional path effects for readability."""
    t = ax.text(x, y, text, fontsize=size, color=color, fontweight=weight, ha=ha, va=va, fontstyle=style, zorder=zorder)
    t.set_path_effects([path_effects.withStroke(linewidth=3, foreground=C_BG)])
    return t

def draw_matrix_glyph(x, y, color, label="D(g)", w=1.6, h=1.2):
    """Draw a stylized matrix representation."""
    # Brackets
    bracket_lw = 3.5
    ax.plot([x-w/2, x-w/2+0.15], [y+h/2, y+h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    ax.plot([x-w/2, x-w/2], [y+h/2, y-h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    ax.plot([x-w/2, x-w/2+0.15], [y-h/2, y-h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    
    ax.plot([x+w/2, x+w/2-0.15], [y+h/2, y+h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    ax.plot([x+w/2, x+w/2], [y+h/2, y-h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    ax.plot([x+w/2, x+w/2-0.15], [y-h/2, y-h/2], color=color, lw=bracket_lw, solid_capstyle='round', zorder=4)
    
    # Matrix entries (dots to indicate a matrix)
    for r in range(-1, 2):
        for c in range(-1, 2):
            if r == c:
                ax.plot(x + c*0.35, y + r*0.35, 'o', color=color, markersize=5, zorder=5)
            else:
                ax.plot(x + c*0.35, y + r*0.35, 'o', color=color, markersize=3, alpha=0.4, zorder=5)
                
    draw_text(x, y - h/2 - 0.35, label, size=14, color=color, weight='bold')

def draw_arrow(x1, y1, x2, y2, color=C_TEXT, lw=3, style='-|>', rad=0.0):
    """Draw a fancy arrow between two points."""
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                            arrowstyle=style, mutation_scale=25,
                            lw=lw, color=color, zorder=3,
                            connectionstyle=f"arc3,rad={rad}")
    ax.add_patch(arrow)

def draw_check(x, y, color=C_GREEN, scale=0.3):
    """Draw a checkmark."""
    verts = [
        (x - scale, y),
        (x - scale/3, y - scale),
        (x + scale, y + scale/1.5),
    ]
    codes = [Path.MOVETO, Path.LINETO, Path.LINETO]
    path = Path(verts, codes)
    patch = mpatches.PathPatch(path, facecolor='none', edgecolor=color, lw=4, capstyle='round', joinstyle='round', zorder=6)
    ax.add_patch(patch)

# ----------------------------------------------------------------------------
# Title
# ----------------------------------------------------------------------------
draw_text(10, 10.4, "Representations of Finite Groups Can Always Be Taken to Be Unitary",
          size=24, color=C_TEXT, weight='bold')
draw_text(10, 9.8, "The Averaging Trick: Constructing a G-invariant inner product over a finite group G",
          size=15, color=C_SUBTEXT, style='italic')

# ----------------------------------------------------------------------------
# Top Row: The Three Panels (Original, Averaging, New)
# ----------------------------------------------------------------------------

# Panel 1: Original Representation
draw_panel(0.5, 5.5, 5.5, 3.5)
draw_text(3.25, 8.6, "1. Original Representation", size=16, color=C_ORIG, weight='bold')
draw_text(3.25, 8.15, "Arbitrary inner product (x, y)", size=12, color=C_SUBTEXT)
draw_matrix_glyph(3.25, 7.0, C_ORIG, label="D(g)  (Not necessarily unitary)")

# Arrow 1 -> 2
draw_arrow(6.2, 7.25, 7.3, 7.25, color=C_ACCENT, lw=4)
draw_text(6.75, 7.65, "Average\nover G", size=11, color=C_ACCENT, weight='bold')

# Panel 2: Averaging Process
draw_panel(7.5, 5.5, 5.0, 3.5)
draw_text(10.0, 8.6, "2. Group Averaging", size=16, color=C_ACCENT, weight='bold')
draw_text(10.0, 8.15, "Construct G-invariant inner product", size=12, color=C_SUBTEXT)

# Formula Box
draw_panel(8.0, 6.2, 4.0, 1.3, color='#252830', edge=C_ACCENT, lw=2, rad=0.1)
draw_text(10.0, 7.15, "<x, y>  =  1 / |G|  Σ  (D(g)x, D(g)y)", size=14, color=C_TEXT, weight='bold')
draw_text(10.0, 6.65, "g ∈ G", size=12, color=C_SUBTEXT, style='italic')

draw_text(10.0, 5.85, "Remains positive-definite", size=12, color=C_GREEN, weight='bold')
draw_check(8.3, 5.85, scale=0.15)

# Arrow 2 -> 3
draw_arrow(12.7, 7.25, 13.8, 7.25, color=C_ACCENT, lw=4)
draw_text(13.25, 7.65, "Change\nbasis", size=11, color=C_ACCENT, weight='bold')

# Panel 3: New Unitary Representation
draw_panel(14.0, 5.5, 5.5, 3.5)
draw_text(16.75, 8.6, "3. Unitary Representation", size=16, color=C_NEW, weight='bold')
draw_text(16.75, 8.15, "Orthonormal basis w.r.t. <x, y>", size=12, color=C_SUBTEXT)
draw_matrix_glyph(16.75, 7.0, C_NEW, label="U(g)  (Unitary)")

# ----------------------------------------------------------------------------
# Middle: Consequence Arrow
# ----------------------------------------------------------------------------
draw_arrow(10, 5.3, 10, 4.3, color=C_BLUE, lw=5, style='-|>')
draw_text(10.5, 4.8, "Consequence", size=14, color=C_BLUE, weight='bold', ha='left')

# ----------------------------------------------------------------------------
# Bottom Row: Properties and Consequences
# ----------------------------------------------------------------------------
draw_panel(0.5, 0.5, 19.0, 3.5, color='#15171C', edge=C_PANEL_EDGE)

# Left Box: Unitary Property
draw_panel(1.0, 1.0, 5.5, 2.5, color=C_PANEL, edge=C_NEW, rad=0.1)
draw_text(3.75, 3.15, "Unitary Property", size=15, color=C_NEW, weight='bold')
draw_text(3.75, 2.55, "<U(g)x, U(g)y> = <x, y>", size=14, color=C_TEXT, weight='bold')
draw_text(3.75, 2.05, "The action preserves the new inner product.", size=11, color=C_SUBTEXT, style='italic')
draw_text(3.75, 1.5, "U(g⁻¹) = U⁻¹(g) = U†(g)", size=14, color=C_TEXT, weight='bold')

# Middle Box: Complete Reducibility
draw_panel(7.25, 1.0, 5.5, 2.5, color=C_PANEL, edge=C_ACCENT, rad=0.1)
draw_text(10.0, 3.15, "Complete Reducibility", size=15, color=C_ACCENT, weight='bold')
draw_text(10.0, 2.55, "Reducible  ⟹  Completely Reducible", size=14, color=C_TEXT, weight='bold')
draw_text(10.0, 2.05, "Representations decompose into a", size=11, color=C_SUBTEXT, style='italic')
draw_text(10.0, 1.65, "direct sum of irreducible representations.", size=11, color=C_SUBTEXT, style='italic')

# Right Box: Block Diagonal Visualization
draw_panel(13.5, 1.0, 5.5, 2.5, color=C_PANEL, edge=C_ORIG, rad=0.1)
draw_text(16.25, 3.15, "Decomposition", size=15, color=C_ORIG, weight='bold')

# Draw block diagonal matrix
bx, by = 15.5, 1.8
mw, mh = 2.5, 1.2
# Brackets
ax.plot([bx-mw/2, bx-mw/2+0.1], [by+mh/2, by+mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)
ax.plot([bx-mw/2, bx-mw/2], [by+mh/2, by-mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)
ax.plot([bx-mw/2, bx-mw/2+0.1], [by-mh/2, by-mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)
ax.plot([bx+mw/2, bx+mw/2-0.1], [by+mh/2, by+mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)
ax.plot([bx+mw/2, bx+mw/2], [by+mh/2, by-mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)
ax.plot([bx+mw/2, bx+mw/2-0.1], [by-mh/2, by-mh/2], color=C_TEXT, lw=2.5, solid_capstyle='round', zorder=4)

# Blocks
block1 = mpatches.Rectangle((bx-0.8, by-0.1), 0.6, 0.6, facecolor=C_ORIG, edgecolor='none', alpha=0.9, zorder=5)
block2 = mpatches.Rectangle((bx+0.2, by+0.2), 0.4, 0.4, facecolor=C_NEW, edgecolor='none', alpha=0.9, zorder=5)
ax.add_patch(block1)
ax.add_patch(block2)
draw_text(16.25, 1.35, "U(g) ≅ U₁(g) ⊕ U₂(g)", size=13, color=C_TEXT, weight='bold')

# ----------------------------------------------------------------------------
# Display
# ----------------------------------------------------------------------------
plt.show()