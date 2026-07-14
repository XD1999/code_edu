import numpy as np
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
import matplotlib.patheffects as pe

# =============================================================================
# CONFIGURATION & STYLE
# =============================================================================
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Segoe UI', 'Helvetica', 'Arial']
plt.rcParams['font.size'] = 14
plt.rcParams['axes.linewidth'] = 2.5
plt.rcParams['xtick.major.width'] = 2.0
plt.rcParams['ytick.major.width'] = 2.0
plt.rcParams['xtick.major.size'] = 6.0
plt.rcParams['ytick.major.size'] = 6.0
plt.rcParams['text.usetex'] = False  # Pure Python rendering, no LaTeX parsing

# =============================================================================
# DATA GENERATION
# =============================================================================
# Define the grid
N = 400
x = np.linspace(-3.5, 3.5, N)
y = np.linspace(-3.5, 3.5, N)
X, Y = np.meshgrid(x, y)

# Center of the Gaussian: R_N
RN = np.array([0.75, 0.5])
r = np.sqrt((X - RN[0])**2 + (Y - RN[1])**2)
F = np.exp(-r**2)

# Radial profile data
r_1d = np.linspace(0, 4.5, 500)
f_1d = np.exp(-r_1d**2)

# =============================================================================
# FIGURE SETUP
# =============================================================================
fig = plt.figure(figsize=(18, 8.5), facecolor='#FAFAFA', dpi=150)
gs = GridSpec(1, 2, width_ratios=[1.3, 1], wspace=0.35,
              left=0.05, right=0.95, bottom=0.1, top=0.92)

ax1 = fig.add_subplot(gs[0])
ax2 = fig.add_subplot(gs[1])

# =============================================================================
# MAIN 2D VIEW: Cel-shaded contour plot + bold contours
# =============================================================================
# Background cel-shading (contourf)
levels_bg = np.linspace(0, 1.0, 15)
cf = ax1.contourf(X, Y, F, levels=levels_bg, cmap='inferno', zorder=1, extend='both')

# Bold contour lines
contour_levels = [0.1, 0.3, 0.5, 0.7, 0.9]
cs = ax1.contour(X, Y, F, levels=contour_levels, colors='white', linewidths=3.5, zorder=3, alpha=0.9)
ax1.clabel(cs, inline=True, fontsize=13, fmt='%.1f', colors='white',
           inline_spacing=8, use_clabeltext=True)

# Mark the center node R_N
ax1.plot(RN[0], RN[1], marker='*', markersize=28, color='#00E5FF',
         markeredgecolor='black', markeredgewidth=1.8, zorder=10)

# Colorbar for the 2D plot
cbar = fig.colorbar(cf, ax=ax1, shrink=0.85, pad=0.02)
cbar.set_label('$f(r) = e^{-r^2}$', fontsize=15, fontweight='bold')
cbar.outline.set_linewidth(2)

# Aesthetics for ax1
ax1.set_xlim(-3.2, 3.2)
ax1.set_ylim(-3.2, 3.2)
ax1.set_xlabel('X-axis', fontsize=16, fontweight='bold')
ax1.set_ylabel('Y-axis', fontsize=16, fontweight='bold')
ax1.set_title('2D Radial Basis: $r = ||\\mathbf{x} - \\mathbf{R}_N||$',
              fontsize=17, fontweight='bold', pad=15)
ax1.set_aspect('equal')
ax1.grid(True, linestyle=':', alpha=0.4, color='gray', zorder=0)

# ---- Detailed Annotations for ax1 ----
# 1. Center node callout
ax1.annotate(
    '$\\mathbf{R}_N$ (Center Node)',
    xy=(RN[0], RN[1]), xytext=(RN[0] - 2.0, RN[1] + 1.8),
    arrowprops=dict(facecolor='black', edgecolor='black', linewidth=2,
                    shrink=0.05, width=2.5, headwidth=10, headlength=10),
    bbox=dict(boxstyle='round, pad=0.4', facecolor='#FFF9C4',
              edgecolor='black', linewidth=1.5),
    fontsize=14, fontweight='bold',
    path_effects=[pe.withStroke(linewidth=4, foreground='white')]
)

# 2. Radius vector annotation (r)
r_example = np.sqrt(-np.log(0.5))  # radius where f = 0.5
angle = np.pi / 6
x_point = RN[0] + r_example * np.cos(angle)
y_point = RN[1] + r_example * np.sin(angle)

ax1.annotate(
    '', xy=(x_point, y_point), xytext=(RN[0], RN[1]),
    arrowprops=dict(facecolor='#00E5FF', edgecolor='black', linewidth=2.5,
                    shrink=0.0, width=3, headwidth=10, headlength=12),
    zorder=20
)
# Label for the radius vector
mid_x = (RN[0] + x_point) / 2
mid_y = (RN[1] + y_point) / 2
ax1.text(mid_x - 0.15, mid_y + 0.25, '$r$', fontsize=20, color='#00E5FF',
         fontweight='bold', ha='center', va='center',
         bbox=dict(boxstyle='round, pad=0.15', facecolor='black', edgecolor='none', alpha=0.7),
         path_effects=[pe.withStroke(linewidth=3, foreground='black')])

# 3. Contour value annotation
ax1.annotate(
    '$f(r) = 0.5$',
    xy=(x_point, y_point), xytext=(x_point + 1.2, y_point + 1.0),
    arrowprops=dict(facecolor='black', edgecolor='black', linewidth=1.5,
                    shrink=0.05, width=1.5, headwidth=8),
    bbox=dict(boxstyle='round, pad=0.3', facecolor='white',
              edgecolor='black', linewidth=1.2),
    fontsize=13, fontweight='bold',
    path_effects=[pe.withStroke(linewidth=4, foreground='white')]
)

# =============================================================================
# SECONDARY 1D VIEW: Radial profile
# =============================================================================
ax2.plot(r_1d, f_1d, linewidth=4.5, color='#D32F2F', zorder=5,
         label='$f(r) = e^{-r^2}$', solid_joinstyle='round')
ax2.fill_between(r_1d, 0, f_1d, alpha=0.25, color='#D32F2F', zorder=2)

# Mark the specific radii corresponding to the contour levels
for level in contour_levels:
    r_level = np.sqrt(-np.log(level))
    ax2.scatter([r_level], [level], s=140, zorder=10, color='#1976D2',
                edgecolor='black', linewidth=2.0)
    ax2.axvline(x=r_level, linestyle='--', color='#1976D2', alpha=0.6,
                linewidth=2.0)
    ax2.axhline(y=level, linestyle='--', color='#1976D2', alpha=0.6,
                linewidth=2.0)
    # Label the specific radii
    ax2.annotate(f'$r_{{{level:.1f}}}$', xy=(r_level, level),
                 xytext=(r_level + 0.15, level - 0.08),
                 fontsize=11, fontweight='bold', color='#1976D2',
                 bbox=dict(boxstyle='round, pad=0.2', facecolor='white',
                           edgecolor='#1976D2', linewidth=1.0))

# Highlight the center
ax2.scatter([0], [1], s=250, zorder=10, color='#FFC107',
            edgecolor='black', linewidth=2.5, marker='*')

# Aesthetics for ax2
ax2.set_xlim(-0.1, 4.5)
ax2.set_ylim(-0.05, 1.15)
ax2.set_xlabel('$r = ||\\mathbf{x} - \\mathbf{R}_N||$', fontsize=16, fontweight='bold')
ax2.set_ylabel('$f(r)$', fontsize=16, fontweight='bold')
ax2.set_title('1D Cross-Section Profile', fontsize=17, fontweight='bold', pad=15)
ax2.grid(True, linestyle=':', alpha=0.4, color='gray')
ax2.legend(fontsize=14, loc='upper right', frameon=True, fancybox=True,
           shadow=True, edgecolor='black', facecolor='white')

# ---- Annotation for the center in the 1D plot ----
ax2.annotate(
    '$\\mathbf{R}_N$ (Center)',
    xy=(0, 1), xytext=(1.8, 0.9),
    arrowprops=dict(facecolor='black', edgecolor='black', linewidth=2,
                    shrink=0.05, width=2, headwidth=8, headlength=8),
    bbox=dict(boxstyle='round, pad=0.4', facecolor='#FFF9C4',
              edgecolor='black', linewidth=1.5),
    fontsize=14, fontweight='bold',
    path_effects=[pe.withStroke(linewidth=4, foreground='white')]
)

# =============================================================================
# FINAL LAYOUT ADJUSTMENT & DISPLAY
# =============================================================================
fig.suptitle('Gaussian Radial Basis Function:  $f(\\mathbf{x}) = \\exp\\left(-||\\mathbf{x} - \\mathbf{R}_N||^2\\right)$',
             fontsize=20, fontweight='bold', y=0.98,
             path_effects=[pe.withStroke(linewidth=2, foreground='white')])

# Tight layout to prevent clipping
plt.subplots_adjust(top=0.88, bottom=0.12)

# Display the static diagram
plt.show()
