import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
import numpy as np

# ============================================================
# CONFIGURATION & STYLING
# ============================================================
plt.rcParams.update({
    'figure.dpi': 150,
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'DejaVu Sans'],
    'font.size': 14,
    'axes.edgecolor': 'white',
    'axes.facecolor': 'white',
    'axes.linewidth': 0,
    'text.usetex': False,  # Strictly no LaTeX
})

# Color Palette
COLOR_N = '#3498db'
COLOR_H = '#2ecc71'
COLOR_PX_POS = '#e74c3c'
COLOR_PX_NEG = '#3498db'
COLOR_PY_POS = '#f39c12'
COLOR_PY_NEG = '#9b59b6'
COLOR_BG = '#f5f7fa'
COLOR_TABLE_HEADER = '#2c3e50'
COLOR_TABLE_E = '#f1c40f'
COLOR_GRID = '#bdc3c7'

# ============================================================
# FIGURE SETUP
# ============================================================
fig, ax = plt.subplots(2, 2, figsize=(24, 18))
fig.patch.set_facecolor(COLOR_BG)

# Adjust subplot spacing
plt.subplots_adjust(left=0.04, right=0.96, top=0.88, bottom=0.08, hspace=0.35, wspace=0.35)

# Global Title
fig.suptitle('C3v Symmetry: Degenerate px and py Orbitals as Basis for the E Irreducible Representation',
             fontsize=26, fontweight='bold', y=0.96, color='#2c3e50')

# ============================================================
# PANEL (a): Molecular Geometry and Symmetry Elements (C3v)
# ============================================================
ax1 = ax[0, 0]
ax1.set_xlim(-1.5, 1.5)
ax1.set_ylim(-1.5, 1.5)
ax1.set_aspect('equal')
ax1.set_facecolor('white')
ax1.set_title('(a) Molecular Geometry: NH3 (C3v)', fontsize=18, fontweight='bold', pad=10)

# Draw bonds
# Back bonds (lighter)
ax1.plot([0, -0.866], [0.5, -0.5], color='gray', lw=3, zorder=1)
ax1.plot([0, 0.866], [0.5, -0.5], color='gray', lw=3, zorder=1)
# Front bond (thicker, with wedge for 3D effect)
front_bond = Polygon([(0, 0.5), (-0.15, -1.0), (0.15, -1.0)], color='#d5dbdb', edgecolor='#7f8c8d', linewidth=2, zorder=2)
ax1.add_patch(front_bond)
ax1.plot([0, 0], [0.5, -1.0], color='#2c3e50', lw=4, zorder=3)

# Draw C3 axis (dashed line)
ax1.plot([0, 0], [1.3, -1.3], 'k--', lw=2, zorder=1)
ax1.text(0.1, 1.2, 'C3 axis', fontsize=14, color='#7f8c8d', fontweight='bold')

# Draw rotation arrow around C3 axis
rot_arrow = FancyArrowPatch((0.25, 0.9), (-0.25, 0.9), arrowstyle='->,head_width=0.15,head_length=0.2',
                             connectionstyle='arc3,rad=-0.5', color='#e74c3c', lw=3, zorder=4)
ax1.add_patch(rot_arrow)
ax1.text(0.4, 1.0, 'C3 rotation', fontsize=14, color='#e74c3c', fontweight='bold')

# Draw sigma_v plane (transparent rectangle)
sigma_v = Polygon([(-0.4, 1.3), (0.4, 1.3), (0.4, -1.3), (-0.4, -1.3)], closed=True,
                  color='#2980b9', alpha=0.1, edgecolor='#2980b9', linewidth=2, linestyle='--', zorder=0)
ax1.add_patch(sigma_v)
ax1.text(0.5, -0.8, 'sigmav plane', fontsize=14, color='#2980b9', fontweight='bold', rotation=90)

# Draw Atoms
N_atom = Circle((0, 0.5), 0.25, facecolor=COLOR_N, edgecolor='#2c3e50', linewidth=3, zorder=5)
ax1.add_patch(N_atom)
ax1.text(0, 0.5, 'N', fontsize=16, ha='center', va='center', color='white', fontweight='bold', zorder=6)

H1 = Circle((-0.866, -0.5), 0.18, facecolor=COLOR_H, edgecolor='#2c3e50', linewidth=2, zorder=5)
H2 = Circle((0.866, -0.5), 0.18, facecolor=COLOR_H, edgecolor='#2c3e50', linewidth=2, zorder=5)
H3 = Circle((0, -1.0), 0.18, facecolor=COLOR_H, edgecolor='#2c3e50', linewidth=2, zorder=5)
ax1.add_patch(H1)
ax1.add_patch(H2)
ax1.add_patch(H3)
ax1.text(-0.866, -0.5, 'H', fontsize=14, ha='center', va='center', color='white', fontweight='bold', zorder=6)
ax1.text(0.866, -0.5, 'H', fontsize=14, ha='center', va='center', color='white', fontweight='bold', zorder=6)
ax1.text(0, -1.0, 'H', fontsize=14, ha='center', va='center', color='white', fontweight='bold', zorder=6)

ax1.axis('off')

# ============================================================
# PANEL (b): Degenerate px and py Orbitals (Basis for E)
# ============================================================
ax2 = ax[0, 1]
ax2.set_xlim(-2.5, 2.5)
ax2.set_ylim(-2.5, 2.5)
ax2.set_aspect('equal')
ax2.set_facecolor('white')
ax2.set_title('(b) Degenerate Atomic Orbitals: Basis for E', fontsize=18, fontweight='bold', pad=10)

# Create grid for orbital wavefunctions
x = np.linspace(-2.5, 2.5, 300)
y = np.linspace(-2.5, 2.5, 300)
X, Y = np.meshgrid(x, y)
R2 = X**2 + Y**2
psi_px = X * np.exp(-R2)
psi_py = Y * np.exp(-R2)
levels = np.linspace(-0.4, 0.4, 31)

# Plot px orbital (RdBu colormap)
px_plot = ax2.contourf(X, Y, psi_px, levels=levels, cmap='RdBu', alpha=0.7, extend='both')
ax2.contour(X, Y, psi_px, levels=levels, colors='black', linewidths=0.3, alpha=0.2)

# Plot py orbital (PuOr colormap)
py_plot = ax2.contourf(X, Y, psi_py, levels=levels, cmap='PuOr', alpha=0.7, extend='both')
ax2.contour(X, Y, psi_py, levels=levels, colors='black', linewidths=0.3, alpha=0.2)

# Add axes and labels
ax2.axhline(0, color='black', lw=1)
ax2.axvline(0, color='black', lw=1)

# Label the lobes
ax2.text(2.0, 0.2, 'px', fontsize=18, color='#c0392b', fontweight='bold', ha='center')
ax2.text(-2.0, 0.2, 'px', fontsize=18, color='#2980b9', fontweight='bold', ha='center')
ax2.text(0.2, 2.0, 'py', fontsize=18, color='#d35400', fontweight='bold', va='center')
ax2.text(0.2, -2.0, 'py', fontsize=18, color='#8e44ad', fontweight='bold', va='center')

# Degeneracy label
ax2.annotate('Degenerate E level', xy=(0, 0), xytext=(2.5, 2.2),
             fontsize=16, fontweight='bold', color='#2c3e50',
             arrowprops=dict(arrowstyle='->', color='#2c3e50', lw=2),
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#2c3e50', lw=2))

ax2.axis('off')

# ============================================================
# PANEL (c): Transformation under C3
# ============================================================
ax3 = ax[1, 0]
ax3.set_xlim(-1.8, 1.8)
ax3.set_ylim(-1.8, 1.8)
ax3.set_aspect('equal')
ax3.set_facecolor('white')
ax3.set_title('(c) Action of C3 on Basis Functions', fontsize=18, fontweight='bold', pad=10)

# Grid
ax3.grid(True, linestyle='--', alpha=0.3, color=COLOR_GRID)
ax3.axhline(0, color='black', lw=1)
ax3.axvline(0, color='black', lw=1)

# Draw px vector (along +x)
ax3.arrow(0, 0, 1, 0, head_width=0.08, head_length=0.15, fc=COLOR_PX_POS, ec=COLOR_PX_POS, lw=4, zorder=10)
ax3.text(1.1, -0.2, 'px', fontsize=16, color=COLOR_PX_POS, fontweight='bold')

# Draw py vector (along +y)
ax3.arrow(0, 0, 0, 1, head_width=0.08, head_length=0.15, fc=COLOR_PY_POS, ec=COLOR_PY_POS, lw=4, zorder=10)
ax3.text(-0.3, 1.1, 'py', fontsize=16, color=COLOR_PY_POS, fontweight='bold')

# Draw C3(px) vector
v_c3_x = -0.5
v_c3_y = np.sqrt(3)/2
ax3.arrow(0, 0, v_c3_x, v_c3_y, head_width=0.08, head_length=0.15, fc='#8e44ad', ec='#8e44ad', lw=4, zorder=10)
ax3.text(v_c3_x - 0.1, v_c3_y + 0.1, 'C3(px)', fontsize=16, color='#8e44ad', fontweight='bold')

# Draw C3^2(px) vector
v_c32_x = -0.5
v_c32_y = -np.sqrt(3)/2
ax3.arrow(0, 0, v_c32_x, v_c32_y, head_width=0.08, head_length=0.15, fc='#2c3e50', ec='#2c3e50', lw=4, zorder=10)
ax3.text(v_c32_x - 0.1, v_c32_y - 0.3, 'C3^2(px)', fontsize=16, color='#2c3e50', fontweight='bold')

# Transformation Matrix Box
matrix_text = (
    'C3 rotation matrix:\n'
    '[  -1/2    -sqrt(3)/2  ]\n'
    '[  sqrt(3)/2   -1/2    ]\n\n'
    'Trace (character): -1\n'
    'Matches C3v character table!'
)
ax3.text(1.2, -1.5, matrix_text, fontsize=14, family='monospace',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#ecf0f1', edgecolor='#2c3e50', lw=2),
         verticalalignment='bottom', horizontalalignment='center')

ax3.set_xlabel('x', fontsize=16)
ax3.set_ylabel('y', fontsize=16)

# ============================================================
# PANEL (d): C3v Character Table
# ============================================================
ax4 = ax[1, 1]
ax4.set_facecolor('white')
ax4.set_title('(d) C3v Character Table', fontsize=18, fontweight='bold', pad=10)
ax4.axis('off')

# Table data
col_labels = ['C3v', 'E', '2C3', '3sigmav', 'Basis Functions']
cell_text = [
    ['A1', '1', '1', '1', 'z'],
    ['A2', '1', '1', '-1', 'Rz'],
    ['E', '2', '-1', '0', '(px, py)'],
]
rows = ['', 'A1', 'A2', 'E']

# Create table
table = ax4.table(cellText=cell_text, colLabels=col_labels, loc='center', cellLoc='center')
table.scale(1, 3)
table.auto_set_font_size(False)
table.set_fontsize(18)

# Style header row
for j in range(5):
    cell = table[(0, j)]
    cell.set_facecolor(COLOR_TABLE_HEADER)
    cell.set_text_props(color='white', fontweight='bold')

# Style data rows
for i in range(1, 4):
    for j in range(5):
        cell = table[(i, j)]
        if i == 1:
            cell.set_facecolor('#ffffff')
        elif i == 2:
            cell.set_facecolor('#ecf0f1')
        elif i == 3:  # E representation row
            cell.set_facecolor(COLOR_TABLE_E)
            cell.set_text_props(fontweight='bold', color='#2c3e50')

# Add a callout box for the E representation
callout_text = ('The E representation is 2-dimensional.\n'
                'px and py form its basis.')
ax4.text(0.5, 0.15, callout_text, fontsize=16, ha='center', va='center',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#fff9c4', edgecolor=COLOR_TABLE_E, lw=3))

# Arrow connecting table row to callout
ax4.annotate('', xy=(0.5, 0.32), xytext=(0.5, 0.22),
             arrowprops=dict(arrowstyle='->', color=COLOR_TABLE_E, lw=3))

# ============================================================
# FINAL TOUCHES & DISPLAY
# ============================================================

# Add a global annotation/legend for the whole figure
fig.text(0.5, 0.02, 'The degenerate px and py orbitals form a 2-dimensional basis for the E irreducible representation in C3v symmetry.',
         fontsize=16, ha='center', fontweight='bold', color='#2c3e50',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor='#bdc3c7', lw=2))

# Show the diagram
plt.show()