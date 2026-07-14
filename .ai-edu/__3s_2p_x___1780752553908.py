import numpy as np
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe

# ----------------------------------------------------------------------
# Global style settings for high-quality static diagram
# ----------------------------------------------------------------------
rcParams['figure.dpi'] = 150
rcParams['figure.figsize'] = (16, 7)
rcParams['font.size'] = 16
rcParams['font.family'] = 'DejaVu Sans'
rcParams['axes.linewidth'] = 2.0
rcParams['xtick.major.width'] = 2.0
rcParams['ytick.major.width'] = 2.0
rcParams['xtick.major.size'] = 8
rcParams['ytick.major.size'] = 8
rcParams['xtick.labelsize'] = 14
rcParams['ytick.labelsize'] = 14
rcParams['axes.edgecolor'] = '#3a3a3a'
rcParams['axes.labelcolor'] = '#3a3a3a'
rcParams['text.color'] = '#2c2c2c'
rcParams['grid.color'] = '#cccccc'
rcParams['grid.alpha'] = 0.5
rcParams['grid.linewidth'] = 0.8

# ----------------------------------------------------------------------
# Define the wavefunctions on a 2D grid (z=0 plane)
# ----------------------------------------------------------------------
x = np.linspace(-5, 5, 400)
y = np.linspace(-5, 5, 400)
X, Y = np.meshgrid(x, y)
R = np.sqrt(X**2 + Y**2)

# 3s-like orbital (simplified: positive core, negative outer shell)
# ψ_s = (2 - r) * exp(-r/2)   (positive for r<2, negative for r>2)
psi_s = (2.0 - R) * np.exp(-R / 2.0)

# 2p_x-like orbital (dumbbell along x)
# ψ_p = x * exp(-r^2/4)
psi_p = X * np.exp(-R**2 / 4.0)

# Normalise amplitudes to lie roughly in [-1,1] for better visual comparison
max_s = np.max(np.abs(psi_s))
max_p = np.max(np.abs(psi_p))
psi_s = psi_s / max_s
psi_p = psi_p / max_p

# Combined orbital
psi_total = psi_s + psi_p

# ----------------------------------------------------------------------
# Create three subplots
# ----------------------------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(16, 7), sharex=False, sharey=False,
                         gridspec_kw={'width_ratios': [1, 1, 1], 'wspace': 0.35})

# Titles
titles = ['3s Orbital', '2p$_x$ Orbital', 'ψ = 3s + 2p$_x$']
orbital_data = [psi_s, psi_p, psi_total]

# Custom diverging colormap (blue → white → red)
cmap = plt.cm.RdBu_r
levels = 30

for i, (ax, data, title) in enumerate(zip(axes, orbital_data, titles)):
    # Contour fill
    contour = ax.contourf(X, Y, data, levels=levels, cmap=cmap,
                          vmin=-1.0, vmax=1.0, extend='both')
    
    # Contour lines at zero and ±0.5
    ax.contour(X, Y, data, levels=[-0.5, 0, 0.5], colors='#333333',
               linewidths=1.8, linestyles='--')
    
    # Add a bold zero contour line
    ax.contour(X, Y, data, levels=[0], colors='#111111', linewidths=2.5)
    
    # Axis styling
    ax.set_xlim(-5, 5)
    ax.set_ylim(-5, 5)
    ax.set_aspect('equal')
    ax.set_xlabel('x (a.u.)', fontweight='bold')
    ax.set_ylabel('y (a.u.)', fontweight='bold')
    ax.set_title(title, fontweight='bold', fontsize=20, pad=15)
    ax.tick_params(axis='both', which='major', labelsize=12)
    ax.grid(True, linestyle=':', alpha=0.4)
    
    # Add circle borders
    circle = plt.Circle((0, 0), 5, fill=False, edgecolor='#666666',
                        linewidth=1.2, linestyle='-', alpha=0.3)
    ax.add_patch(circle)

# ----------------------------------------------------------------------
# Annotations for each subplot
# ----------------------------------------------------------------------
# Subplot 0: 3s - point to node ring
ax0 = axes[0]
# Draw arrow to radial node (circle of radius ~2)
node_circle = plt.Circle((0, 0), 2.0, fill=False, edgecolor='#e74c3c',
                         linewidth=2.5, linestyle='-', zorder=5)
ax0.add_patch(node_circle)
ax0.annotate('Radial node\n(ψ = 0)', xy=(2.0, 0.0), xytext=(3.8, 1.5),
             fontsize=14, fontweight='bold', color='#c0392b',
             arrowprops=dict(facecolor='#c0392b', edgecolor='#c0392b',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#c0392b', linewidth=1.5))
# Annotation for positive core
ax0.annotate('Positive core', xy=(0, 0), xytext=(-3.0, 3.5),
             fontsize=14, fontweight='bold', color='#2980b9',
             arrowprops=dict(facecolor='#2980b9', edgecolor='#2980b9',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#2980b9', linewidth=1.5))

# Subplot 1: 2p_x - point to lobes
ax1 = axes[1]
ax1.annotate('Positive lobe', xy=(1.7, 0.0), xytext=(3.0, 2.5),
             fontsize=14, fontweight='bold', color='#c0392b',
             arrowprops=dict(facecolor='#c0392b', edgecolor='#c0392b',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#c0392b', linewidth=1.5))
ax1.annotate('Negative lobe', xy=(-1.7, 0.0), xytext=(-4.2, -2.5),
             fontsize=14, fontweight='bold', color='#2980b9',
             arrowprops=dict(facecolor='#2980b9', edgecolor='#2980b9',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#2980b9', linewidth=1.5))
# Nodal plane
ax1.plot([-5, 5], [0, 0], linestyle='--', linewidth=2.0, color='#2c3e50', alpha=0.7)
ax1.text(4.8, 0.4, 'Nodal plane', fontsize=14, fontweight='bold', color='#2c3e50',
         ha='right', bbox=dict(facecolor='white', edgecolor='#2c3e50', boxstyle='round,pad=0.2'))

# Subplot 2: combined - highlight constructive/destructive interference
ax2 = axes[2]
# Arrow to region of enhanced positive amplitude on the right
ax2.annotate('Constructive\ninterference', xy=(2.0, 0.0), xytext=(3.2, -3.2),
             fontsize=14, fontweight='bold', color='#c0392b',
             arrowprops=dict(facecolor='#c0392b', edgecolor='#c0392b',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#c0392b', linewidth=1.5))
# Arrow to region of reduced amplitude on the left
ax2.annotate('Destructive\ninterference', xy=(-2.0, 0.0), xytext=(-4.2, 3.2),
             fontsize=14, fontweight='bold', color='#2980b9',
             arrowprops=dict(facecolor='#2980b9', edgecolor='#2980b9',
                             arrowstyle='->', linewidth=2.0, shrinkA=8, shrinkB=8),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                       edgecolor='#2980b9', linewidth=1.5))

# ----------------------------------------------------------------------
# Add a colorbar for the whole figure (shared colormap)
# ----------------------------------------------------------------------
cbar_ax = fig.add_axes([0.92, 0.15, 0.015, 0.7])
cbar = fig.colorbar(contour, cax=cbar_ax, ticks=[-1.0, -0.5, 0, 0.5, 1.0])
cbar.set_label('Amplitude (ψ)', fontweight='bold', fontsize=16)
cbar.ax.tick_params(labelsize=12)

# ----------------------------------------------------------------------
# Final layout and display
# ----------------------------------------------------------------------
plt.tight_layout(rect=[0, 0, 0.9, 1])
plt.show()