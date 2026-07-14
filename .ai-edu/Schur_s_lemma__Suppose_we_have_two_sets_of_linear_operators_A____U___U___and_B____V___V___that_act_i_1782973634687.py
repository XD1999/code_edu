import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, Circle, FancyBboxPatch, Arc
import numpy as np
import matplotlib.patheffects as pe

# --- Configuration ---
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']

# Color Palette (Modern Dark Theme)
BG_COLOR = '#0f172a'
GRID_COLOR = '#1e293b'
U_COLOR = '#38bdf8'  # Sky
V_COLOR = '#f472b6'  # Pink
VEC_COLOR = '#fafafa' # White
TRANS_COLOR = '#fde047' # Yellow
PHI_ZERO_COLOR = '#64748b' # Slate
PHI_ISO_COLOR = '#a3e635' # Lime
TEXT_COLOR = '#f1f5f9'
SUBTEXT_COLOR = '#94a3b8'

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 9), dpi=200)
fig.patch.set_facecolor(BG_COLOR)

for ax in [ax1, ax2]:
    ax.set_facecolor(BG_COLOR)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_aspect('equal')
    ax.axis('off')
    
    # Subtle background grid
    for x in np.arange(0, 10, 0.5):
        ax.axvline(x, color=GRID_COLOR, linewidth=0.5, zorder=0)
    for y in np.arange(0, 10, 0.5):
        ax.axhline(y, color=GRID_COLOR, linewidth=0.5, zorder=0)

# --- Helper Functions ---
def draw_vector_space(ax, center, radius, color, label):
    """Draws a vector space as a circle with a polar grid."""
    # Glow effect
    for r, a in [(radius*1.15, 0.05), (radius*1.05, 0.1)]:
        glow = Circle(center, r, facecolor=color, alpha=a, edgecolor='none', zorder=1)
        ax.add_patch(glow)
    
    space = Circle(center, radius, facecolor=color, alpha=0.15, edgecolor=color, linewidth=2.5, zorder=2)
    ax.add_patch(space)
    
    # Internal grid (polar)
    for r in np.linspace(0.2, radius-0.2, 3):
        circle = Circle(center, r, facecolor='none', edgecolor=color, alpha=0.2, linewidth=0.8, zorder=2)
        ax.add_patch(circle)
    for theta in np.linspace(0, np.pi, 4):
        x = center[0] + radius * np.cos(theta)
        y = center[1] + radius * np.sin(theta)
        ax.plot([center[0], x], [center[1], y], color=color, alpha=0.2, linewidth=0.8, zorder=2)
    
    ax.text(center[0], center[1] - radius - 0.4, label, color=color, fontsize=16, 
            fontweight='bold', ha='center', va='top', zorder=10,
            path_effects=[pe.withStroke(linewidth=3, foreground=BG_COLOR)])

def draw_vector(ax, start, end, color, label=None, lw=2.5):
    """Draws a vector with an arrowhead."""
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    ax.annotate('', xy=end, xytext=start,
                arrowprops=dict(arrowstyle='-|>', color=color, lw=lw,
                                mutation_scale=20),
                zorder=5)
    if label:
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2
        ax.text(mid_x + 0.15, mid_y + 0.15, label, color=color, fontsize=12, 
                fontweight='bold', zorder=6,
                path_effects=[pe.withStroke(linewidth=2, foreground=BG_COLOR)])

def draw_operator_arc(ax, center, radius, color, label, start_angle=20, end_angle=110):
    """Draws an arc to represent an operator acting on a space."""
    arc = Arc(center, radius*1.8, radius*1.8, angle=0,
              theta1=start_angle, theta2=end_angle,
              color=color, linewidth=2.5, zorder=4)
    ax.add_patch(arc)
    
    # Arrowhead at the end of the arc
    angle_rad = np.radians(end_angle)
    end_x = center[0] + (radius*0.9) * np.cos(angle_rad)
    end_y = center[1] + (radius*0.9) * np.sin(angle_rad)
    ax.annotate('', xy=(end_x, end_y), xytext=(end_x-0.01, end_y-0.01),
                arrowprops=dict(arrowstyle='-|>', color=color, lw=2.5),
                zorder=4)
    
    label_angle = np.radians((start_angle + end_angle) / 2)
    label_x = center[0] + (radius*1.1) * np.cos(label_angle)
    label_y = center[1] + (radius*1.1) * np.sin(label_angle)
    ax.text(label_x, label_y, label, color=color, fontsize=14, fontweight='bold',
            ha='center', va='center', zorder=6,
            path_effects=[pe.withStroke(linewidth=2, foreground=BG_COLOR)])

# --- Geometry Definitions ---
U_center = (3, 5.5)
V_center = (7.5, 5.5)
space_radius = 1.8

# Vectors in U
u_start = U_center
u_end = (U_center[0] + 1.2, U_center[1] + 1.0)
Au_start = U_center
Au_end = (U_center[0] - 1.2, U_center[1] + 1.0)

# Vectors in V (for isomorphism case)
v_start = V_center
v_end = (V_center[0] + 1.2, V_center[1] + 1.0)
Bv_start = V_center
Bv_end = (V_center[0] - 1.2, V_center[1] + 1.0)

# ==========================================
# LEFT PANEL: Scenario (a) ϕ = 0
# ==========================================
ax1.set_title("(a) Trivial Intertwiner:  ϕ = 0", color=TEXT_COLOR, fontsize=18, fontweight='bold', pad=20)

draw_vector_space(ax1, U_center, space_radius, U_COLOR, "U")
draw_vector_space(ax1, V_center, space_radius, V_COLOR, "V")

# Operators
draw_operator_arc(ax1, U_center, space_radius, U_COLOR, "A$_α$", 20, 110)
draw_operator_arc(ax1, V_center, space_radius, V_COLOR, "B$_α$", 20, 110)

# Vectors in U
draw_vector(ax1, u_start, u_end, VEC_COLOR, "u", lw=2.5)
draw_vector(ax1, Au_start, Au_end, TRANS_COLOR, "A$_α$u", lw=2.5)

# Zero vector in V
ax1.plot(*V_center, 'o', color=VEC_COLOR, markersize=8, zorder=5)
ax1.text(V_center[0]+0.2, V_center[1]+0.2, "0", color=VEC_COLOR, fontsize=14, fontweight='bold')

# ϕ mapping to zero
ax1.annotate('', xy=V_center, xytext=(u_end[0], u_end[1]),
             arrowprops=dict(arrowstyle='->', color=PHI_ZERO_COLOR, lw=2.5, 
                             connectionstyle="arc3,rad=0.2", linestyle='--'),
             zorder=3)
ax1.annotate('', xy=V_center, xytext=(Au_end[0], Au_end[1]),
             arrowprops=dict(arrowstyle='->', color=PHI_ZERO_COLOR, lw=2.5, 
                             connectionstyle="arc3,rad=-0.2", linestyle='--'),
             zorder=3)

ax1.text(5.25, 6.5, "ϕ", color=PHI_ZERO_COLOR, fontsize=16, fontweight='bold', ha='center',
         path_effects=[pe.withStroke(linewidth=2, foreground=BG_COLOR)])

# Annotation box
txt_a = "All vectors in U map to the zero vector in V.\nNo information is preserved."
ax1.text(5, 1.5, txt_a, color=SUBTEXT_COLOR, fontsize=11, ha='center', va='center',
         bbox=dict(boxstyle="round,pad=0.8", facecolor=BG_COLOR, edgecolor=PHI_ZERO_COLOR, linewidth=1.5))

# ==========================================
# RIGHT PANEL: Scenario (b) ϕ is an isomorphism
# ==========================================
ax2.set_title("(b) Isomorphism:  ϕ is invertible, dim(U) = dim(V)", color=TEXT_COLOR, fontsize=18, fontweight='bold', pad=20)

draw_vector_space(ax2, U_center, space_radius, U_COLOR, "U")
draw_vector_space(ax2, V_center, space_radius, V_COLOR, "V")

# Operators
draw_operator_arc(ax2, U_center, space_radius, U_COLOR, "A$_α$", 20, 110)
draw_operator_arc(ax2, V_center, space_radius, V_COLOR, "B$_α$", 20, 110)

# Vectors in U
draw_vector(ax2, u_start, u_end, VEC_COLOR, "u", lw=2.5)
draw_vector(ax2, Au_start, Au_end, TRANS_COLOR, "A$_α$u", lw=2.5)

# Vectors in V
draw_vector(ax2, v_start, v_end, VEC_COLOR, "v = ϕ(u)", lw=2.5)
draw_vector(ax2, Bv_start, Bv_end, TRANS_COLOR, "B$_α$v = ϕ(A$_α$u)", lw=2.5)

# ϕ mapping (Isomorphism)
ax2.annotate('', xy=v_end, xytext=u_end,
             arrowprops=dict(arrowstyle='->', color=PHI_ISO_COLOR, lw=3, 
                             connectionstyle="arc3,rad=0.2"),
             zorder=3)
ax2.annotate('', xy=Bv_end, xytext=Au_end,
             arrowprops=dict(arrowstyle='->', color=PHI_ISO_COLOR, lw=3, 
                             connectionstyle="arc3,rad=-0.2"),
             zorder=3)

# ϕ^-1 mapping (dashed)
ax2.annotate('', xy=u_start, xytext=v_start,
             arrowprops=dict(arrowstyle='->', color=PHI_ISO_COLOR, lw=2, 
                             connectionstyle="arc3,rad=0.3", linestyle=':'),
             zorder=3)

ax2.text(5.25, 6.8, "ϕ", color=PHI_ISO_COLOR, fontsize=16, fontweight='bold', ha='center',
         path_effects=[pe.withStroke(linewidth=2, foreground=BG_COLOR)])
ax2.text(5.25, 4.2, "ϕ$^{-1}$", color=PHI_ISO_COLOR, fontsize=14, fontweight='bold', ha='center',
         path_effects=[pe.withStroke(linewidth=2, foreground=BG_COLOR)])

# Annotation box
txt_b = "ϕ maps u to v, and A$_α$u to B$_α$v.\nThe representations are equivalent (conjugate)."
ax2.text(5, 1.5, txt_b, color=SUBTEXT_COLOR, fontsize=11, ha='center', va='center',
         bbox=dict(boxstyle="round,pad=0.8", facecolor=BG_COLOR, edgecolor=PHI_ISO_COLOR, linewidth=1.5))

# --- Main Title and Footer ---
fig.text(0.5, 0.95, "Schur’s Lemma: Irreducible Representations & Intertwining Operators", 
         color=TEXT_COLOR, fontsize=22, fontweight='bold', ha='center')

fig.text(0.5, 0.05, "Given: A$_α$: U→U, B$_α$: V→V act irreducibly.  ϕ: U→V such that  ϕA$_α$ = B$_α$ϕ  for all α.", 
         color=SUBTEXT_COLOR, fontsize=13, ha='center', style='italic')

plt.subplots_adjust(left=0.02, right=0.98, top=0.88, bottom=0.08, wspace=0.1)
plt.show()