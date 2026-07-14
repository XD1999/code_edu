import matplotlib.pyplot as plt
import numpy as np

# ------------------------
# Global style settings for high-quality static diagram
# ------------------------
plt.rcParams.update({
    'figure.dpi': 150,
    'font.size': 14,
    'axes.labelsize': 16,
    'axes.titlesize': 18,
    'legend.fontsize': 12,
    'lines.linewidth': 3.0,
    'lines.markersize': 10,
    'patch.edgecolor': 'black',
    'patch.linewidth': 1.5,
    'text.usetex': False,          # no LaTeX parsing
    'font.family': 'DejaVu Sans',  # supports Greek
    'axes.unicode_minus': True,
})

# Colors (custom, saturated palette)
COLOR_ORIG = '#E74C3C'    # red
COLOR_PROJ = '#3498DB'    # blue
COLOR_AXIS_X = '#2C3E50'  # dark grey-blue
COLOR_AXIS_Y = '#7F8C8D'  # grey
COLOR_BG = '#F8F9FA'      # light neutral background
COLOR_ZERO = '#27AE60'    # green

# ------------------------
# Create figure
# ------------------------
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), facecolor=COLOR_BG)
fig.suptitle('Projection Operator $P^{(\\lambda)}$ on $\\psi_A$',
             fontsize=20, fontweight='bold', y=1.02)

# Helper function to draw axes with arrows
def draw_axes(ax, limits, xlabel, ylabel):
    # X axis
    ax.annotate('', xy=(limits[1], 0), xytext=(limits[0], 0),
                arrowprops=dict(arrowstyle='->', lw=2.5, color=COLOR_AXIS_X))
    # Y axis
    ax.annotate('', xy=(0, limits[3]), xytext=(0, limits[2]),
                arrowprops=dict(arrowstyle='->', lw=2.5, color=COLOR_AXIS_Y))
    ax.text(limits[1]*0.9, -0.3, xlabel, fontsize=16, fontweight='bold', color=COLOR_AXIS_X,
            ha='center', va='top')
    ax.text(-0.3, limits[3]*0.9, ylabel, fontsize=16, fontweight='bold', color=COLOR_AXIS_Y,
            ha='right', va='center', rotation=90)
    ax.set_xlim(limits[0], limits[1]*1.2)
    ax.set_ylim(limits[2], limits[3]*1.2)
    ax.set_aspect('equal')
    ax.set_facecolor(COLOR_BG)
    # Turn off all ticks and spines
    ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
    for spine in ax.spines.values():
        spine.set_visible(False)

# ------------------------
# Left panel: component present
# ------------------------
ax1.set_title('Case: $\\psi_A$ contains $\\Gamma^{(\\lambda)}$ component', fontsize=15)
draw_axes(ax1, [-2, 6, -2, 5], '$\\Gamma^{(\\lambda)}$', '$\\Gamma^{(\\perp)}$')

# Original vector ψ_A
v_orig = np.array([3.5, 2.0])
ax1.arrow(0, 0, v_orig[0], v_orig[1],
          head_width=0.25, head_length=0.25, fc=COLOR_ORIG, ec=COLOR_ORIG, lw=3,
          zorder=5)
ax1.text(v_orig[0]+0.2, v_orig[1]+0.3, '$\\psi_A$', fontsize=16, color=COLOR_ORIG, fontweight='bold')

# Projected vector ψ_A^(λ) (onto x-axis)
v_proj = np.array([v_orig[0], 0.0])
ax1.arrow(0, 0, v_proj[0], v_proj[1],
          head_width=0.25, head_length=0.25, fc=COLOR_PROJ, ec=COLOR_PROJ, lw=3,
          linestyle='--', zorder=5)
ax1.text(v_proj[0]+0.1, -0.5, '$\\psi_A^{(\\lambda)}$', fontsize=16, color=COLOR_PROJ, fontweight='bold')

# Dashed lines showing components
ax1.plot([v_orig[0], v_orig[0]], [0, v_orig[1]], color='gray', lw=1.5, linestyle=':', alpha=0.6)
ax1.plot([0, v_orig[0]], [v_orig[1], v_orig[1]], color='gray', lw=1.5, linestyle=':', alpha=0.6)

# Mark the original point
ax1.scatter(v_orig[0], v_orig[1], s=80, color=COLOR_ORIG, zorder=6)
ax1.scatter(v_proj[0], v_proj[1], s=80, color=COLOR_PROJ, zorder=6)

# Annotation: equation
ax1.text(0.5, -1.2, '$\\psi_A^{(\\lambda)} = P^{(\\lambda)} \\psi_A \\neq 0$',
         fontsize=14, fontstyle='italic', bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow', edgecolor='gray'))

# ------------------------
# Right panel: component absent
# ------------------------
ax2.set_title('Case: $\\psi_A$ has **no** $\\Gamma^{(\\lambda)}$ component', fontsize=15)
draw_axes(ax2, [-2, 5, -2, 6], '$\\Gamma^{(\\lambda)}$', '$\\Gamma^{(\\perp)}$')

# Original vector ψ_A (only along y-axis)
v_orig2 = np.array([0.0, 4.0])
ax2.arrow(0, 0, v_orig2[0], v_orig2[1],
          head_width=0.25, head_length=0.25, fc=COLOR_ORIG, ec=COLOR_ORIG, lw=3,
          zorder=5)
ax2.text(v_orig2[0]+0.2, v_orig2[1]+0.3, '$\\psi_A$', fontsize=16, color=COLOR_ORIG, fontweight='bold')

# Zero projection - show a dot at origin
ax2.scatter(0, 0, s=150, color=COLOR_ZERO, zorder=10, marker='o', edgecolors='black', linewidths=2)
ax2.text(-0.5, -0.5, '$0$', fontsize=18, color=COLOR_ZERO, fontweight='bold')

# Dashed line showing ψ_A has no x-component
ax2.plot([0, 0], [0, v_orig2[1]], color='gray', lw=1.5, linestyle=':', alpha=0.6)

# Annotation: equation
ax2.text(0.3, -1.2, '$\\psi_A^{(\\lambda)} = P^{(\\lambda)} \\psi_A = 0$',
         fontsize=14, fontstyle='italic', bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow', edgecolor='gray'))

# ------------------------
# Additional explanatory callout
# ------------------------
fig.text(0.5, -0.02, 
         'The projection operator $P^{(\\lambda)}$ extracts the component of $\\psi_A$ that transforms\n'
         'under the irreducible representation $\\Gamma^{(\\lambda)}$. If no such component exists, the result is zero.',
         ha='center', va='bottom', fontsize=14, fontstyle='italic',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#E8F8F5', edgecolor='#76D7C4', linewidth=2))

plt.tight_layout()
plt.subplots_adjust(top=0.85, bottom=0.18)

plt.savefig('projection_operator_diagram.png', dpi=200, bbox_inches='tight')
plt.show()