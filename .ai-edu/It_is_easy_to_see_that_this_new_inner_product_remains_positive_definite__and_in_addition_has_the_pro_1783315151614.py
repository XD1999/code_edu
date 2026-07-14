import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from matplotlib.lines import Line2D
import matplotlib.patheffects as pe

# ===== COLORS (dark theme) =====
BG       = '#0d1117'
PANEL_BG = '#161b22'
EDGE     = '#30363d'
GRID     = '#1c232e'
TEXT     = '#e6edf3'
DIM      = '#8b949e'
BLUE     = '#58a6ff'
ORANGE   = '#f0883e'
GREEN    = '#7ee787'
PURPLE   = '#d2a8ff'
RED      = '#ff7b72'
YELLOW   = '#e3b341'
CYAN     = '#39d0d8'

# ===== DATA =====
D_a = np.array([[1, 1], [0, -1]], float)
M   = np.array([[1, 0.5], [0.5, 1.5]], float)
e1  = np.array([1, 0], float)
e2  = np.array([0, 1], float)
assert np.allclose(D_a.T @ M @ D_a, M), "D(a)^T M D(a) != M"

# ===== HELPERS =====
def draw_vec(ax, origin, vec, color, label, lo=(0.08, 0.08), lw=2.5, fs=12, z=5):
    arrow = FancyArrowPatch(origin, origin + vec, arrowstyle='-|>',
                            mutation_scale=14, color=color, lw=lw, zorder=z,
                            capstyle='round', joinstyle='round')
    ax.add_patch(arrow)
    ax.text(origin[0] + vec[0] + lo[0], origin[1] + vec[1] + lo[1], label,
            color=color, fontsize=fs, fontweight='bold', zorder=z + 1,
            path_effects=[pe.withStroke(linewidth=3, foreground=BG)])

def metric_ellipse(metric, n=300):
    w, V = np.linalg.eigh(metric)
    t = np.linspace(0, 2 * np.pi, n)
    u = np.vstack([np.cos(t), np.sin(t)])
    return V @ np.diag(1 / np.sqrt(w)) @ u

# ===== FIGURE =====
fig = plt.figure(figsize=(18, 11), facecolor=BG)
gs = fig.add_gridspec(3, 2, height_ratios=[0.55, 4.0, 1.5],
                      hspace=0.10, wspace=0.07,
                      left=0.03, right=0.97, top=0.97, bottom=0.02)

# --- Title bar ---
ax_t = fig.add_subplot(gs[0, :])
ax_t.set_facecolor(BG); ax_t.axis('off')
ax_t.text(0.5, 0.72, 'Averaging Inner Products Over a Finite Group',
          ha='center', va='center', fontsize=24, fontweight='bold', color=TEXT,
          transform=ax_t.transAxes)
ax_t.text(0.5, 0.12,
          '\u27e8x, y\u27e9  =  (1/|G|) \u03a3 (D(g)x, D(g)y)     \u21d2     \u27e8D(g)x, D(g)y\u27e9  =  \u27e8x, y\u27e9',
          ha='center', va='center', fontsize=15, color=CYAN,
          transform=ax_t.transAxes)

# --- Left Panel: Standard Inner Product ---
axL = fig.add_subplot(gs[1, 0], facecolor=PANEL_BG)
axL.set_aspect('equal')
LIM = 2.3
axL.set_xlim(-LIM, LIM); axL.set_ylim(-LIM, LIM)
for i in range(-3, 4):
    axL.axhline(i, color=GRID, lw=0.5, zorder=0)
    axL.axvline(i, color=GRID, lw=0.5, zorder=0)

t = np.linspace(0, 2 * np.pi, 300)
circ = np.vstack([np.cos(t), np.sin(t)])
axL.plot(circ[0], circ[1], color=BLUE, lw=3, zorder=3, solid_capstyle='round')
da_circ = D_a @ circ
axL.plot(da_circ[0], da_circ[1], color=ORANGE, lw=3, ls='--', zorder=4,
         solid_capstyle='round')

draw_vec(axL, [0, 0], e1, BLUE, 'e\u2081', lo=(0.05, 0.12))
draw_vec(axL, [0, 0], e2, BLUE, 'e\u2082', lo=(0.12, 0.03))
da_e1, da_e2 = D_a @ e1, D_a @ e2
draw_vec(axL, [0, 0], da_e1, ORANGE, 'D(a)e\u2081', lo=(0.05, -0.28))
draw_vec(axL, [0, 0], da_e2, ORANGE, 'D(a)e\u2082', lo=(0.05, -0.28))

axL.text(0.5, 1.07, 'Standard Inner Product  (\u00b7, \u00b7)',
         ha='center', va='bottom', fontsize=15, fontweight='bold', color=TEXT,
         transform=axL.transAxes)
axL.text(0.5, 1.01, 'D(a) distorts the unit circle  \u2192  NOT orthogonal',
         ha='center', va='bottom', fontsize=11, color=RED, fontstyle='italic',
         transform=axL.transAxes)

axL.annotate('(D(a)e\u2081, D(a)e\u2082) = 1   \u2260   0 = (e\u2081, e\u2082)',
             xy=(0.5, -0.5), xytext=(0.8, -1.9), fontsize=10.5, color=RED,
             fontweight='bold',
             arrowprops=dict(arrowstyle='->', color=RED, lw=1.5,
                             connectionstyle='arc3,rad=0.2'),
             bbox=dict(boxstyle='round,pad=0.35', facecolor='#1a1015',
                       edgecolor=RED, alpha=0.95))

legL = [Line2D([0], [0], color=BLUE, lw=3, label='Unit circle  { x : (x,x)=1 }'),
        Line2D([0], [0], color=ORANGE, lw=3, ls='--', label='D(a) image')]
axL.legend(handles=legL, loc='lower left', fontsize=9.5,
           facecolor=PANEL_BG, edgecolor=EDGE, labelcolor=TEXT, framealpha=0.9)
axL.set_xticks([]); axL.set_yticks([])
for s in axL.spines.values():
    s.set_edgecolor(EDGE); s.set_linewidth(1.5)

# --- Right Panel: New Averaged Inner Product ---
axR = fig.add_subplot(gs[1, 1], facecolor=PANEL_BG)
axR.set_aspect('equal')
axR.set_xlim(-LIM, LIM); axR.set_ylim(-LIM, LIM)
for i in range(-3, 4):
    axR.axhline(i, color=GRID, lw=0.5, zorder=0)
    axR.axvline(i, color=GRID, lw=0.5, zorder=0)

ell = metric_ellipse(M)
axR.plot(ell[0], ell[1], color=GREEN, lw=3, zorder=3, solid_capstyle='round')
da_ell = D_a @ ell
axR.plot(da_ell[0], da_ell[1], color=PURPLE, lw=2.5, ls='--', zorder=4,
         alpha=0.9, solid_capstyle='round')

# Reflection axis (D(a) is a reflection in the new metric, fixing span(e1))
axR.plot([-LIM, LIM], [0, 0], color=YELLOW, lw=1.5, ls=':', alpha=0.35, zorder=1)
axR.text(LIM - 0.1, 0.12, 'reflection axis', color=YELLOW, fontsize=8, alpha=0.6,
         va='bottom', ha='right')

draw_vec(axR, [0, 0], e1, GREEN, 'e\u2081', lo=(0.05, 0.12))
draw_vec(axR, [0, 0], e2, GREEN, 'e\u2082', lo=(0.12, 0.03))
draw_vec(axR, [0, 0], da_e1, PURPLE, 'D(a)e\u2081', lo=(0.05, -0.28))
draw_vec(axR, [0, 0], da_e2, PURPLE, 'D(a)e\u2082', lo=(0.05, -0.28))

axR.text(0.5, 1.07, 'New Averaged Inner Product  \u27e8\u00b7, \u00b7\u27e9',
         ha='center', va='bottom', fontsize=15, fontweight='bold', color=TEXT,
         transform=axR.transAxes)
axR.text(0.5, 1.01, 'D(a) preserves the unit ellipse  \u2192  IS orthogonal',
         ha='center', va='bottom', fontsize=11, color=GREEN, fontstyle='italic',
         transform=axR.transAxes)

axR.annotate('\u27e8D(a)e\u2081, D(a)e\u2082\u27e9 = \u27e8e\u2081, e\u2082\u27e9 = \u00bd',
             xy=(0.5, -0.5), xytext=(0.8, -1.9), fontsize=10.5, color=GREEN,
             fontweight='bold',
             arrowprops=dict(arrowstyle='->', color=GREEN, lw=1.5,
                             connectionstyle='arc3,rad=0.2'),
             bbox=dict(boxstyle='round,pad=0.35', facecolor='#0d1a10',
                       edgecolor=GREEN, alpha=0.95))

axR.annotate('Perfect\noverlap!',
             xy=(0.4, 0.63), xytext=(1.6, 1.5), fontsize=11, color=PURPLE,
             fontweight='bold', ha='center',
             arrowprops=dict(arrowstyle='->', color=PURPLE, lw=2),
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#15101a',
                       edgecolor=PURPLE, alpha=0.95))

# Positive definite note
axR.text(0.98, 0.02, 'M positive definite\n\u2192 closed ellipse',
         transform=axR.transAxes, fontsize=9, color=DIM, ha='right', va='bottom',
         fontstyle='italic',
         bbox=dict(boxstyle='round,pad=0.3', facecolor=PANEL_BG, edgecolor=EDGE,
                   alpha=0.8))

legR = [Line2D([0], [0], color=GREEN, lw=3, label='New ellipse  { x : \u27e8x,x\u27e9=1 }'),
        Line2D([0], [0], color=PURPLE, lw=2.5, ls='--', label='D(a) image')]
axR.legend(handles=legR, loc='lower left', fontsize=9.5,
           facecolor=PANEL_BG, edgecolor=EDGE, labelcolor=TEXT, framealpha=0.9)
axR.set_xticks([]); axR.set_yticks([])
for s in axR.spines.values():
    s.set_edgecolor(EDGE); s.set_linewidth(1.5)

# --- Bottom Panel: Computation ---
axB = fig.add_subplot(gs[2, :])
axB.set_facecolor(PANEL_BG); axB.axis('off')
axB.set_xlim(0, 1); axB.set_ylim(0, 1)

rect = FancyBboxPatch((0.01, 0.02), 0.98, 0.96, boxstyle="round,pad=0.015",
                       facecolor=PANEL_BG, edgecolor=EDGE, lw=1.5,
                       transform=axB.transAxes, zorder=0)
axB.add_patch(rect)

axB.text(0.5, 0.90,
         'Step-by-Step Computation     G = {e, a},    D(a) = [[1, 1], [0, -1]],    x = e\u2081,    y = e\u2082',
         ha='center', va='top', fontsize=13, fontweight='bold', color=TEXT,
         transform=axB.transAxes)

steps_x = [0.07, 0.35, 0.63]
steps = [
    ('Step 1:  g = e', '(D(e)e\u2081, D(e)e\u2082)\n  = (e\u2081, e\u2082) = 0', BLUE, '#0d1520'),
    ('Step 2:  g = a', '(D(a)e\u2081, D(a)e\u2082)\n  = (1,0)\u00b7(1,-1) = 1', ORANGE, '#1a1208'),
    ('Step 3:  Average', '\u27e8e\u2081, e\u2082\u27e9\n  = \u00bd(0 + 1) = \u00bd', GREEN, '#0d1a10'),
]

for i, (label, formula, color, bg) in enumerate(steps):
    x = steps_x[i]
    axB.text(x + 0.115, 0.65, label, ha='center', va='center', fontsize=11.5,
             color=color, fontweight='bold', transform=axB.transAxes)
    fbox = FancyBboxPatch((x, 0.18), 0.23, 0.32, boxstyle="round,pad=0.02",
                           facecolor=bg, edgecolor=color, lw=1.5, alpha=0.95,
                           transform=axB.transAxes)
    axB.add_patch(fbox)
    axB.text(x + 0.115, 0.34, formula, ha='center', va='center', fontsize=11,
             color=TEXT, transform=axB.transAxes, family='monospace')

for i in range(2):
    xs = steps_x[i] + 0.24
    xe = steps_x[i + 1] - 0.01
    axB.annotate('', xy=(xe, 0.34), xytext=(xs, 0.34),
                 xycoords='axes fraction',
                 arrowprops=dict(arrowstyle='->', color=DIM, lw=2))

axB.text(0.5, 0.07,
         '\u2713  Verify:  D(a)\u1d40 M D(a) = M     where     M = [[1, \u00bd], [\u00bd, 3/2]]',
         ha='center', va='center', fontsize=12, color=GREEN, fontweight='bold',
         transform=axB.transAxes,
         bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a1f12',
                   edgecolor=GREEN, alpha=0.9))

plt.savefig('inner_product_averaging.png', dpi=200, facecolor=BG, bbox_inches='tight')
plt.show()