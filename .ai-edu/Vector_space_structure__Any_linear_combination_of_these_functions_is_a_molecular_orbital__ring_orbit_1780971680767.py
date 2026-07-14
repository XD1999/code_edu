import matplotlib
matplotlib.use('Agg')  # static only, no interactive backend needed
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ============================================================
# Set up high-quality static diagram
# ============================================================
plt.rcParams.update({
    'figure.dpi': 200,
    'font.family': 'sans-serif',
    'font.sans-serif': ['DejaVu Sans'],
    'font.size': 16,
    'axes.linewidth': 2.0,
    'xtick.major.width': 1.5,
    'ytick.major.width': 1.5,
})

fig, ax = plt.subplots(1, 1, figsize=(14, 14))
ax.set_aspect('equal')
ax.set_xlim(-2.5, 2.5)
ax.set_ylim(-2.5, 2.5)

# remove axes
ax.axis('off')

# ============================================================
# Data: four atomic sites at corners of a square (radius=1.5)
# ============================================================
R = 1.5
angles = np.linspace(np.pi/2, -3*np.pi/2, 4, endpoint=False)  # start at top, clockwise
positions = [(R * np.cos(a), R * np.sin(a)) for a in angles]
labels = [r'$\phi_1$', r'$\phi_2$', r'$\phi_3$', r'$\phi_4$']

# tangential direction at each site (pointing counter-clockwise when moving around ring)
tangent_angles = angles + np.pi/2   # +90° from radius

# Colors for positive (red) and negative (blue) lobes
col_pos = '#E63946'   # vibrant red
col_neg = '#1D3557'   # deep blue
col_atom = '#457B9D'  # soft blue-green

# ============================================================
# Draw p-orbitals (two lobes per site, tangential orientation)
# ============================================================
lobe_params = {
    'width': 0.35,
    'height': 1.0,
    'offset': 0.5,
}

for pos, tang, lbl in zip(positions, tangent_angles, labels):
    x, y = pos

    # Draw atom (circle)
    atom = mpatches.Circle((x, y), radius=0.18, color=col_atom, ec='black', lw=2.5, zorder=4)
    ax.add_patch(atom)

    # Positive lobe (along +tangent)
    dx_pos = 0.5 * np.cos(tang) * lobe_params['offset']
    dy_pos = 0.5 * np.sin(tang) * lobe_params['offset']
    ellipse_pos = mpatches.Ellipse((x + dx_pos, y + dy_pos),
                                   width=lobe_params['width'],
                                   height=lobe_params['height'],
                                   angle=np.degrees(tang),
                                   facecolor=col_pos,
                                   edgecolor='black',
                                   lw=1.5,
                                   alpha=0.85,
                                   zorder=3)
    ax.add_patch(ellipse_pos)

    # Negative lobe (along -tangent)
    dx_neg = -0.5 * np.cos(tang) * lobe_params['offset']
    dy_neg = -0.5 * np.sin(tang) * lobe_params['offset']
    ellipse_neg = mpatches.Ellipse((x + dx_neg, y + dy_neg),
                                   width=lobe_params['width'],
                                   height=lobe_params['height'],
                                   angle=np.degrees(tang),
                                   facecolor=col_neg,
                                   edgecolor='black',
                                   lw=1.5,
                                   alpha=0.85,
                                   zorder=3)
    ax.add_patch(ellipse_neg)

    # Label the atomic orbital
    ax.text(x + 0.45, y - 0.45, lbl,
            fontsize=18, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='grey', alpha=0.8))

# Add a central ring for visual reference (dashed circle)
ring = mpatches.Circle((0,0), radius=R, fill=False, linestyle='--', linewidth=1.5, color='grey', alpha=0.5)
ax.add_patch(ring)

# ============================================================
# Show a linear combination (molecular orbital)
# ============================================================
# Place a text box in upper right with the linear combination formula
formula = r'$\Psi = c_1 \phi_1 + c_2 \phi_2 + c_3 \phi_3 + c_4 \phi_4$'
ax.text(1.9, 2.2, formula, fontsize=20, fontweight='bold', ha='center', va='center',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='white', edgecolor='black', lw=2),
        zorder=10)

# Indicate coefficients next to each orbital (example: all coefficients +1)
coeffs = [1, 1, 1, 1]  # totally symmetric bonding combination
for pos, c, tang in zip(positions, coeffs, tangent_angles):
    x, y = pos
    # show coefficient near the site, but slightly outward along radius
    rad_angle = np.arctan2(y, x) + 0.3  # a bit offset
    cx = x + 0.6 * np.cos(rad_angle)
    cy = y + 0.6 * np.sin(rad_angle)
    ax.text(cx, cy, f'$c_{{{coeffs.index(c)+1}}} = {c}$', fontsize=14, ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.15', facecolor='white', edgecolor='grey', lw=1))

# ============================================================
# Illustrate group action: 90° rotation (permutation + sign change)
# ============================================================
# Draw a curved arrow around the center
arrow = mpatches.FancyArrowPatch((1.5, 0.8), (0.8, 1.5),
                                 connectionstyle='arc3,rad=0.5',
                                 arrowstyle='->,head_length=0.6,head_width=0.3',
                                 color='darkgreen', lw=3, zorder=5)
ax.add_patch(arrow)
ax.text(1.2, 1.2, r'$R$ (90°)', fontsize=18, fontweight='bold', color='darkgreen', ha='center', va='center',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='darkgreen', alpha=0.8))

# Show mapping: from site 1 to site 2, with an annotation
ax.annotate('',
            xy=positions[1], xycoords='data',
            xytext=positions[0], textcoords='data',
            arrowprops=dict(arrowstyle='->', color='green', lw=2.5, linestyle='dashed'),
            zorder=6)
ax.text((positions[0][0]+positions[1][0])/2, (positions[0][1]+positions[1][1])/2,
        'permutation + sign change', fontsize=14, color='green',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='green', alpha=0.7),
        ha='center', va='center')

# Optionally show the resulting transformed orbital (small figure at bottom right)
# but space is limited, so we skip.

# ============================================================
# Title and additional explanatory text
# ============================================================
ax.set_title("Vector space structure: Linear combination → molecular orbital\n"
             r"Group $4mm$ acts naturally via permutations and sign changes",
             fontsize=24, fontweight='bold', pad=20)

# Text box explaining the representation
info_text = (
    r"$\mathcal{V}$ = span$\{\phi_1, \phi_2, \phi_3, \phi_4\}$" + "\n"
    r"Each $\phi_i$ is a tangential $p$-orbital." + "\n"
    r"Coefficients $c_i$ denote contribution from each AO." + "\n"
    r"$D_{\text{nat}}$: permutation of sites + sign changes of coordinate functions."
)
ax.text(-2.3, -2.1, info_text, fontsize=16, ha='left', va='bottom',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#F1FAEE', edgecolor='#1D3557', lw=2))

# ============================================================
# Save and show (static)
# ============================================================
plt.tight_layout(rect=[0, 0, 1, 0.93])  # leave space for title
plt.savefig('vector_space_natural_rep.png', dpi=300, bbox_inches='tight')
plt.show()