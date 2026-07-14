import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Arc, Circle
import numpy as np
from matplotlib.gridspec import GridSpec

# === Configuration ===
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

# === Color Palette ===
BG = '#f5f2eb'
PANEL_BG = '#fdfcf8'
GRID_COLOR = '#e8e4da'
AXIS_COLOR = '#c8c4ba'
TEXT_DARK = '#2b2b2b'
TEXT_MED = '#666666'
TEXT_LIGHT = '#999999'
X_COLOR = '#c44536'
Y_COLOR = '#2e6f95'
ACCENT = '#e8a838'
ACCENT_DARK = '#b8821e'
BORDER = '#d0ccc0'
DARK_BG = '#1e1e1e'
DARK_TEXT = '#f0ede5'

# === Group D4 (order 8) with non-orthogonal conjugated representation ===
def rot(t):
    c, s = np.cos(t), np.sin(t)
    return np.array([[c, -s], [s, c]])

P = np.array([[1.3, 0.2], [0.15, 1.0]])
Pinv = np.linalg.inv(P)

raw = [
    ('e',    np.eye(2),                        'identity'),
    ('r',    rot(np.pi/2),                     'rotate 90°'),
    ('r²',   rot(np.pi),                       'rotate 180°'),
    ('r³',   rot(3*np.pi/2),                   'rotate 270°'),
    ('s',    np.diag([1.0, -1.0]),             'reflect x-axis'),
    ('sr',   np.array([[0,1],[1,0]],float),    'reflect y=x'),
    ('sr²',  np.diag([-1.0, 1.0]),             'reflect y-axis'),
    ('sr³',  np.array([[0,-1],[-1,0]],float),  'reflect y=-x'),
]

elements = [(n, P @ m @ Pinv, d, i < 4) for i, (n, m, d) in enumerate(raw)]

# === Original vectors ===
x_orig = np.array([1.0, 0.4])
y_orig = np.array([0.3, 0.9])

# === Compute all transformed inner products ===
results = []
all_vecs = []
for name, mat, desc, is_rot in elements:
    Dx = mat @ x_orig
    Dy = mat @ y_orig
    ip = float(np.dot(Dx, Dy))
    results.append((name, mat, desc, Dx, Dy, ip, is_rot))
    all_vecs.extend([Dx, Dy])

total_sum = sum(r[5] for r in results)
avg = total_sum / len(elements)
orig_ip = float(np.dot(x_orig, y_orig))

max_c = max(max(abs(v[0]), abs(v[1])) for v in all_vecs)
lim = max_c * 1.35

# === Figure ===
fig = plt.figure(figsize=(18, 15), facecolor=BG)

# Title
fig.text(0.5, 0.965, 'Group-Averaged Inner Product', fontsize=26,
         fontweight='bold', color=TEXT_DARK, ha='center')
fig.text(0.5, 0.935, 'Averaging over G transforms any inner product into a G-invariant one',
         fontsize=13, color=TEXT_MED, ha='center', style='italic')

# Formula banner
ax_f = fig.add_axes([0.06, 0.872, 0.88, 0.045])
ax_f.set_xlim(0, 1)
ax_f.set_ylim(0, 1)
ax_f.axis('off')
ax_f.add_patch(FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0.03",
                               facecolor=DARK_BG, edgecolor=ACCENT, linewidth=2))
ax_f.text(0.5, 0.5,
          '⟨x, y⟩  =  (1 / |G|)  ·  Σ_{g∈G}  ( D(g)x ,  D(g)y )',
          fontsize=17, color=DARK_TEXT, ha='center', va='center', fontweight='bold')

# === 2×4 grid of group element panels ===
gs = GridSpec(2, 4, figure=fig,
              left=0.045, right=0.955, top=0.84, bottom=0.24,
              wspace=0.07, hspace=0.30)

for idx, (name, mat, desc, Dx, Dy, ip, is_rot) in enumerate(results):
    row, col = divmod(idx, 4)
    ax = fig.add_subplot(gs[row, col])
    ax.set_facecolor(PANEL_BG)
    ax.set_aspect('equal')
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)

    # Grid lines
    step = lim / 3
    for g in np.arange(-lim, lim + 0.01, step):
        ax.axhline(g, color=GRID_COLOR, lw=0.5, zorder=0)
        ax.axvline(g, color=GRID_COLOR, lw=0.5, zorder=0)

    # Axes
    ax.axhline(0, color=AXIS_COLOR, lw=1.2, zorder=1)
    ax.axvline(0, color=AXIS_COLOR, lw=1.2, zorder=1)

    # Unit circle
    ax.add_patch(Circle((0, 0), 1, fill=False, edgecolor=GRID_COLOR,
                        lw=1, ls='--', zorder=1))

    # Angle arc between Dx and Dy
    ang_x = np.arctan2(Dx[1], Dx[0])
    ang_y = np.arctan2(Dy[1], Dy[0])
    diff = ang_y - ang_x
    if diff > np.pi:
        diff -= 2 * np.pi
    elif diff < -np.pi:
        diff += 2 * np.pi
    if abs(diff) > 0.05:
        ax.add_patch(Arc((0, 0), 0.6, 0.6, angle=0,
                         theta1=np.degrees(ang_x),
                         theta2=np.degrees(ang_x + diff),
                         color=ACCENT, lw=2.5, zorder=4))

    # Vector arrows
    akw = dict(arrowstyle='-|>', mutation_scale=16, lw=2.8)
    ax.annotate('', xy=Dx, xytext=(0, 0), arrowprops={**akw, 'color': X_COLOR})
    ax.annotate('', xy=Dy, xytext=(0, 0), arrowprops={**akw, 'color': Y_COLOR})

    # Vector labels with background boxes
    lo = 1.22
    lx, ly = Dx * lo, Dy * lo
    ax.text(lx[0], lx[1], f'D({name})x', fontsize=7.5, color=X_COLOR,
            fontweight='bold', ha='center', va='center', zorder=5,
            bbox=dict(boxstyle='round,pad=0.12', facecolor='white',
                      edgecolor=X_COLOR, lw=0.8, alpha=0.92))
    ax.text(ly[0], ly[1], f'D({name})y', fontsize=7.5, color=Y_COLOR,
            fontweight='bold', ha='center', va='center', zorder=5,
            bbox=dict(boxstyle='round,pad=0.12', facecolor='white',
                      edgecolor=Y_COLOR, lw=0.8, alpha=0.92))

    # Panel title (color-coded: blue=rotation, red=reflection)
    tcol = '#4a7fa8' if is_rot else '#a8504a'
    ax.set_title(f'g = {name}', fontsize=13, fontweight='bold',
                 color=tcol, pad=10)
    ax.text(0.5, 1.04, desc, transform=ax.transAxes, fontsize=8,
            color=TEXT_MED, ha='center', va='bottom', style='italic')

    # Inner product value box
    ipb = FancyBboxPatch((0.05, -0.01), 0.9, 0.10,
                          boxstyle="round,pad=0.02", facecolor=ACCENT,
                          edgecolor=ACCENT_DARK, lw=1.2, alpha=0.95,
                          transform=ax.transAxes, zorder=6)
    ax.add_patch(ipb)
    ax.text(0.5, 0.04, f'(D(g)x, D(g)y) = {ip:+.3f}',
            transform=ax.transAxes, fontsize=8.5, fontweight='bold',
            color=TEXT_DARK, ha='center', va='center', zorder=7)

    ax.set_xticks([])
    ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_edgecolor(BORDER)
        sp.set_linewidth(1.5)

# === Bottom summary panel ===
ax_s = fig.add_axes([0.045, 0.02, 0.91, 0.19])
ax_s.set_xlim(0, 1)
ax_s.set_ylim(0, 1)
ax_s.axis('off')
ax_s.add_patch(FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0.02",
                               facecolor=DARK_BG, edgecolor=ACCENT, lw=2))

# Column 1: Setup
ax_s.text(0.02, 0.88, 'SETUP', fontsize=10, color=ACCENT,
          fontweight='bold', transform=ax_s.transAxes)
ax_s.text(0.02, 0.72, 'G = D4  (order 8)', fontsize=10,
          color=DARK_TEXT, transform=ax_s.transAxes)
ax_s.text(0.02, 0.58, 'D = P · D_std · P⁻¹  (non-orthogonal)', fontsize=9,
          color=DARK_TEXT, transform=ax_s.transAxes)
ax_s.text(0.02, 0.40, f'x = ({x_orig[0]:.1f}, {x_orig[1]:.1f})',
          fontsize=10, color=X_COLOR, transform=ax_s.transAxes, fontweight='bold')
ax_s.text(0.02, 0.26, f'y = ({y_orig[0]:.1f}, {y_orig[1]:.1f})',
          fontsize=10, color=Y_COLOR, transform=ax_s.transAxes, fontweight='bold')
ax_s.text(0.02, 0.08, f'(x, y) = {orig_ip:.3f}  ← NOT G-invariant',
          fontsize=9, color='#e07070', transform=ax_s.transAxes, fontweight='bold')

ax_s.plot([0.30, 0.30], [0.05, 0.95], color='#444', lw=1, transform=ax_s.transAxes)

# Column 2: Summation
ax_s.text(0.32, 0.88, 'SUMMATION  over g ∈ G', fontsize=10, color=ACCENT,
          fontweight='bold', transform=ax_s.transAxes)
t1 = '  +  '.join(f'{results[i][5]:+.3f}' for i in range(4))
t2 = '  +  '.join(f'{results[i][5]:+.3f}' for i in range(4, 8))
ax_s.text(0.32, 0.70, t1, fontsize=8.5, color=DARK_TEXT,
          transform=ax_s.transAxes, family='monospace')
ax_s.text(0.32, 0.58, t2, fontsize=8.5, color=DARK_TEXT,
          transform=ax_s.transAxes, family='monospace')
ax_s.text(0.32, 0.40, f'Sum = {total_sum:.3f}', fontsize=14,
          color=ACCENT, transform=ax_s.transAxes, fontweight='bold')
ax_s.text(0.32, 0.22, f'÷ |G| = {len(elements)}', fontsize=11,
          color=DARK_TEXT, transform=ax_s.transAxes)

ax_s.plot([0.62, 0.62], [0.05, 0.95], color='#444', lw=1, transform=ax_s.transAxes)

# Column 3: Result
ax_s.text(0.64, 0.88, 'G-INVARIANT RESULT', fontsize=10, color=ACCENT,
          fontweight='bold', transform=ax_s.transAxes)
ax_s.text(0.64, 0.62, '⟨x, y⟩ =', fontsize=16, color=DARK_TEXT,
          transform=ax_s.transAxes, fontweight='bold')
ax_s.text(0.64, 0.32, f'{avg:.4f}', fontsize=28, color=ACCENT,
          transform=ax_s.transAxes, fontweight='bold')
ax_s.text(0.64, 0.08, 'G-invariant:  ⟨D(g)x, D(g)y⟩ = ⟨x, y⟩  ∀g',
          fontsize=8.5, color='#88cc88', transform=ax_s.transAxes, style='italic')

plt.savefig('group_averaged_inner_product.png', dpi=200,
            facecolor=BG, bbox_inches='tight', pad_inches=0.3)
plt.show()