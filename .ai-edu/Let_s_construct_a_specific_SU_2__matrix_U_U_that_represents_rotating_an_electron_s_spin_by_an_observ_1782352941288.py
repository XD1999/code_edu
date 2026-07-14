import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Arc
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection, Line3DCollection
import matplotlib.patheffects as path_effects

# ============================================================
# SU(2) Rotation Matrix Visualization
# Rotation by θ = π/2 around x-axis
# U = cos(π/4)I - i·sin(π/4)σ_x = (1/√2)[[1, -i], [-i, 1]]
# ============================================================

# --- Color Palette ---
BG_COLOR = '#0F1923'
PANEL_BG = '#162230'
ACCENT_CYAN = '#00E5FF'
ACCENT_MAGENTA = '#FF4081'
ACCENT_GOLD = '#FFD740'
ACCENT_GREEN = '#69F0AE'
ACCENT_ORANGE = '#FF6E40'
TEXT_PRIMARY = '#ECEFF1'
TEXT_SECONDARY = '#90A4AE'
GRID_COLOR = '#263238'
SPHERE_COLOR = '#1A3A4A'
SPHERE_EDGE = '#37474F'

# --- Setup Figure ---
fig = plt.figure(figsize=(22, 14), facecolor=BG_COLOR, dpi=150)

# ============================================================
# LEFT PANEL: Bloch Sphere with Rotation
# ============================================================
ax3d = fig.add_axes([0.02, 0.08, 0.48, 0.85], projection='3d', facecolor=BG_COLOR)

# Sphere wireframe
u = np.linspace(0, 2 * np.pi, 40)
v = np.linspace(0, np.pi, 25)
x_sphere = np.outer(np.cos(u), np.sin(v))
y_sphere = np.outer(np.sin(u), np.sin(v))
z_sphere = np.outer(np.ones(np.size(u)), np.cos(v))

ax3d.plot_surface(x_sphere, y_sphere, z_sphere, alpha=0.08, color=ACCENT_CYAN, 
                  linewidth=0, antialiased=True)

# Draw latitude/longitude lines
for angle in [0, np.pi/2, np.pi, 3*np.pi/2]:
    theta_line = np.linspace(0, np.pi, 60)
    xl = np.sin(theta_line) * np.cos(angle)
    yl = np.sin(theta_line) * np.sin(angle)
    zl = np.cos(theta_line)
    ax3d.plot(xl, yl, zl, color=GRID_COLOR, linewidth=0.8, alpha=0.6)

for phi in [np.pi/4, np.pi/2, 3*np.pi/4]:
    phi_line = np.linspace(0, 2*np.pi, 60)
    xl = np.sin(phi) * np.cos(phi_line)
    yl = np.sin(phi) * np.sin(phi_line)
    zl = np.cos(phi) * np.ones_like(phi_line)
    ax3d.plot(xl, yl, zl, color=GRID_COLOR, linewidth=0.8, alpha=0.6)

# Axes
axis_len = 1.35
ax3d.plot([-axis_len, axis_len], [0, 0], [0, 0], color=ACCENT_ORANGE, linewidth=2.5, alpha=0.9)
ax3d.plot([0, 0], [-axis_len, axis_len], [0, 0], color=ACCENT_GREEN, linewidth=2.5, alpha=0.9)
ax3d.plot([0, 0], [0, 0], [-axis_len, axis_len], color=ACCENT_MAGENTA, linewidth=2.5, alpha=0.9)

# Axis labels
ax3d.text(axis_len + 0.12, 0, 0, 'x', fontsize=18, color=ACCENT_ORANGE, fontweight='bold',
          ha='center', va='center')
ax3d.text(0, axis_len + 0.12, 0, 'y', fontsize=18, color=ACCENT_GREEN, fontweight='bold',
          ha='center', va='center')
ax3d.text(0, 0, axis_len + 0.12, 'z', fontsize=18, color=ACCENT_MAGENTA, fontweight='bold',
          ha='center', va='center')

# Initial state: spin-up |+z⟩ = (0, 0, 1)
init_pos = np.array([0, 0, 1])
ax3d.plot([0, init_pos[0]], [0, init_pos[1]], [0, init_pos[2]], 
          color=ACCENT_CYAN, linewidth=3.5, alpha=0.95)
ax3d.scatter(*init_pos, color=ACCENT_CYAN, s=180, zorder=10, edgecolors='white', linewidths=2)
ax3d.text(init_pos[0] + 0.08, init_pos[1] + 0.15, init_pos[2] + 0.12, 
          '|↑⟩ = |+z⟩', fontsize=14, color=ACCENT_CYAN, fontweight='bold',
          bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_COLOR, edgecolor=ACCENT_CYAN, alpha=0.85))

# Final state after 90° rotation around x-axis: |+z⟩ → |-y⟩ = (0, -1, 0)
# R_x(π/2) on Bloch sphere rotates the state vector by π/2 around x
# (0,0,1) → (0, -sin(π/2), cos(π/2)) = (0, -1, 0)
final_pos = np.array([0, -1, 0])
ax3d.plot([0, final_pos[0]], [0, final_pos[1]], [0, final_pos[2]], 
          color=ACCENT_GOLD, linewidth=3.5, alpha=0.95)
ax3d.scatter(*final_pos, color=ACCENT_GOLD, s=180, zorder=10, edgecolors='white', linewidths=2)
ax3d.text(final_pos[0] + 0.08, final_pos[1] - 0.25, final_pos[2] - 0.15, 
          '|↓_y⟩ = |-y⟩', fontsize=14, color=ACCENT_GOLD, fontweight='bold',
          bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_COLOR, edgecolor=ACCENT_GOLD, alpha=0.85))

# Rotation arc on the Bloch sphere (in the yz-plane, around x-axis)
arc_angles = np.linspace(0, np.pi/2, 50)
arc_x = np.zeros_like(arc_angles)
arc_y = -np.sin(arc_angles)
arc_z = np.cos(arc_angles)
ax3d.plot(arc_x, arc_y, arc_z, color=ACCENT_MAGENTA, linewidth=3.5, alpha=0.9)

# Arrowhead on the arc
arrow_idx = -3
ax3d.annotate('', xy=(arc_x[-1], arc_y[-1], arc_z[-1]),
              xytext=(arc_x[arrow_idx], arc_y[arrow_idx], arc_z[arrow_idx]),
              arrowprops=dict(arrowstyle='->', color=ACCENT_MAGENTA, lw=3))

# Rotation axis indicator (circular arrow around x-axis)
circle_angles = np.linspace(0, 1.6*np.pi, 40)
circle_r = 0.35
cx = 0.7 * np.ones_like(circle_angles)
cy = circle_r * np.cos(circle_angles)
cz = circle_r * np.sin(circle_angles)
ax3d.plot(cx, cy, cz, color=ACCENT_ORANGE, linewidth=2.5, alpha=0.85, linestyle='--')

# θ label on the arc
mid_idx = len(arc_angles) // 2
ax3d.text(arc_x[mid_idx] + 0.15, arc_y[mid_idx] - 0.1, arc_z[mid_idx] + 0.1, 
          'θ = π/2', fontsize=16, color=ACCENT_MAGENTA, fontweight='bold',
          bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_COLOR, edgecolor=ACCENT_MAGENTA, alpha=0.9))

# 3D axis settings
ax3d.set_xlim([-1.5, 1.5])
ax3d.set_ylim([-1.5, 1.5])
ax3d.set_zlim([-1.5, 1.5])
ax3d.set_box_aspect([1, 1, 1])
ax3d.axis('off')
ax3d.view_init(elev=20, azim=-55)

# Title for Bloch sphere
ax3d.set_title('Bloch Sphere: Spin Rotation by θ = π/2 around x̂', 
               fontsize=18, color=TEXT_PRIMARY, fontweight='bold', pad=20,
               fontfamily='sans-serif')

# ============================================================
# RIGHT PANEL: Matrix Construction
# ============================================================
ax_matrix = fig.add_axes([0.52, 0.08, 0.46, 0.85], facecolor=BG_COLOR)
ax_matrix.set_xlim(0, 10)
ax_matrix.set_ylim(0, 14)
ax_matrix.axis('off')

# --- Title ---
ax_matrix.text(5, 13.4, 'SU(2) Rotation Matrix Construction', fontsize=22, 
               color=TEXT_PRIMARY, fontweight='bold', ha='center', fontfamily='sans-serif')
ax_matrix.text(5, 12.85, 'U = exp(−iθ/2 · n̂·σ)  with  θ = π/2,  n̂ = x̂', fontsize=14, 
               color=TEXT_SECONDARY, ha='center', fontfamily='sans-serif')

# --- Step 1: General Formula ---
y_pos = 12.1
box1 = FancyBboxPatch((0.3, y_pos - 0.55), 9.4, 1.0, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_CYAN, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box1)
ax_matrix.text(0.7, y_pos + 0.15, 'Step 1:', fontsize=13, color=ACCENT_CYAN, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.text(2.2, y_pos + 0.15, 'General SU(2) rotation:', fontsize=13, 
               color=TEXT_PRIMARY, fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.25, 'U = cos(θ/2)·I  −  i·sin(θ/2)·(n̂·σ)', fontsize=15, 
               color=ACCENT_GOLD, fontweight='bold', ha='center', fontfamily='sans-serif')

# --- Step 2: Substitute values ---
y_pos = 10.6
box2 = FancyBboxPatch((0.3, y_pos - 0.55), 9.4, 1.0, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_GREEN, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box2)
ax_matrix.text(0.7, y_pos + 0.15, 'Step 2:', fontsize=13, color=ACCENT_GREEN, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.text(2.2, y_pos + 0.15, 'Substitute θ = π/2, n̂ = x̂:', fontsize=13, 
               color=TEXT_PRIMARY, fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.25, 'U = cos(π/4)·I  −  i·sin(π/4)·σₓ', fontsize=15, 
               color=ACCENT_GOLD, fontweight='bold', ha='center', fontfamily='sans-serif')

# --- Step 3: Evaluate trig ---
y_pos = 9.1
box3 = FancyBboxPatch((0.3, y_pos - 0.55), 9.4, 1.0, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_ORANGE, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box3)
ax_matrix.text(0.7, y_pos + 0.15, 'Step 3:', fontsize=13, color=ACCENT_ORANGE, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.text(2.2, y_pos + 0.15, 'Evaluate: cos(π/4) = sin(π/4) = 1/√2', fontsize=13, 
               color=TEXT_PRIMARY, fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.25, 'U = (1/√2)·I  −  (i/√2)·σₓ', fontsize=15, 
               color=ACCENT_GOLD, fontweight='bold', ha='center', fontfamily='sans-serif')

# --- Step 4: Pauli matrix ---
y_pos = 7.5
box4 = FancyBboxPatch((0.3, y_pos - 0.7), 9.4, 1.2, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_MAGENTA, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box4)
ax_matrix.text(0.7, y_pos + 0.2, 'Step 4:', fontsize=13, color=ACCENT_MAGENTA, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.text(2.2, y_pos + 0.2, 'Pauli matrix σₓ and Identity I:', fontsize=13, 
               color=TEXT_PRIMARY, fontfamily='sans-serif')

# Draw I matrix
ax_matrix.text(2.0, y_pos - 0.35, 'I =', fontsize=14, color=TEXT_SECONDARY, 
               fontweight='bold', fontfamily='sans-serif')
# Matrix brackets for I
ax_matrix.plot([3.0, 3.0, 3.15], [y_pos - 0.05, y_pos - 0.6, y_pos - 0.6], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([3.0, 3.0, 3.15], [y_pos + 0.05, y_pos + 0.05, y_pos + 0.05], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([4.3, 4.3, 4.15], [y_pos - 0.05, y_pos - 0.6, y_pos - 0.6], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([4.3, 4.3, 4.15], [y_pos + 0.05, y_pos + 0.05, y_pos + 0.05], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.text(3.4, y_pos + 0.0, '1   0', fontsize=13, color=TEXT_PRIMARY, fontfamily='monospace')
ax_matrix.text(3.4, y_pos - 0.45, '0   1', fontsize=13, color=TEXT_PRIMARY, fontfamily='monospace')

# Draw σ_x matrix
ax_matrix.text(5.5, y_pos - 0.35, 'σₓ =', fontsize=14, color=TEXT_SECONDARY, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.plot([6.7, 6.7, 6.85], [y_pos - 0.05, y_pos - 0.6, y_pos - 0.6], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([6.7, 6.7, 6.85], [y_pos + 0.05, y_pos + 0.05, y_pos + 0.05], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([8.0, 8.0, 7.85], [y_pos - 0.05, y_pos - 0.6, y_pos - 0.6], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.plot([8.0, 8.0, 7.85], [y_pos + 0.05, y_pos + 0.05, y_pos + 0.05], color=TEXT_PRIMARY, linewidth=2)
ax_matrix.text(7.1, y_pos + 0.0, '0   1', fontsize=13, color=TEXT_PRIMARY, fontfamily='monospace')
ax_matrix.text(7.1, y_pos - 0.45, '1   0', fontsize=13, color=TEXT_PRIMARY, fontfamily='monospace')

# --- Step 5: Final Matrix ---
y_pos = 5.4
box5 = FancyBboxPatch((0.3, y_pos - 1.4), 9.4, 2.5, boxstyle="round,pad=0.2",
                       facecolor='#0D2137', edgecolor=ACCENT_GOLD, linewidth=3, alpha=0.95)
ax_matrix.add_patch(box5)
ax_matrix.text(5, y_pos + 0.75, 'Result: SU(2) Matrix U', fontsize=16, 
               color=ACCENT_GOLD, fontweight='bold', ha='center', fontfamily='sans-serif')

# Draw the final matrix with large brackets
mat_cx = 5.0
mat_cy = y_pos - 0.35

# Left bracket
bracket_x_left = 2.8
ax_matrix.plot([bracket_x_left + 0.15, bracket_x_left, bracket_x_left, bracket_x_left + 0.15], 
               [mat_cy + 0.65, mat_cy + 0.65, mat_cy - 0.65, mat_cy - 0.65], 
               color=ACCENT_GOLD, linewidth=3.5)

# Right bracket
bracket_x_right = 7.2
ax_matrix.plot([bracket_x_right - 0.15, bracket_x_right, bracket_x_right, bracket_x_right - 0.15], 
               [mat_cy + 0.65, mat_cy + 0.65, mat_cy - 0.65, mat_cy - 0.65], 
               color=ACCENT_GOLD, linewidth=3.5)

# 1/√2 factor
ax_matrix.text(2.2, mat_cy, '1', fontsize=20, color=ACCENT_GOLD, fontweight='bold', 
               ha='center', fontfamily='sans-serif')
ax_matrix.text(2.2, mat_cy - 0.3, '───', fontsize=14, color=ACCENT_GOLD, fontweight='bold', 
               ha='center', fontfamily='sans-serif')
ax_matrix.text(2.2, mat_cy - 0.55, '√2', fontsize=18, color=ACCENT_GOLD, fontweight='bold', 
               ha='center', fontfamily='sans-serif')

# Matrix elements
# Row 1: 1, -i
ax_matrix.text(4.0, mat_cy + 0.25, '1', fontsize=24, color=ACCENT_CYAN, fontweight='bold', 
               ha='center', fontfamily='sans-serif')
ax_matrix.text(6.0, mat_cy + 0.25, '−i', fontsize=24, color=ACCENT_MAGENTA, fontweight='bold', 
               ha='center', fontfamily='sans-serif')

# Row 2: -i, 1
ax_matrix.text(4.0, mat_cy - 0.35, '−i', fontsize=24, color=ACCENT_MAGENTA, fontweight='bold', 
               ha='center', fontfamily='sans-serif')
ax_matrix.text(6.0, mat_cy - 0.35, '1', fontsize=24, color=ACCENT_CYAN, fontweight='bold', 
               ha='center', fontfamily='sans-serif')

# U = label
ax_matrix.text(1.3, mat_cy, 'U  =', fontsize=22, color=TEXT_PRIMARY, fontweight='bold', 
               ha='center', fontfamily='sans-serif')

# --- Verification Box ---
y_pos = 2.6
box6 = FancyBboxPatch((0.3, y_pos - 0.9), 9.4, 1.6, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_GREEN, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box6)
ax_matrix.text(5, y_pos + 0.4, '✓  Verification: U†U = I  (Unitary)', fontsize=14, 
               color=ACCENT_GREEN, fontweight='bold', ha='center', fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.0, 'det(U) = (1/√2)²·(1·1 − (−i)(−i)) = ½·(1 − (−1)) = 1', fontsize=12, 
               color=TEXT_SECONDARY, ha='center', fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.4, 'U ∈ SU(2):  Unitary ✓   det(U) = 1 ✓', fontsize=13, 
               color=ACCENT_GREEN, fontweight='bold', ha='center', fontfamily='sans-serif')

# --- Action on state ---
y_pos = 0.8
box7 = FancyBboxPatch((0.3, y_pos - 0.55), 9.4, 1.0, boxstyle="round,pad=0.15",
                       facecolor='#1A2D3D', edgecolor=ACCENT_CYAN, linewidth=2, alpha=0.9)
ax_matrix.add_patch(box7)
ax_matrix.text(0.7, y_pos + 0.15, 'Action:', fontsize=13, color=ACCENT_CYAN, 
               fontweight='bold', fontfamily='sans-serif')
ax_matrix.text(5, y_pos + 0.15, 'U|↑⟩  =  (1/√2)(|↑⟩ − i|↓⟩)  =  |↓_y⟩', fontsize=14, 
               color=TEXT_PRIMARY, fontweight='bold', ha='center', fontfamily='sans-serif')
ax_matrix.text(5, y_pos - 0.25, 'Spin-up along z  →  Spin-down along y  (90° rotation around x)', 
               fontsize=11, color=TEXT_SECONDARY, ha='center', fontfamily='sans-serif')

# ============================================================
# Decorative elements and connecting arrows
# ============================================================

# Add a subtle connecting arrow between panels
ax_arrow = fig.add_axes([0.48, 0.08, 0.06, 0.85], facecolor=BG_COLOR)
ax_arrow.set_xlim(0, 1)
ax_arrow.set_ylim(0, 1)
ax_arrow.axis('off')

# Draw a stylized arrow
arrow_y = 0.5
ax_arrow.annotate('', xy=(0.9, arrow_y), xytext=(0.1, arrow_y),
                  arrowprops=dict(arrowstyle='->', color=ACCENT_GOLD, lw=3, 
                                  connectionstyle='arc3,rad=0'))
ax_arrow.text(0.5, arrow_y + 0.06, 'represents', fontsize=10, color=ACCENT_GOLD, 
              ha='center', fontfamily='sans-serif', fontweight='bold')

# ============================================================
# Main title at the very top
# ============================================================
fig.text(0.5, 0.97, 'SU(2) Spin-½ Rotation:  U = exp(−i(π/4)σₓ)  =  (1/√2)[[1, −i], [−i, 1]]', 
         fontsize=20, color=TEXT_PRIMARY, fontweight='bold', ha='center', fontfamily='sans-serif',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#0D2137', edgecolor=ACCENT_GOLD, 
                   linewidth=2.5, alpha=0.95))

# ============================================================
# Legend / Key at bottom
# ============================================================
fig.text(0.25, 0.02, '● Initial State |↑⟩    ', fontsize=12, color=ACCENT_CYAN, 
         ha='center', fontfamily='sans-serif', fontweight='bold')
fig.text(0.38, 0.02, '● Final State |↓_y⟩    ', fontsize=12, color=ACCENT_GOLD, 
         ha='center', fontfamily='sans-serif', fontweight='bold')
fig.text(0.52, 0.02, '● Rotation Arc (θ=π/2)    ', fontsize=12, color=ACCENT_MAGENTA, 
         ha='center', fontfamily='sans-serif', fontweight='bold')
fig.text(0.68, 0.02, '● Rotation Axis x̂', fontsize=12, color=ACCENT_ORANGE, 
         ha='center', fontfamily='sans-serif', fontweight='bold')

plt.subplots_adjust(left=0.02, right=0.98, top=0.94, bottom=0.05)
plt.show()