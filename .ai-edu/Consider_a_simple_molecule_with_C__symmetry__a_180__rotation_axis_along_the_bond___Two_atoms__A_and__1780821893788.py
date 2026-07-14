import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# --- Figure setup ---
fig, ax = plt.subplots(figsize=(8, 10), dpi=150)
ax.set_aspect('equal')
ax.axis('off')

# Canvas background
fig.patch.set_facecolor('#f9f9f9')
ax.set_xlim(-3, 3)
ax.set_ylim(-1, 4.5)

# --- Atom positions (z-axis vertical) ---
A_pos = (0, 0)         # atom A at bottom
B_pos = (0, 2.0)       # atom B at top

# --- Bond line (z-axis) ---
bond, = ax.plot([0, 0], [A_pos[1], B_pos[1]], color='#555555', lw=4, zorder=1)

# --- C₂ symmetry axis as dashed line extending beyond atoms ---
ax.plot([0, 0], [-0.8, 4.0], '--', color='#888888', lw=2, dashes=(8,4), zorder=0)
ax.text(0.15, 3.8, 'C₂ rotation axis (z)', fontsize=13, color='#555555',
        fontfamily='sans-serif', fontweight='bold')

# --- Atom A: nucleus + 1s orbital (spherical) ---
# Nucleus
nucleus_A = patches.Circle(A_pos, radius=0.25, facecolor='#3a86ff', edgecolor='#1a3e72', lw=2, zorder=3)
ax.add_patch(nucleus_A)
# 1s orbital represented as a larger transparent circle
orbital_1s = patches.Circle(A_pos, radius=0.55, facecolor='#3a86ff', edgecolor='#1a3e72',
                            lw=2, alpha=0.25, zorder=2)
ax.add_patch(orbital_1s)
ax.annotate('A (1s orbital)', xy=(0,0), xytext=(1.8, -0.2),
            fontsize=15, fontfamily='sans-serif', fontweight='bold', color='#1a3e72',
            arrowprops=dict(arrowstyle='->', color='#1a3e72', lw=2.5, connectionstyle='arc3,rad=0.3'),
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#e8f0ff', edgecolor='#3a86ff', lw=1.5))

# --- Atom B: nucleus + 2p_x orbital lobes ---
# Nucleus
nucleus_B = patches.Circle(B_pos, radius=0.25, facecolor='#8338ec', edgecolor='#4a0e78', lw=2, zorder=3)
ax.add_patch(nucleus_B)

# Define lobes (ellipses) along x-direction
lobe_offset = 0.65   # distance from nucleus center to lobe center
lobe_width = 0.9
lobe_height = 0.45

# Positive lobe (blue) on the right (+x)
pos_lobe = patches.Ellipse((B_pos[0] + lobe_offset, B_pos[1]), width=lobe_width, height=lobe_height,
                           facecolor='#00a8cc', edgecolor='#005f7a', lw=2, alpha=0.7, zorder=2)
ax.add_patch(pos_lobe)
# Negative lobe (red) on the left (-x)
neg_lobe = patches.Ellipse((B_pos[0] - lobe_offset, B_pos[1]), width=lobe_width, height=lobe_height,
                           facecolor='#e63946', edgecolor='#9d2235', lw=2, alpha=0.7, zorder=2)
ax.add_patch(neg_lobe)

# Label for 2p_x
ax.annotate('B (2p$_x$ orbital)', xy=(lobe_offset, B_pos[1]), xytext=(2.0, 1.8),
            fontsize=15, fontfamily='sans-serif', fontweight='bold', color='#4a0e78',
            arrowprops=dict(arrowstyle='->', color='#4a0e78', lw=2.5, connectionstyle='arc3,rad=0.2'),
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#f3e8ff', edgecolor='#8338ec', lw=1.5))

# Add + and - signs inside lobes for clarity (optional)
ax.text( B_pos[0] + lobe_offset, B_pos[1], '+', fontsize=20, ha='center', va='center', fontweight='bold', color='white', zorder=4)
ax.text( B_pos[0] - lobe_offset, B_pos[1], '−', fontsize=20, ha='center', va='center', fontweight='bold', color='white', zorder=4)

# --- Rotation annotation (180° around z) ---
# Draw a curved arrow using an arc + arrowhead
# Arc centered at B_pos, radius 0.9, angles 0 to -180 (clockwise)
arc = patches.Arc(B_pos, width=1.8, height=1.8, angle=0, theta1=0, theta2=-180,
                  color='#e07a5f', lw=3, linestyle='-', zorder=5)
ax.add_patch(arc)
# Arrowhead at the end (theta2 = -180) -> position left of B
arrowhead_x = B_pos[0] - 0.9
arrowhead_y = B_pos[1]
ax.plot(arrowhead_x, arrowhead_y, marker=3, color='#e07a5f', markersize=18, zorder=5) # triangle left

# Add text near arrow
ax.text(0.45, B_pos[1] + 1.3, '180° rotation\nflips sign', fontsize=14, fontfamily='sans-serif',
        fontweight='bold', color='#e07a5f', ha='center',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#fff3e0', edgecolor='#e07a5f', lw=1.5))

# --- Additional explanatory text ---
ax.text(0, -0.8, '1s orbital: unchanged under C₂ rotation', fontsize=12, fontfamily='sans-serif',
        ha='center', color='#3a86ff', fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#e8f0ff', edgecolor='none', alpha=0.8))
ax.text(0, 4.2, '2p$_x$ orbital: changes sign under 180° rotation', fontsize=12, fontfamily='sans-serif',
        ha='center', color='#8338ec', fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#f3e8ff', edgecolor='none', alpha=0.8))

# --- Title ---
ax.set_title('Molecule with C₂ symmetry (180° rotation about bond)', fontsize=18,
             fontfamily='sans-serif', fontweight='bold', color='#2b2d42', pad=20)

# Adjust layout and display
plt.tight_layout()
plt.show()