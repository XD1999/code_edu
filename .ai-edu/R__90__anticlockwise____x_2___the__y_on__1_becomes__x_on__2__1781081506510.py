import matplotlib.pyplot as plt
import numpy as np

# ------------------------------------------------------------------------
# Configuration - high quality static diagram
# ------------------------------------------------------------------------
plt.rcParams.update({
    'figure.dpi': 150,
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
    'font.size': 14,
    'axes.linewidth': 1.5,
    'axes.edgecolor': '#333333',
    'xtick.major.size': 6,
    'ytick.major.size': 6,
})

fig, ax = plt.subplots(figsize=(10, 8))
ax.set_xlim(-5, 5)
ax.set_ylim(-5, 5)
ax.set_aspect('equal')
ax.set_facecolor('#f8f9fa')

# Subtle background grid
for x in np.linspace(-4.5, 4.5, 10):
    ax.axvline(x, color='#cccccc', linewidth=0.5, linestyle='-', alpha=0.4)
for y in np.linspace(-4.5, 4.5, 10):
    ax.axhline(y, color='#cccccc', linewidth=0.5, linestyle='-', alpha=0.4)

# ------------------------------------------------------------------------
# Define coordinate system #1 (original) – blue colors
# ------------------------------------------------------------------------
origin = np.array([0.0, 0.0])
x1_dir = np.array([1.0, 0.0])
y1_dir = np.array([0.0, 1.0])

# Draw axes #1 (thick, solid)
ax.arrow(origin[0], origin[1], x1_dir[0]*3.5, x1_dir[1]*3.5,
         head_width=0.25, head_length=0.35, fc='#2b5f8e', ec='#2b5f8e',
         linewidth=2.5, length_includes_head=True, zorder=5)
ax.arrow(origin[0], origin[1], y1_dir[0]*3.5, y1_dir[1]*3.5,
         head_width=0.25, head_length=0.35, fc='#2b5f8e', ec='#2b5f8e',
         linewidth=2.5, length_includes_head=True, zorder=5)

# Labels for #1 axes
ax.text(3.8, -0.3, r'$x_1$', fontsize=18, fontweight='bold', color='#2b5f8e',
        ha='center', va='center')
ax.text(-0.3, 3.8, r'$y_1$', fontsize=18, fontweight='bold', color='#2b5f8e',
        ha='center', va='center')

# ------------------------------------------------------------------------
# Define coordinate system #2 (rotated 90° anticlockwise) – red colors
# ------------------------------------------------------------------------
# Rotation matrix for 90° anticlockwise
theta = np.pi/2
R = np.array([[np.cos(theta), -np.sin(theta)],
              [np.sin(theta),  np.cos(theta)]])
# New axes directions
x2_dir = R @ x1_dir   # becomes (0,1) – up
y2_dir = R @ y1_dir   # becomes (-1,0) – left

# Draw axes #2 (dashed, slightly thinner)
ax.arrow(origin[0], origin[1], x2_dir[0]*3.5, x2_dir[1]*3.5,
         head_width=0.20, head_length=0.30, fc='#c43a31', ec='#c43a31',
         linewidth=2.0, linestyle='--', length_includes_head=True, zorder=6)
ax.arrow(origin[0], origin[1], y2_dir[0]*3.5, y2_dir[1]*3.5,
         head_width=0.20, head_length=0.30, fc='#c43a31', ec='#c43a31',
         linewidth=2.0, linestyle='--', length_includes_head=True, zorder=6)

# Labels for #2 axes (shifted slightly to avoid overlap)
ax.text(0.3, 3.8, r'$x_2$', fontsize=18, fontweight='bold', color='#c43a31',
        ha='center', va='center')
ax.text(-3.8, 0.3, r'$y_2$', fontsize=18, fontweight='bold', color='#c43a31',
        ha='center', va='center')

# ------------------------------------------------------------------------
# Vector that is +y in #1 and +x in #2
# The vector points straight up: (0, 3.0) in absolute coordinates
vec_len = 3.0
vec_end = np.array([0.0, vec_len])
ax.arrow(origin[0], origin[1], vec_end[0], vec_end[1],
         head_width=0.30, head_length=0.40, fc='#e67e22', ec='#e67e22',
         linewidth=3.5, length_includes_head=True, zorder=10)

# Double label at the tip
ax.annotate(r'$+y_1$', xy=(0.0, vec_len+0.4), fontsize=17, fontweight='bold',
            color='#e67e22', ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.15', fc='#fef9e7', ec='#e67e22',
                      linewidth=1.5))
ax.annotate(r'$+x_2$', xy=(0.0, vec_len-0.5), fontsize=17, fontweight='bold',
            color='#e67e22', ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.15', fc='#fef9e7', ec='#e67e22',
                      linewidth=1.5))

# ------------------------------------------------------------------------
# Indicate rotation with a curved arrow
# ------------------------------------------------------------------------
arc_radius = 2.2
arc_angles = np.linspace(0, np.pi/2, 50)
arc_x = arc_radius * np.cos(arc_angles)
arc_y = arc_radius * np.sin(arc_angles)
ax.plot(arc_x, arc_y, color='#7d3c98', linewidth=2.5, linestyle='-', zorder=4)
# Arrowhead on the arc
ax.annotate('', xy=(arc_x[-1], arc_y[-1]), xytext=(arc_x[-2], arc_y[-2]),
            arrowprops=dict(arrowstyle='->', color='#7d3c98', lw=2.5),
            zorder=4)
# Angle label
ax.text(1.2, 1.2, r'$90^\circ$', fontsize=18, color='#7d3c98',
        fontweight='bold', ha='center', va='center',
        bbox=dict(boxstyle='round,pad=0.2', fc='white', ec='#7d3c98',
                  linewidth=1.5))

# ------------------------------------------------------------------------
# Annotations and callout box
# ------------------------------------------------------------------------
ax.annotate(r'$\mathbf{R}$ (90° anticlockwise)',
            xy=(1.8, 2.0), fontsize=18, fontweight='bold', color='#7d3c98',
            ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.3', fc='#f3e5f5', ec='#7d3c98',
                      linewidth=2.0))

ax.annotate(r'$\Psi_x^{(2)}$ : $+y_1$ becomes $+x_2$',
            xy=(-2.5, -2.5), fontsize=16, fontweight='bold', color='#2c3e50',
            ha='left', va='center',
            bbox=dict(boxstyle='round,pad=0.3', fc='#eaf2f8', ec='#2980b9',
                      linewidth=1.5))

# Title
ax.set_title(r'Geometric interpretation of $R(90^\circ$ anticlockwise) on $\Psi_x^{(2)}$',
             fontsize=20, fontweight='bold', color='#2c3e50', pad=20)

# ------------------------------------------------------------------------
# Clean up axes and show
# ------------------------------------------------------------------------
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_visible(False)
ax.spines['bottom'].set_visible(False)
ax.tick_params(left=False, labelleft=False,
               bottom=False, labelbottom=False)

plt.tight_layout()
plt.show()