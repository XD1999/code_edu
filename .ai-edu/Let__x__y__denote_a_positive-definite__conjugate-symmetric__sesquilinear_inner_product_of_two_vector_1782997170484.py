import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Rectangle
import numpy as np
from matplotlib.gridspec import GridSpec

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.linewidth'] = 1.5

# ── Palette ──
BG = '#0d1224'
PANEL = '#161d33'
PANEL_BORDER = '#2a3458'
X_COLOR = '#ff5e87'       # pink-red for x
Y_COLOR = '#5ee0ff'       # cyan for y
GOLD = '#ffd166'          # gold for results / sesquilinear
GREEN = '#7ee787'         # green for positive-definite
PURPLE = '#c77dff'        # purple for conjugate
TEXT = '#e8ecf4'
SUBTLE = '#8b95b0'
GRID = '#1f2740'

fig = plt.figure(figsize=(16, 11), facecolor=BG, dpi=150)
gs = GridSpec(2, 3, figure=fig, height_ratios=[1.35, 1],
              hspace=0.34, wspace=0.22,
              left=0.035, right=0.965, top=0.91, bottom=0.04)

fig.text(0.5, 0.965, 'Sesquilinear Inner Product  (x, y)  on  V',
         ha='center', va='top', fontsize=22, fontweight='bold', color=TEXT)
fig.text(0.5, 0.928, 'positive-definite   ·   conjugate-symmetric   ·   sesquilinear',
         ha='center', va='top', fontsize=13, color=SUBTLE, style='italic')

def style_panel(ax, title, badge_color):
    ax.set_facecolor(PANEL)
    for spine in ax.spines.values():
        spine.set_color(PANEL_BORDER)
        spine.set_linewidth(1.5)
    ax.text(0.02, 0.965, title, transform=ax.transAxes, ha='left', va='top',
            color='#0d1224', fontsize=11.5, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.4', facecolor=badge_color, edgecolor='none', alpha=0.9))

def draw_grid(ax, lim=5):
    for i in range(-lim, lim + 1):
        ax.axhline(i, color=GRID, linewidth=0.5, zorder=0)
        ax.axvline(i, color=GRID, linewidth=0.5, zorder=0)
    ax.axhline(0, color='#3a4470', linewidth=1.2, zorder=1)
    ax.axvline(0, color='#3a4470', linewidth=1.2, zorder=1)

def draw_vector(ax, start, end, color, label=None, lw=3,
                label_offset=(0.15, 0.15), fontsize=15):
    ax.annotate('', xy=end, xytext=start,
                arrowprops=dict(arrowstyle='-|>', color=color, lw=lw,
                                mutation_scale=22))
    if label:
        ax.text(end[0] + label_offset[0], end[1] + label_offset[1], label,
                color=color, fontsize=fontsize, fontweight='bold')

# ═══════════════════════════════════════════
# MAIN PANEL — two vectors x, y in V
# ═══════════════════════════════════════════
ax_main = fig.add_subplot(gs[0, :])
style_panel(ax_main,
            '  V : complex inner product space    ·    x, y ∈ V    ·    (x, y) ∈ ℂ  ',
            GOLD)
draw_grid(ax_main, 5)

x_vec = np.array([3.4, 1.6])
y_vec = np.array([1.1, 3.1])
draw_vector(ax_main, (0, 0), x_vec, X_COLOR, 'x', lw=3.5)
draw_vector(ax_main, (0, 0), y_vec, Y_COLOR, 'y', lw=3.5)
ax_main.plot(0, 0, 'o', color=TEXT, markersize=6, zorder=5)

# Angle arc θ
ang_x = np.degrees(np.arctan2(x_vec[1], x_vec[0]))
ang_y = np.degrees(np.arctan2(y_vec[1], y_vec[0]))
arc = Arc((0, 0), 1.4, 1.4, angle=0,
          theta1=min(ang_x, ang_y), theta2=max(ang_x, ang_y),
          color=GOLD, linewidth=2.5, zorder=3)
ax_main.add_patch(arc)
mid = np.radians((ang_x + ang_y) / 2)
ax_main.text(0.95 * np.cos(mid), 0.95 * np.sin(mid), 'θ',
             color=GOLD, fontsize=14, fontweight='bold')

# Projection of x onto y (geometric meaning of Re⟨x,y⟩)
y_u = y_vec / np.linalg.norm(y_vec)
proj = np.dot(x_vec, y_u) * y_u
ax_main.plot([0, proj[0]], [0, proj[1]], '-',
             color=GOLD, linewidth=2, alpha=0.45, zorder=2)
ax_main.plot([x_vec[0], proj[0]], [x_vec[1], proj[1]], '--',
             color=GOLD, linewidth=1.5, alpha=0.85, zorder=3)
ax_main.text(proj[0] - 0.65, proj[1] - 0.3, 'proj_y x',
             color=GOLD, fontsize=10, style='italic', alpha=0.9)

# Result callout
ax_main.text(0.985, 0.93, '(x, y)  =  ⟨x, y⟩  ∈  ℂ',
             transform=ax_main.transAxes, ha='right', va='top',
             color=GOLD, fontsize=14, fontweight='bold',
             bbox=dict(boxstyle='round,pad=0.5', facecolor='#2a2438',
                       edgecolor=GOLD, linewidth=1.5))

ax_main.set_xlim(-1, 5)
ax_main.set_ylim(-1, 4.5)
ax_main.set_aspect('equal')
ax_main.set_xticks([])
ax_main.set_yticks([])

# ═══════════════════════════════════════════
# ① POSITIVE-DEFINITE
# ═══════════════════════════════════════════
ax_pd = fig.add_subplot(gs[1, 0])
style_panel(ax_pd, ' ①  Positive-definite  ', GREEN)
draw_grid(ax_pd, 4)

x2 = np.array([2.6, 1.3])
draw_vector(ax_pd, (0, 0), x2, X_COLOR, 'x', lw=3)
ax_pd.plot(0, 0, 'o', color=TEXT, markersize=5, zorder=5)
norm_sq = float(np.dot(x2, x2))

# Component guides
ax_pd.plot([0, x2[0]], [0, 0], '-', color=X_COLOR, linewidth=1, alpha=0.35)
ax_pd.plot([x2[0], x2[0]], [0, x2[1]], '-', color=X_COLOR, linewidth=1, alpha=0.35)

# Positive-value bar
bar_w = norm_sq / 2.2
ax_pd.add_patch(Rectangle((0, -1.4), bar_w, 0.55,
                           facecolor=GREEN, alpha=0.8,
                           edgecolor=GREEN, linewidth=1.5))
ax_pd.text(bar_w / 2, -1.12, f'(x,x) = ‖x‖² = {norm_sq:.2f}',
           ha='center', va='center', color='#0d1224',
           fontsize=9.5, fontweight='bold')

ax_pd.text(0.5, 3.4, '(x, x) ≥ 0   for all x',
           ha='center', color=GREEN, fontsize=12, fontweight='bold')
ax_pd.text(0.5, 2.95, '(x, x) = 0  ⟺  x = 0',
           ha='center', color=SUBTLE, fontsize=10, style='italic')

ax_pd.set_xlim(-1, 4)
ax_pd.set_ylim(-2, 4)
ax_pd.set_aspect('equal')
ax_pd.set_xticks([])
ax_pd.set_yticks([])

# ═══════════════════════════════════════════
# ② CONJUGATE-SYMMETRIC
# ═══════════════════════════════════════════
ax_cs = fig.add_subplot(gs[1, 1])
style_panel(ax_cs, ' ②  Conjugate-symmetric  ', PURPLE)
draw_grid(ax_cs, 4)

ax_cs.text(3.6, -0.35, 'Re', color=SUBTLE, fontsize=10, style='italic')
ax_cs.text(-0.35, 3.5, 'Im', color=SUBTLE, fontsize=10, style='italic')

# (x,y) and (y,x) as conjugate points in ℂ
p1 = np.array([2.0, 1.5])   # (x,y) = 2 + 1.5i
p2 = np.array([2.0, -1.5])  # (y,x) = 2 - 1.5i

ax_cs.plot([0, p1[0]], [0, p1[1]], '-', color=Y_COLOR, linewidth=2, alpha=0.6)
ax_cs.plot(p1[0], p1[1], 'o', color=Y_COLOR, markersize=12, zorder=4,
           markeredgecolor='#0d1224', markeredgewidth=1.5)
ax_cs.text(p1[0] + 0.2, p1[1] + 0.15, '(x, y)', color=Y_COLOR,
           fontsize=12, fontweight='bold')

ax_cs.plot([0, p2[0]], [0, p2[1]], '-', color=X_COLOR, linewidth=2, alpha=0.6)
ax_cs.plot(p2[0], p2[1], 'o', color=X_COLOR, markersize=12, zorder=4,
           markeredgecolor='#0d1224', markeredgewidth=1.5)
ax_cs.text(p2[0] + 0.2, p2[1] - 0.4, '(y, x)', color=X_COLOR,
           fontsize=12, fontweight='bold')

# Mirror line
ax_cs.plot([p1[0], p2[0]], [p1[1], p2[1]], '--',
           color=PURPLE, linewidth=1.8, alpha=0.85)
ax_cs.annotate('conjugate\nmirror', xy=(2.0, 0), xytext=(2.8, 0),
               color=PURPLE, fontsize=9, va='center', style='italic',
               arrowprops=dict(arrowstyle='->', color=PURPLE, lw=1.2))

ax_cs.text(0.5, 3.4, '(x, y) = (y, x)*',
           ha='center', color=PURPLE, fontsize=13, fontweight='bold')
ax_cs.text(0.5, 2.95, '=  conjugate of (y, x)',
           ha='center', color=SUBTLE, fontsize=10, style='italic')

ax_cs.set_xlim(-1, 4)
ax_cs.set_ylim(-2.5, 4)
ax_cs.set_aspect('equal')
ax_cs.set_xticks([])
ax_cs.set_yticks([])

# ═══════════════════════════════════════════
# ③ SESQUILINEAR
# ═══════════════════════════════════════════
ax_sl = fig.add_subplot(gs[1, 2])
style_panel(ax_sl, ' ③  Sesquilinear  ', GOLD)
ax_sl.set_facecolor(PANEL)
for spine in ax_sl.spines.values():
    spine.set_color(PANEL_BORDER)
    spine.set_linewidth(1.5)

# ── Top: linear in 1st argument ──
ax_sl.text(2.0, 3.55, '(αx, y) = α·(x, y)',
           ha='center', color=GOLD, fontsize=11, fontweight='bold')
ax_sl.text(2.0, 3.15, 'linear in 1st argument',
           ha='center', color=SUBTLE, fontsize=9, style='italic')

origin1 = (0, 1.5)
x_s = np.array([0.7, 0.4])
alpha = 2.0
draw_vector(ax_sl, origin1, (x_s[0], x_s[1] + 1.5),
            X_COLOR, 'x', lw=2.5, label_offset=(0.1, 0.05), fontsize=11)
draw_vector(ax_sl, origin1, (x_s[0] * alpha, x_s[1] * alpha + 1.5),
            '#ff8fb1', 'αx', lw=2.5, label_offset=(0.1, 0.05), fontsize=11)
ax_sl.plot(0, 1.5, 'o', color=TEXT, markersize=5, zorder=5)

# Divider
ax_sl.plot([0.3, 3.7], [0.9, 0.9], '-',
           color=PANEL_BORDER, linewidth=1, alpha=0.6)

# ── Bottom: conjugate-linear in 2nd argument ──
ax_sl.text(2.0, 0.55, '(x, αy) = α*·(x, y)',
           ha='center', color=PURPLE, fontsize=11, fontweight='bold')
ax_sl.text(2.0, 0.15, 'conj-linear in 2nd argument',
           ha='center', color=SUBTLE, fontsize=9, style='italic')

origin2 = (0, -1.8)
y_s = np.array([0.4, 0.8])
draw_vector(ax_sl, origin2, (y_s[0], y_s[1] - 1.8),
            Y_COLOR, 'y', lw=2.5, label_offset=(0.1, 0.05), fontsize=11)
draw_vector(ax_sl, origin2, (y_s[0] * alpha, y_s[1] * alpha - 1.8),
            '#8fe7ff', 'αy', lw=2.5, label_offset=(0.1, 0.05), fontsize=11)
ax_sl.plot(0, -1.8, 'o', color=TEXT, markersize=5, zorder=5)

ax_sl.text(2.0, -1.9, '"sesqui-" = one-and-a-half',
           ha='center', color=SUBTLE, fontsize=8.5, style='italic')

ax_sl.set_xlim(-0.5, 4)
ax_sl.set_ylim(-2.2, 4)
ax_sl.set_aspect('equal')
ax_sl.set_xticks([])
ax_sl.set_yticks([])

plt.savefig('inner_product.png', dpi=150, facecolor=BG, bbox_inches='tight')
plt.show()