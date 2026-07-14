import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle
import matplotlib.patheffects as pe

# ═══════════════════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════════════════
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 11

fig, ax = plt.subplots(figsize=(16, 13), dpi=200)
ax.set_xlim(0, 16)
ax.set_ylim(0, 13)
ax.axis('off')
fig.patch.set_facecolor('#0a0e27')
ax.set_facecolor('#0a0e27')

# Subtle background grid
for i in range(17):
    ax.axvline(x=i, color='#0d1230', linewidth=0.5, zorder=0, alpha=0.4)
for i in range(14):
    ax.axhline(y=i, color='#0d1230', linewidth=0.5, zorder=0, alpha=0.4)

# Color palette
C_PANEL = '#161b3d'
C_PANEL_BORDER = '#2a3160'
C_DAG = '#ff6b9d'       # pink — conjugate transpose
C_D = '#4ecdc4'         # cyan — original matrix
C_I = '#ffd93d'         # gold — identity
C_TEXT = '#e8eaf0'
C_DIM = '#8892b0'
C_ACCENT = '#a78bfa'    # purple
C_HI = '#ff9f43'        # orange highlight
C_GREEN = '#51cf66'

# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════
def panel(x, y, w, h, title=None):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.03",
                       facecolor=C_PANEL, edgecolor=C_PANEL_BORDER,
                       linewidth=1.5, zorder=1)
    ax.add_patch(p)
    if title:
        ax.text(x + 0.3, y + h - 0.3, title, ha='left', va='top',
                fontsize=12, fontweight='bold', color=C_ACCENT, zorder=3)

def cell(x, y, s, label, fc, ec, tc, fs=9, alpha=0.9, lw=1.0):
    c = Rectangle((x, y), s, s, facecolor=fc, edgecolor=ec,
                  linewidth=lw, alpha=alpha, zorder=2)
    ax.add_patch(c)
    if label:
        ax.text(x + s/2, y + s/2, label, ha='center', va='center',
                fontsize=fs, color=tc, fontweight='bold', zorder=3)

def txt(x, y, s, **kw):
    kw.setdefault('color', C_TEXT)
    kw.setdefault('fontsize', 11)
    kw.setdefault('ha', 'center')
    kw.setdefault('va', 'center')
    kw.setdefault('zorder', 4)
    ax.text(x, y, s, **kw)

def brackets(x, y, w, h, color, lw=2.0):
    """Draw decorative matrix brackets."""
    b = 0.12
    # Left bracket
    ax.plot([x, x], [y - b, y + h + b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')
    ax.plot([x, x + 0.1], [y + h + b, y + h + b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')
    ax.plot([x, x + 0.1], [y - b, y - b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')
    # Right bracket
    ax.plot([x + w, x + w], [y - b, y + h + b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')
    ax.plot([x + w, x + w - 0.1], [y + h + b, y + h + b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')
    ax.plot([x + w, x + w - 0.1], [y - b, y - b], color=color, linewidth=lw, zorder=3, solid_capstyle='round')

# ═══════════════════════════════════════════════════════
# TITLE
# ═══════════════════════════════════════════════════════
txt(8, 12.55, 'Unitary Matrix Derivation', fontsize=24, fontweight='bold',
    path_effects=[pe.withStroke(linewidth=3, foreground='#a78bfa22')])
txt(8, 12.05, 'From Invariant Inner Product  →  D†(g) D(g) = I  →  D⁻¹(g) = D†(g)',
    fontsize=13, color=C_ACCENT, style='italic')

# ═══════════════════════════════════════════════════════
# PANEL 1: Matrix Multiplication — The (k,j)-th Element
# ═══════════════════════════════════════════════════════
panel(0.5, 8.3, 15, 3.3, '①  Matrix Multiplication — The (k,j)-th Element')

cs = 0.58  # cell size
m1x, m1y = 2.2, 9.15
mat_w = 3 * cs

# D†(g) — conjugate transpose matrix
dag = [['D*₁₁','D*₂₁','D*₃₁'],
       ['D*₁₂','D*₂₂','D*₃₂'],
       ['D*₁₃','D*₂₃','D*₃₃']]
for i in range(3):
    for j in range(3):
        hi = (i == 1)  # highlight row k
        cell(m1x + j*cs, m1y + (2-i)*cs, cs, dag[i][j],
             C_DAG if hi else '#2a1a2e',
             C_DAG if hi else '#3a2a3e',
             '#fff' if hi else C_DAG,
             fs=7.5, alpha=0.95 if hi else 0.3, lw=2.5 if hi else 0.8)
brackets(m1x, m1y, mat_w, mat_w, C_DAG, lw=2.0)
txt(m1x + mat_w/2, m1y - 0.3, 'D†(g)', fontsize=13, color=C_DAG, fontweight='bold')
txt(m1x + mat_w/2, m1y + mat_w + 0.2, 'row k', fontsize=8, color=C_HI, fontweight='bold')

# Multiply sign
txt(m1x + mat_w + 0.45, m1y + mat_w/2, '×', fontsize=18, color=C_DIM)

# D(g) — original matrix
m2x = m1x + mat_w + 0.9
d = [['D₁₁','D₁₂','D₁₃'],
     ['D₂₁','D₂₂','D₂₃'],
     ['D₃₁','D₃₂','D₃₃']]
for i in range(3):
    for j in range(3):
        hi = (j == 1)  # highlight col j
        cell(m2x + j*cs, m1y + (2-i)*cs, cs, d[i][j],
             C_D if hi else '#1a2e2e',
             C_D if hi else '#2a3e3e',
             '#fff' if hi else C_D,
             fs=7.5, alpha=0.95 if hi else 0.3, lw=2.5 if hi else 0.8)
brackets(m2x, m1y, mat_w, mat_w, C_D, lw=2.0)
txt(m2x + mat_w/2, m1y - 0.3, 'D(g)', fontsize=13, color=C_D, fontweight='bold')
txt(m2x + mat_w/2, m1y + mat_w + 0.2, 'col j', fontsize=8, color=C_HI, fontweight='bold')

# Equals sign
txt(m2x + mat_w + 0.45, m1y + mat_w/2, '=', fontsize=18, color=C_DIM)

# I — identity matrix
m3x = m2x + mat_w + 0.9
for i in range(3):
    for j in range(3):
        diag = (i == j)
        hi = (i == 1 and j == 1)
        if hi:
            cell(m3x + j*cs, m1y + (2-i)*cs, cs, '1',
                 C_I, C_I, '#000', fs=9, alpha=0.95, lw=2.5)
        elif diag:
            cell(m3x + j*cs, m1y + (2-i)*cs, cs, '1',
                 '#3a3a1e', C_I, C_I, fs=9, alpha=0.45, lw=1.0)
        else:
            cell(m3x + j*cs, m1y + (2-i)*cs, cs, '0',
                 '#1a1a2e', '#2a2a3e', C_DIM, fs=9, alpha=0.25, lw=0.8)
brackets(m3x, m1y, mat_w, mat_w, C_I, lw=2.0)
txt(m3x + mat_w/2, m1y - 0.3, 'I', fontsize=13, color=C_I, fontweight='bold')
txt(m3x + mat_w/2, m1y + mat_w + 0.2, 'δ_kj', fontsize=8, color=C_HI, fontweight='bold')

# Bottom annotation
txt(8, 8.55,
    'Σᵢ [D†(g)]_ki · D_ij(g)  =  δ_kj     ←  (k,j)-th element of D†D  =  (k,j)-th element of I',
    fontsize=10.5, color=C_HI, fontweight='bold')

# Gap label between panels
txt(8, 8.05, '↓  expand to matrix elements  ↓', fontsize=8, color=C_DIM, style='italic')

# ═══════════════════════════════════════════════════════
# PANEL 2: Element-wise Reduction
# ═══════════════════════════════════════════════════════
panel(0.5, 4.3, 15, 3.5, '②  Element-wise Reduction — From Inner Product to Matrix Elements')

steps = [
    ('Invariance + Orthonormality',
     '⟨ D(g) e_k ,  D(g) e_j ⟩  =  ⟨ e_k , e_j ⟩  =  δ_kj',
     C_GREEN, 'starting point'),
    ('Expand: Sesquilinearity',
     'Σᵢ Σₗ  D*ᵢₖ(g) · Dₗⱼ(g) · ⟨ eᵢ , eₗ ⟩  =  δ_kj',
     C_D, 'pull out scalars'),
    ('Collapse: ⟨eᵢ, eₗ⟩ = δᵢₗ',
     'Σᵢ  D*ᵢₖ(g) · Dᵢⱼ(g)  =  δ_kj',
     C_ACCENT, 'force l = i'),
    ('Recognize: [D†]_ki = [D_ik]*',
     'Σᵢ  [D†(g)]_ki · Dᵢⱼ(g)  =  δ_kj   ⟹   D†(g) D(g) = I',
     C_I, 'UNITARY!'),
]

for idx, (title, formula, color, note) in enumerate(steps):
    sy = 7.2 - idx * 0.68
    sb = FancyBboxPatch((1.0, sy - 0.22), 14, 0.5,
                        boxstyle="round,pad=0.02",
                        facecolor='#1a2040', edgecolor=color,
                        linewidth=1.5, alpha=0.5, zorder=2)
    ax.add_patch(sb)
    circ = Circle((1.35, sy), 0.14, facecolor=color, edgecolor='none', zorder=3)
    ax.add_patch(circ)
    txt(1.35, sy, str(idx + 1), fontsize=8, color='#000', fontweight='bold')
    txt(1.65, sy, title, ha='left', fontsize=8.5, color=color, fontweight='bold')
    txt(8.3, sy, formula, ha='center', fontsize=10, color=C_TEXT, fontweight='bold')
    txt(14.7, sy, note, ha='right', fontsize=8, color=C_HI, style='italic')
    if idx < 3:
        txt(8, sy - 0.4, '↓', fontsize=11, color=C_DIM)

# Gap label
txt(8, 4.15, '↓  three operations become one  ↓', fontsize=8, color=C_DIM, style='italic')

# ═══════════════════════════════════════════════════════
# PANEL 3: The Unitary Equivalence
# ═══════════════════════════════════════════════════════
panel(0.5, 0.3, 15, 3.7, '③  The Unitary Equivalence — Three Operations, One Result')

box_w, box_h, box_y = 3.8, 2.2, 1.25

boxes_data = [
    (2.2, 'D(g⁻¹)', C_GREEN, 'Group Inverse',
     'g · g⁻¹ = e\nD(g)·D(g⁻¹) = D(e) = I\nhomomorphism preserves\ninverse structure'),
    (6.5, 'D⁻¹(g)', C_D, 'Matrix Inverse',
     'D⁻¹(g) · D(g) = I\nstandard definition of\nmatrix inverse —\nleft inverse exists'),
    (10.8, 'D†(g)', C_DAG, 'Conjugate Transpose',
     '[D†(g)]_ij = [D_ji(g)]*\nflip across diagonal +\ntake complex conjugate\nof every element'),
]

for bx, expr, color, title, desc in boxes_data:
    b = FancyBboxPatch((bx, box_y), box_w, box_h,
                       boxstyle="round,pad=0.05",
                       facecolor='#1a2040', edgecolor=color,
                       linewidth=2.5, zorder=2)
    ax.add_patch(b)
    # Title bar
    tb = Rectangle((bx + 0.05, box_y + box_h - 0.45), box_w - 0.1, 0.4,
                   facecolor=color, edgecolor='none', alpha=0.15, zorder=2)
    ax.add_patch(tb)
    txt(bx + box_w/2, box_y + box_h - 0.25, title, fontsize=10, color=color, fontweight='bold')
    txt(bx + box_w/2, box_y + box_h - 0.8, expr, fontsize=22, color=C_TEXT, fontweight='bold')
    txt(bx + box_w/2, box_y + 0.55, desc, fontsize=8, color=C_DIM, ha='center', linespacing=1.5)

# Equals signs
txt(6.15, box_y + box_h/2, '=', fontsize=28, color=C_HI, fontweight='bold')
txt(10.45, box_y + box_h/2, '=', fontsize=28, color=C_HI, fontweight='bold')

# Conclusion bar
concl = FancyBboxPatch((2.2, 0.55), 12.4, 0.5,
                       boxstyle="round,pad=0.03",
                       facecolor=C_HI, edgecolor=C_HI,
                       alpha=0.12, linewidth=1.5, zorder=2)
ax.add_patch(concl)
txt(8.4, 0.8,
    '∴  D(g) is UNITARY  —  its inverse equals its conjugate transpose:  D⁻¹(g) = D†(g)',
    fontsize=11, color=C_HI, fontweight='bold')

# ═══════════════════════════════════════════════════════
# SAVE & DISPLAY
# ═══════════════════════════════════════════════════════
plt.savefig('unitary_matrix_derivation.png', dpi=200, bbox_inches='tight',
            facecolor='#0a0e27', edgecolor='none', pad_inches=0.3)
plt.show()