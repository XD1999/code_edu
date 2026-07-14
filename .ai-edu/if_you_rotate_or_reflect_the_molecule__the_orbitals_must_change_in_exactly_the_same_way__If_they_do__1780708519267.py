#!/usr/bin/env python3
"""
Symmetry Matching for Bonding: Constructive vs Destructive Overlap

This script visualizes the key concept: two orbitals can form a bond only if they
transform under the same irreducible representation (symmetry).  It uses the H₂O
molecule (C₂v point group) as an example: the oxygen 2pz orbital and the symmetric
combination of hydrogen 1s orbitals both belong to the A₁ irrep, leading to
constructive overlap and a bonding MO.  In contrast, the antisymmetric combination
(B₂) has zero net overlap with the 2pz, and no bonding occurs.

The figure is a static, high-quality diagram with four panels:
 1. Molecular geometry with symmetry elements (C₂ axis, σv mirrors).
 2. Symmetric H1s combination and its constructive overlap with O2pz.
 3. Antisymmetric H1s combination and its destructive overlap (zero integral).
 4. Energy level diagram for the A₁ bonding interaction.

All code is self-contained; no external data files are used.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Arc, Ellipse, Circle, Rectangle
from matplotlib.patches import FancyBboxPatch
import matplotlib.transforms as transforms

# -------------------------------------------------------------------- #
#  Global quality settings
# -------------------------------------------------------------------- #
plt.rcParams.update({
    "figure.facecolor": "#f8f9fa",
    "axes.facecolor": "#ffffff",
    "axes.edgecolor": "#333333",
    "axes.linewidth": 1.5,
    "axes.grid": False,
    "grid.alpha": 0.3,
    "grid.linestyle": "--",
    "font.family": "sans-serif",
    "font.size": 12,
    "axes.titlesize": 16,
    "axes.labelsize": 13,
    "xtick.labelsize": 11,
    "ytick.labelsize": 11,
    "legend.fontsize": 11,
    "lines.linewidth": 2.5,
    "lines.markersize": 8,
    "patch.linewidth": 2,
    "text.usetex": False,
})

# -------------------------------------------------------------------- #
#  Colour palette
# -------------------------------------------------------------------- #
O_COLOR = "#1f77b4"          # oxygen
H_COLOR = "#7fc7ff"          # hydrogen
H_SYM_COLOR = "#4e79a7"      # symmetric combination
LOBE_POS = "#d62728"         # positive lobe
LOBE_NEG = "#1f77b4"         # negative lobe
OVERLAP_COLOR = "#e15759"    # constructive
ZERO_COLOR = "#cccccc"       # destructive / no overlap
BG = "#f8f9fa"
WHITE_BG = "#ffffff"
GRID_ALPHA = 0.1

# -------------------------------------------------------------------- #
#  Helper drawing functions
# -------------------------------------------------------------------- #
def draw_2pz(ax, center, width=0.6, height=0.4, pos_color=LOBE_POS, neg_color=LOBE_NEG, alpha=0.6):
    """Draw a 2pz orbital as two lobed ellipses (positive above, negative below)."""
    # Upper lobe (positive)
    upper = Ellipse((center[0], center[1] + height * 0.5), width=width, height=height,
                    facecolor=pos_color, alpha=alpha, edgecolor='#000000', linewidth=2, zorder=3)
    ax.add_patch(upper)
    # Lower lobe (negative)
    lower = Ellipse((center[0], center[1] - height * 0.5), width=width, height=height,
                    facecolor=neg_color, alpha=alpha, edgecolor='#000000', linewidth=2, zorder=3)
    ax.add_patch(lower)
    # Plus/minus signs
    ax.text(center[0], center[1] + height * 0.5, '+', ha='center', va='center', fontsize=14, fontweight='bold', color='white')
    ax.text(center[0], center[1] - height * 0.5, '−', ha='center', va='center', fontsize=14, fontweight='bold', color='white')

def draw_1s(ax, center, radius=0.25, color=H_COLOR, alpha=0.7):
    """Draw a 1s orbital as a filled circle."""
    circle = Circle(center, radius=radius, facecolor=color, edgecolor='#000000', linewidth=2, alpha=alpha, zorder=3)
    ax.add_patch(circle)
    ax.text(center[0], center[1], '1s', ha='center', va='center', fontsize=10, color='black')

def draw_arrow(ax, start, end, color='#333333', linewidth=1.8, arrowstyle='-|>', mutation_scale=18):
    """Draw a fancy arrow from start to end."""
    arrow = FancyArrowPatch(start, end, arrowstyle=arrowstyle, color=color, linewidth=linewidth, mutation_scale=mutation_scale)
    ax.add_patch(arrow)

def draw_label_box(ax, text, position, fontsize=12, color='#333333', box_color='#ffffff', box_alpha=0.8):
    """Place a text label inside a rounded rectangle box."""
    bbox = FancyBboxPatch((position[0]-0.3, position[1]-0.12), 0.6, 0.24,
                          boxstyle="round,pad=0.05", facecolor=box_color, edgecolor='#333333',
                          linewidth=1.2, alpha=box_alpha, zorder=10)
    ax.add_patch(bbox)
    ax.text(position[0], position[1], text, ha='center', va='center', fontsize=fontsize, color=color, zorder=11)

# -------------------------------------------------------------------- #
#  Figure layout
# -------------------------------------------------------------------- #
fig = plt.figure(figsize=(14, 10), constrained_layout=True)
gs = fig.add_gridspec(2, 2, width_ratios=[1, 1.2], height_ratios=[1, 1.2], hspace=0.25, wspace=0.3)
ax1 = fig.add_subplot(gs[0, 0])   # Molecule with symmetry
ax2 = fig.add_subplot(gs[0, 1])   # Symmetric combination → bonding
ax3 = fig.add_subplot(gs[1, 0])   # Antisymmetric combination → no bonding
ax4 = fig.add_subplot(gs[1, 1])   # Energy diagram

# ------------------------------------------------------------ #
#  Panel 1: Molecular geometry and symmetry elements
# ------------------------------------------------------------ #
ax1.set_xlim(-2.5, 2.5)
ax1.set_ylim(-2.5, 2.5)
ax1.set_aspect('equal')
ax1.set_title("H₂O Molecule (C₂v) – Symmetry Elements", fontsize=14, fontweight='bold')
ax1.set_xlabel("x / Å")   # arbitrary units
ax1.set_ylabel("y / Å")
ax1.grid(True, alpha=GRID_ALPHA, linestyle='--')
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)

# Place atoms
O = np.array([0.0, 0.0])
H1 = np.array([-1.0, -1.0])
H2 = np.array([1.0, -1.0])

# Draw O atom (blue circle)
ax1.add_patch(Circle(O, 0.35, facecolor=O_COLOR, edgecolor='#000000', linewidth=2, alpha=0.9, zorder=4))
ax1.text(O[0], O[1], 'O', ha='center', va='center', fontsize=14, fontweight='bold', color='white', zorder=5)

# Draw H atoms
ax1.add_patch(Circle(H1, 0.25, facecolor=H_COLOR, edgecolor='#000000', linewidth=2, alpha=0.9, zorder=4))
ax1.text(H1[0], H1[1], 'H₁', ha='center', va='center', fontsize=11, color='black', zorder=5)
ax1.add_patch(Circle(H2, 0.25, facecolor=H_COLOR, edgecolor='#000000', linewidth=2, alpha=0.9, zorder=4))
ax1.text(H2[0], H2[1], 'H₂', ha='center', va='center', fontsize=11, color='black', zorder=5)

# Draw bonds (lines)
ax1.plot([O[0], H1[0]], [O[1], H1[1]], color='#555555', linewidth=3, zorder=2)
ax1.plot([O[0], H2[0]], [O[1], H2[1]], color='#555555', linewidth=3, zorder=2)

# Draw oxygen 2pz orbital (shown as lobes along y-axis, out-of-plane)
draw_2pz(ax1, O + np.array([0.0, 0.8]), width=0.5, height=0.3, alpha=0.5)
draw_2pz(ax1, O + np.array([0.0, -0.8]), width=0.5, height=0.3, alpha=0.5)

# Add symmetry elements
# C2 axis: arrow through O, perpendicular to H–O–H plane (here out of page)
ax1.annotate('', xy=(0, -2.2), xytext=(0, 2.2),
             arrowprops=dict(arrowstyle='<->', color='#2ca02c', linewidth=2.5, linestyle='-',
                             shrinkA=0, shrinkB=0), zorder=6)
ax1.text(0.15, 1.9, 'C₂ axis', fontsize=10, color='#2ca02c', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.1', facecolor='white', edgecolor='#2ca02c', alpha=0.7))

# σv(xz) mirror plane (contains O and H's) – shown as dashed grey line along x=0
ax1.axvline(0, color='#9467bd', linewidth=2, linestyle='--', alpha=0.6, label='σᵥ(xz)')
# σv'(yz) mirror plane (vertical through O, perpendicular to line connecting H's) – shown as dotted line
ax1.axhline(0, color='#9467bd', linewidth=2, linestyle=':', alpha=0.6, label="σᵥ'(yz)")
# Add labels for mirrors with boxes
ax1.text(0.15, 0.8, 'σᵥ(xz)', fontsize=10, color='#9467bd', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.05', facecolor='white', edgecolor='#9467bd', alpha=0.7))
ax1.text(0.8, 0.15, "σᵥ'(yz)", fontsize=10, color='#9467bd', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.05', facecolor='white', edgecolor='#9467bd', alpha=0.7))

# ------------------------------------------------------------ #
#  Panel 2: Symmetric combination (A₁) → bonding
# ------------------------------------------------------------ #
ax2.set_xlim(-2.2, 2.2)
ax2.set_ylim(-2.5, 2.5)
ax2.set_aspect('equal')
ax2.set_title("Symmetric H1s (A₁) + O2pz → Bonding MO", fontsize=13, fontweight='bold')
ax2.axis('off')

# Draw oxygen 2pz in the centre
draw_2pz(ax2, (0, 0.0), width=0.7, height=0.5, alpha=0.5)

# Draw symmetric combination: two 1s orbitals with same phase (+)
# Place H1 and H2 symmetrically
H1_pos = np.array([-1.0, -1.2])
H2_pos = np.array([1.0, -1.2])
draw_1s(ax2, H1_pos, radius=0.3, color=H_SYM_COLOR, alpha=0.7)
draw_1s(ax2, H2_pos, radius=0.3, color=H_SYM_COLOR, alpha=0.7)
ax2.text(H1_pos[0], H1_pos[1]+0.1, '+', ha='center', va='center', fontsize=14, fontweight='bold', color='white')
ax2.text(H2_pos[0], H2_pos[1]+0.1, '+', ha='center', va='center', fontsize=14, fontweight='bold', color='white')
ax2.text(H1_pos[0], H1_pos[1]-0.4, '1s (A₁)', ha='center', va='center', fontsize=10, color='#333333')
ax2.text(H2_pos[0], H2_pos[1]-0.4, '1s (A₁)', ha='center', va='center', fontsize=10, color='#333333')
# Label the combination
ax2.text(0, -2.0, 'Symmetric combination\n(projection onto A₁)', ha='center', va='center',
         fontsize=10, fontstyle='italic',
         bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='#4e79a7', alpha=0.8))

# Overlap region: constructive (positive-positive)
# Draw a shaded ellipse between O and H1  (simulate overlap)
overlap_ell = Ellipse((-0.35, -0.5), width=0.8, height=0.3, facecolor=OVERLAP_COLOR, alpha=0.3, edgecolor='#d62728', linewidth=2, zorder=2)
ax2.add_patch(overlap_ell)
overlap_ell2 = Ellipse((0.35, -0.5), width=0.8, height=0.3, facecolor=OVERLAP_COLOR, alpha=0.3, edgecolor='#d62728', linewidth=2, zorder=2)
ax2.add_patch(overlap_ell2)
ax2.text(0, -0.9, 'Constructive overlap\n→ energy lowering', ha='center', va='center',
         fontsize=10, color='#d62728', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.1', facecolor='white', edgecolor='#d62728', alpha=0.8))

# Add an arrow indicating bonding
draw_arrow(ax2, (0, -1.8), (0, -0.6), color='#d62728', mutation_scale=20)

# ------------------------------------------------------------ #
#  Panel 3: Antisymmetric combination (B₂) → no bonding
# ------------------------------------------------------------ #
ax3.set_xlim(-2.2, 2.2)
ax3.set_ylim(-2.5, 2.5)
ax3.set_aspect('equal')
ax3.set_title("Antisymmetric H1s (B₂) + O2pz → No Net Overlap", fontsize=13, fontweight='bold')
ax3.axis('off')

# Draw oxygen 2pz (same)
draw_2pz(ax3, (0, 0.0), width=0.7, height=0.5, alpha=0.5)

# Draw antisymmetric combination: one +, one −
H1_pos = np.array([-1.0, -1.2])
H2_pos = np.array([1.0, -1.2])
draw_1s(ax3, H1_pos, radius=0.3, color=H_SYM_COLOR, alpha=0.7)
draw_1s(ax3, H2_pos, radius=0.3, color=H_SYM_COLOR, alpha=0.7)
ax3.text(H1_pos[0], H1_pos[1]+0.1, '+', ha='center', va='center', fontsize=14, fontweight='bold', color='white')
ax3.text(H2_pos[0], H2_pos[1]+0.1, '−', ha='center', va='center', fontsize=14, fontweight='bold', color='white')
ax3.text(H1_pos[0], H1_pos[1]-0.4, '1s', ha='center', va='center', fontsize=10, color='#333333')
ax3.text(H2_pos[0], H2_pos[1]-0.4, '1s', ha='center', va='center', fontsize=10, color='#333333')
ax3.text(0, -2.0, 'Antisymmetric combination\n(B₂ symmetry)', ha='center', va='center',
         fontsize=10, fontstyle='italic',
         bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='#9467bd', alpha=0.8))

# Overlap cancellation: one positive-negative, the other positive-negative → zero
# Draw two overlap ellipses with opposite signs cancelling
overlap_pos = Ellipse((-0.35, -0.5), width=0.8, height=0.3, facecolor=LOBE_POS, alpha=0.2, edgecolor='#d62728', linewidth=2, zorder=2)
ax3.add_patch(overlap_pos)
ax3.text(-0.35, -0.5, '+', ha='center', va='center', fontsize=12, color='#d62728', fontweight='bold')
overlap_neg = Ellipse((0.35, -0.5), width=0.8, height=0.3, facecolor=LOBE_NEG, alpha=0.2, edgecolor='#1f77b4', linewidth=2, zorder=2)
ax3.add_patch(overlap_neg)
ax3.text(0.35, -0.5, '−', ha='center', va='center', fontsize=12, color='#1f77b4', fontweight='bold')
# Add a big X over the overlap zone to indicate cancellation
ax3.plot([-1.2, 1.2], [-0.4, -0.6], color='#333333', linewidth=2, linestyle='--', zorder=5)
ax3.plot([-1.2, 1.2], [-0.6, -0.4], color='#333333', linewidth=2, linestyle='--', zorder=5)
ax3.text(0, -0.9, 'Net overlap = 0\n(no bonding)', ha='center', va='center',
         fontsize=10, color='#333333', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.1', facecolor='white', edgecolor='#333333', alpha=0.8))

# ------------------------------------------------------------ #
#  Panel 4: Energy level diagram for A₁ bonding
# ------------------------------------------------------------ #
ax4.set_xlim(-0.5, 1.5)
ax4.set_ylim(-2.5, 0.5)
ax4.set_title("Molecular Orbital Energy Diagram (A₁)", fontsize=14, fontweight='bold')
ax4.axis('off')

# Define energies (arbitrary, but consistent with context)
E_O = -1.0          # oxygen 2p
E_H_sym = -1.5       # symmetric H1s combination (lower due to constructive overlap? Actually isolated atom energy similar)
E_bond = -2.0        # bonding MO
E_anti = -0.2        # antibonding (not used in text, but included for completeness)

# Draw atomic energy levels on left and right
ax4.hlines(y=E_O, xmin=0.0, xmax=0.4, color=O_COLOR, linewidth=4, zorder=5)
ax4.text(0.45, E_O+0.05, 'O 2pz', fontsize=11, color=O_COLOR, fontweight='bold')
ax4.hlines(y=E_H_sym, xmin=0.6, xmax=1.0, color=H_SYM_COLOR, linewidth=4, zorder=5)
ax4.text(1.05, E_H_sym+0.05, 'H1s (A₁)\nsymmetric', fontsize=11, color=H_SYM_COLOR, fontweight='bold')

# Draw MO levels in the middle
ax4.hlines(y=E_bond, xmin=0.3, xmax=0.7, color='#d62728', linewidth=5, zorder=5)
ax4.text(0.5, E_bond-0.15, 'Bonding MO', ha='center', fontsize=12, color='#d62728', fontweight='bold')
# Antibonding (optional but nice)
ax4.hlines(y=E_anti, xmin=0.3, xmax=0.7, color='#9467bd', linewidth=5, zorder=5)
ax4.text(0.5, E_anti+0.1, 'Antibonding MO', ha='center', fontsize=12, color='#9467bd', fontweight='bold')

# Arrows from atomic to MO levels (indicating mixing)
draw_arrow(ax4, (0.4, E_O), (0.3, E_bond), color='grey', arrowstyle='->', mutation_scale=15)
draw_arrow(ax4, (0.6, E_H_sym), (0.7, E_bond), color='grey', arrowstyle='->', mutation_scale=15)

# Add label: "Energy lowering"
ax4.plot([0.3, 0.3], [E_O, E_bond], color='#d62728', linewidth=2, linestyle=':', zorder=3)
ax4.annotate('', xy=(0.3, E_bond+0.1), xytext=(0.3, E_O-0.1),
             arrowprops=dict(arrowstyle='<->', color='#d62728', linewidth=2))
ax4.text(0.2, (E_O+E_bond)/2, '↓ energy', fontsize=10, color='#d62728', rotation=90, va='center', fontweight='bold')

# ------------------------------------------------------------ #
#  Figure-level annotations
# ------------------------------------------------------------ #
# Add a main title
fig.suptitle("Symmetry Condition for Bonding: Same IRREP → Constructive Overlap\n",
             fontsize=16, fontweight='bold', y=1.02)
# Add footnote
fig.text(0.5, -0.02,
         "If orbitals transform under the same irreducible representation (same symmetry), their overlap is nonzero → bonding.\n"
         "Different symmetry ⇒ net overlap zero → no bonding.  (Example: H₂O, C₂v point group.)",
         ha='center', va='center', fontsize=11, fontstyle='italic',
         bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#333333', alpha=0.9))

plt.tight_layout()
plt.savefig("symmetry_matching_bonding.png", dpi=150, bbox_inches='tight')
plt.show()