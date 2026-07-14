import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# ----------------------------------------------------------------------
# Global style settings for a clean, high-quality look
# ----------------------------------------------------------------------
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 14,
    'axes.linewidth': 2,
    'lines.linewidth': 3,
    'figure.facecolor': 'white',
    'axes.facecolor': 'white',
})

# ----------------------------------------------------------------------
# Helper functions
# ----------------------------------------------------------------------
def draw_atom(ax, x, y, label, color='#4A90D9', radius=0.35):
    """Draw an atom as a filled circle with a label."""
    circle = patches.Circle((x, y), radius, facecolor=color,
                             edgecolor='#2C3E50', linewidth=2.5, zorder=10)
    ax.add_patch(circle)
    ax.text(x, y - radius - 0.35, label, ha='center', va='top',
            fontsize=16, fontweight='bold', color='#2C3E50')

def draw_s_orbital(ax, x, y, radius=1.0, color='#E74C3C', alpha=0.25):
    """Draw an s orbital as a translucent circle with a '+' sign."""
    circle = patches.Circle((x, y), radius, facecolor=color, edgecolor=color,
                             linewidth=2.5, alpha=alpha, zorder=5)
    ax.add_patch(circle)
    ax.text(x, y, '+', ha='center', va='center',
            fontsize=22, fontweight='bold', color='#C0392B')

def draw_pz_orbital(ax, atom_x, atom_y, sign_right=1, right_color='#27AE60',
                     left_color='#E67E22', width=1.4, height=0.7, gap=0.1):
    """Draw a pz orbital (two lobes) oriented along x.

    Parameters
    ----------
    sign_right : +1 or -1
        Sign of the right lobe; left lobe gets opposite sign.
    right_color, left_color : colors for positive and negative lobes.
    width, height : size of each lobe (ellipse).
    gap : small separation from the nucleus.
    """
    # Right lobe
    rx = atom_x + gap + width/2
    ell_r = patches.Ellipse((rx, atom_y), width, height,
                            facecolor=right_color if sign_right > 0 else left_color,
                            edgecolor='#2C3E50', linewidth=2, alpha=0.6, zorder=5)
    ax.add_patch(ell_r)
    ax.text(rx, atom_y, '+' if sign_right > 0 else '−',
            ha='center', va='center', fontsize=16, fontweight='bold',
            color='white', zorder=6)

    # Left lobe
    lx = atom_x - gap - width/2
    sign_left = -sign_right
    ell_l = patches.Ellipse((lx, atom_y), width, height,
                            facecolor=right_color if sign_left > 0 else left_color,
                            edgecolor='#2C3E50', linewidth=2, alpha=0.6, zorder=5)
    ax.add_patch(ell_l)
    ax.text(lx, atom_y, '+' if sign_left > 0 else '−',
            ha='center', va='center', fontsize=16, fontweight='bold',
            color='white', zorder=6)

def draw_mirror_plane(ax, x=0, ymin=-3, ymax=3):
    """Draw a vertical dashed line representing the mirror plane."""
    ax.plot([x, x], [ymin, ymax], '--', color='#7F8C8D', linewidth=3, zorder=2)
    ax.text(x, ymax + 0.4, 'σh', ha='center', va='bottom',
            fontsize=18, fontweight='bold', color='#7F8C8D',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='#7F8C8D'))

# ----------------------------------------------------------------------
# Create the figure with two subplots
# ----------------------------------------------------------------------
fig, (ax_s, ax_p) = plt.subplots(1, 2, figsize=(16, 7))

# Common settings for both axes
for ax in [ax_s, ax_p]:
    ax.set_xlim(-5, 5)
    ax.set_ylim(-3, 3.5)
    ax.set_aspect('equal')
    ax.axis('off')

# ----------------------------------------------------------------------
# Left subplot : s orbitals (symmetric)
# ----------------------------------------------------------------------
ax_s.set_title('Effect of $\\sigma_h$ on $s$ orbitals', fontsize=18, pad=20, weight='bold')

# Atom positions
atom_xA, atom_xB = -2.5, 2.5
atom_y = 0

draw_atom(ax_s, atom_xA, atom_y, 'A')
draw_atom(ax_s, atom_xB, atom_y, 'B')

# s orbitals
draw_s_orbital(ax_s, atom_xA, atom_y)
draw_s_orbital(ax_s, atom_xB, atom_y)

# Mirror plane
draw_mirror_plane(ax_s)

# Arrow showing reflection yields same sign
ax_s.annotate('', xy=(atom_xB, atom_y), xytext=(atom_xA, atom_y),
              arrowprops=dict(arrowstyle='<->', color='#2C3E50', linewidth=2.5,
                              connectionstyle='arc3,rad=0.3'))
ax_s.text(0, 1.8, 'Symmetric\n($\\sigma_h = +1$)', ha='center', va='center',
          fontsize=15, fontweight='bold', color='#27AE60',
          bbox=dict(boxstyle='round,pad=0.4', facecolor='white', edgecolor='#27AE60', linewidth=2))

# Indicate that both s orbitals have the same sign
ax_s.text(atom_xA, 1.6, '+', ha='center', va='center', fontsize=20, fontweight='bold', color='#E74C3C')
ax_s.text(atom_xB, 1.6, '+', ha='center', va='center', fontsize=20, fontweight='bold', color='#E74C3C')

# ----------------------------------------------------------------------
# Right subplot : pz orbitals (antisymmetric)
# ----------------------------------------------------------------------
ax_p.set_title('Effect of $\\sigma_h$ on $p_z$ orbitals', fontsize=18, pad=20, weight='bold')

# Same atom positions
draw_atom(ax_p, atom_xA, atom_y, 'A')
draw_atom(ax_p, atom_xB, atom_y, 'B')

# Draw pz orbital on atom A: positive lobe to right, negative to left
draw_pz_orbital(ax_p, atom_xA, atom_y, sign_right=+1)
# Draw pz orbital on atom B: reflected and flipped sign
draw_pz_orbital(ax_p, atom_xB, atom_y, sign_right=-1)

# Mirror plane
draw_mirror_plane(ax_p)

# Arrow with label indicating antisymmetry
ax_p.annotate('', xy=(atom_xB, atom_y), xytext=(atom_xA, atom_y),
              arrowprops=dict(arrowstyle='<->', color='#2C3E50', linewidth=2.5,
                              connectionstyle='arc3,rad=0.3'))
ax_p.text(0, 2.0, 'Antisymmetric\n($\\sigma_h = -1$)', ha='center', va='center',
          fontsize=15, fontweight='bold', color='#E74C3C',
          bbox=dict(boxstyle='round,pad=0.4', facecolor='white', edgecolor='#E74C3C', linewidth=2))

# Legend for lobe colors
legend_elements = [
    patches.Patch(facecolor='#27AE60', edgecolor='#2C3E50', label='Positive lobe'),
    patches.Patch(facecolor='#E67E22', edgecolor='#2C3E50', label='Negative lobe'),
]
ax_p.legend(handles=legend_elements, loc='upper right', fontsize=12,
            framealpha=0.9, edgecolor='#BDC3C7')

# ----------------------------------------------------------------------
# Final layout and display
# ----------------------------------------------------------------------
plt.tight_layout()
plt.savefig('sigma_h_orbital_symmetry.png', dpi=200, bbox_inches='tight')
plt.show()