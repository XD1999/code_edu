import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Arc
import numpy as np

# ============================================================
#  GLOBAL STYLE
# ============================================================
plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'mathtext.fontset': 'dejavusans',
    'axes.unicode_minus': False,
})

BG       = '#0e1320'
PANEL    = '#161c2e'
INK      = '#e8ecf4'
SUBINK   = '#9aa3bd'
DIM      = '#5a6485'
ACCENT_G = '#5fd4a8'   # green   — group inverse
ACCENT_B = '#5db4f5'   # blue    — matrix inverse
ACCENT_P = '#c79cf0'   # purple  — conjugate transpose
ACCENT_O = '#f5a35d'   # orange  — complex conjugate
ACCENT_Y = '#f0d264'   # yellow  — transpose
GOLD     = '#f5c842'

fig = plt.figure(figsize=(20, 13), facecolor=BG)
ax  = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 20); ax.set_ylim(0, 13)
ax.axis('off'); ax.set_facecolor(BG)

# ============================================================
#  HELPERS
# ============================================================
def rrect(x, y, w, h, fc, ec, lw=1.5, a=1.0, r=0.10):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle=f"round,pad=0.02,rounding_size={r}",
                       fc=fc, ec=ec, lw=lw, alpha=a, zorder=2)
    ax.add_patch(p); return p

def panel(x, y, w, h, title, tc=INK):
    rrect(x, y, w, h, PANEL, '#2a3454', lw=1.5, r=0.12)
    ax.text(x + w/2, y + h - 0.32, title, ha='center', va='top',
            fontsize=12.5, fontweight='bold', color=tc, zorder=5)

def cell(cx, cy, w, h, val, fc, ec, tc=INK, fs=15, bold=True):
    r = mpatches.FancyBboxPatch((cx-w/2, cy-h/2), w, h,
                                boxstyle="round,pad=0.005,rounding_size=0.04",
                                fc=fc, ec=ec, lw=1.6, zorder=4)
    ax.add_patch(r)
    ax.text(cx, cy, val, ha='center', va='center',
            fontsize=fs, fontweight='bold' if bold else 'normal',
            color=tc, zorder=5)

def matrix_grid(ox, oy, cw, ch, gap, data, fc, ec, tc=INK, fs=15):
    """data: list of rows (bottom→top).  Draws bottom row first."""
    for ri, row in enumerate(data):
        for ci, v in enumerate(row):
            cx = ox + ci*(cw+gap) + cw/2
            cy = oy + ri*(ch+gap) + ch/2
            cell(cx, cy, cw, ch, v, fc, ec, tc=tc, fs=fs)

def bracket(ox, oy, cw, ch, gap, n, side='left', color=INK, lw=2.2):
    h = n*ch + (n-1)*gap
    x = ox - 0.16 if side=='left' else ox + n*cw + (n-1)*gap + 0.16
    s = 1 if side=='left' else -1
    ax.plot([x, x-0.10*s, x-0.10*s, x],
            [oy+h-0.12, oy+h-0.12, oy+0.12, oy+0.12],
            color=color, lw=lw, solid_capstyle='round', zorder=5)

def matrix_label(ox, oy, cw, ch, gap, n, label, color=INK, fs=19):
    h = n*ch + (n-1)*gap
    ax.text(ox - 0.45, oy + h/2, label, ha='right', va='center',
            fontsize=fs, color=color, fontweight='bold', zorder=6)

def curved_arrow(p1, p2, color, rad=0.35, lw=2.6, style='-|>',
                 connectionstyle=None, zorder=3):
    if connectionstyle is None:
        connectionstyle = f"arc3,rad={rad}"
    a = FancyArrowPatch(p1, p2,
                        connectionstyle=connectionstyle,
                        arrowstyle=style, mutation_scale=22,
                        color=color, lw=lw, zorder=zorder,
                        shrinkA=4, shrinkB=4)
    ax.add_patch(a); return a

def op_label(x, y, text, color):
    ax.text(x, y, text, ha='center', va='center', fontsize=12.5,
            color=color, fontweight='bold', zorder=6,
            bbox=dict(boxstyle='round,pad=0.28', fc=BG, ec=color, lw=1.4))

# ============================================================
#  TITLE
# ============================================================
ax.text(10, 12.55, 'Unitary Representation:  Conjugate-Transpose Structure',
        ha='center', va='center', fontsize=23, fontweight='bold', color=INK)
ax.text(10, 12.02,
        r'$D(g^{-1}) \;=\; D^{-1}(g) \;=\; D^{\dagger}(g)$'
        '       where       '
       r'$D^{\dagger}_{ij}(g) \;=\; \left[\,D_{ji}(g)\,\right]^{*}$',
        ha='center', va='center', fontsize=15.5, color=SUBINK)

# ============================================================
#  PANEL A — EQUALITY CHAIN  (top)
# ============================================================
pAx, pAy, pAw, pAh = 1.0, 8.05, 18.0, 3.35
panel(pAx, pAy, pAw, pAh,
      'A.   Equality Chain  —  three faces of one operator')

cw = ch = 0.62; gap = 0.10; n = 3
mH = n*ch + (n-1)*gap
baseY = pAy + 0.55
centersY = baseY + mH/2 + 0.15

# --- D(g)  (original) ---
ox1 = pAx + 1.55
matrix_grid(ox1, baseY, cw, ch, gap,
            [['a','b','c'],['d','e','f'],['g','h','k']],
            '#1f2a44', '#3d4a6e', fs=14)
bracket(ox1, baseY, cw, ch, gap, n, 'left', INK)
matrix_label(ox1, baseY, cw, ch, gap, n, 'D(g)', INK, 19)

# --- D(g⁻¹)  (group inverse) ---
ox2 = pAx + 6.55
matrix_grid(ox2, baseY, cw, ch, gap,
            [['k','h','g'],['f','e','d'],['c','b','a']],
            '#163a2c', '#2f6b50', tc=ACCENT_G, fs=14)
bracket(ox2, baseY, cw, ch, gap, n, 'left', ACCENT_G)
matrix_label(ox2, baseY, cw, ch, gap, n,
             r'D(g$^{-1}$)', ACCENT_G, 19)

# --- D⁻¹(g)  (matrix inverse) ---
ox3 = pAx + 11.55
matrix_grid(ox3, baseY, cw, ch, gap,
            [['k','h','g'],['f','e','d'],['c','b','a']],
            '#1a2f4a', '#3a6398', tc=ACCENT_B, fs=14)
bracket(ox3, baseY, cw, ch, gap, n, 'left', ACCENT_B)
matrix_label(ox3, baseY, cw, ch, gap, n,
             r'D$^{-1}$(g)', ACCENT_B, 19)

# --- D†(g)  (conjugate transpose) ---
ox4 = pAx + 16.55
matrix_grid(ox4, baseY, cw, ch, gap,
            [['k*','h*','g*'],['f*','e*','d*'],['c*','b*','a*']],
            '#2e1f44', '#6b3f98', tc=ACCENT_P, fs=13)
bracket(ox4, baseY, cw, ch, gap, n, 'left', ACCENT_P)
matrix_label(ox4, baseY, cw, ch, gap, n,
             r'D$^{\dagger}$(g)', ACCENT_P, 19)

# --- arrows between blocks ---
yA = centersY + 0.55
curved_arrow((ox1 + n*cw + 0.35, yA), (ox2 - 0.55, yA),
             ACCENT_G, rad=-0.28, lw=2.8)
op_label((ox1+ox2)/2 + n*cw/2, yA + 0.55,
         'group inverse', ACCENT_G)

curved_arrow((ox2 + n*cw + 0.35, yA), (ox3 - 0.55, yA),
             ACCENT_B, rad=-0.28, lw=2.8)
op_label((ox2+ox3)/2 + n*cw/2, yA + 0.55,
         'matrix inverse', ACCENT_B)

curved_arrow((ox3 + n*cw + 0.35, yA), (ox4 - 0.55, yA),
             ACCENT_P, rad=-0.28, lw=2.8)
op_label((ox3+ox4)/2 + n*cw/2, yA + 0.55,
         'conjugate transpose', ACCENT_P)

# --- caption ---
ax.text(pAx + pAw/2, pAy + 0.30,
        'For a unitary representation, the inverse image D(g⁻¹) '
        'coincides with both the matrix inverse D⁻¹(g) and the '
        'conjugate-transpose D†(g).',
        ha='center', va='center', fontsize=11.5, color=SUBINK, style='italic')

# ============================================================
#  PANEL B — CONJUGATE-TRANSPOSE DECOMPOSITION  (bottom-left)
# ============================================================
pBx, pBy, pBw, pBh = 1.0, 0.55, 9.0, 6.95
panel(pBx, pBy, pBw, pBh,
      'B.   Conjugate-Transpose Decomposition   '
      r'$D^{\dagger} \;=\; (\,\cdot\,)^{*} \;\circ\; (\,\cdot\,)^{T}$')

cw2 = ch2 = 0.78; gap2 = 0.14; n2 = 3
mH2 = n2*ch2 + (n2-1)*gap2
bY = pBy + 0.85

# --- D(g) ---
oxB1 = pBx + 1.35
matrix_grid(oxB1, bY, cw2, ch2, gap2,
            [['a','b','c'],['d','e','f'],['g','h','k']],
            '#1f2a44', '#3d4a6e', fs=16)
bracket(oxB1, bY, cw2, ch2, gap2, n2, 'left', INK)
matrix_label(oxB1, bY, cw2, ch2, gap2, n2, 'D(g)', INK, 20)

# --- D^T(g)  (transpose) ---
oxB2 = pBx + 4.55
matrix_grid(oxB2, bY, cw2, ch2, gap2,
            [['a','d','g'],['b','e','h'],['c','f','k']],
            '#3a3214', '#8a7430', tc=ACCENT_Y, fs=16)
bracket(oxB2, bY, cw2, ch2, gap2, n2, 'left', ACCENT_Y)
matrix_label(oxB2, bY, cw2, ch2, gap2, n2,
             r'D$^{T}$(g)', ACCENT_Y, 20)

# --- D†(g)  (conjugate transpose) ---
oxB3 = pBx + 7.75
matrix_grid(oxB3, bY, cw2, ch2, gap2,
            [['a*','d*','g*'],['b*','e*','h*'],['c*','f*','k*']],
            '#2e1f44', '#6b3f98', tc=ACCENT_P, fs=14)
bracket(oxB3, bY, cw2, ch2, gap2, n2, 'left', ACCENT_P)
matrix_label(oxB3, bY, cw2, ch2, gap2, n2,
             r'D$^{\dagger}$(g)', ACCENT_P, 20)

# --- arrows ---
midY = bY + mH2/2
curved_arrow((oxB1 + n2*cw2 + 0.40, midY + 0.55),
             (oxB2 - 0.55, midY + 0.55),
             ACCENT_Y, rad=-0.30, lw=3.0)
op_label((oxB1+oxB2)/2 + n2*cw2/2, midY + 1.15,
         'transpose  (i,j)→(j,i)', ACCENT_Y)

curved_arrow((oxB2 + n2*cw2 + 0.40, midY + 0.55),
             (oxB3 - 0.55, midY + 0.55),
             ACCENT_O, rad=-0.30, lw=3.0)
op_label((oxB2+oxB3)/2 + n2*cw2/2, midY + 1.15,
         'complex conjugate  *', ACCENT_O)

# --- element-level trace arrows (sample) ---
def trace_arrow(p1, p2, color, rad=0.45, lw=1.4, alpha=0.55):
    a = FancyArrowPatch(p1, p2,
                        connectionstyle=f"arc3,rad={rad}",
                        arrowstyle='-|>', mutation_scale=11,
                        color=color, lw=lw, alpha=alpha, zorder=3)
    ax.add_patch(a)

# a (top-left of D)  ->  a (top-left of D^T)
trace_arrow((oxB1 + cw2*0.30, bY + 2*(ch2+gap2) + ch2*0.75),
            (oxB2 + cw2*0.30, bY + 2*(ch2+gap2) + ch2*0.75),
            ACCENT_Y, rad=0.55, lw=1.3, alpha=0.45)
# c (top-right of D) -> c (bottom-left of D^T)
trace_arrow((oxB1 + 2*(cw2+gap2) + cw2*0.70, bY + 2*(ch2+gap2) + ch2*0.25),
            (oxB2 + cw2*0.30, bY + ch2*0.75),
            ACCENT_Y, rad=0.50, lw=1.3, alpha=0.45)
# g (bottom-left of D) -> g (top-right of D^T)
trace_arrow((oxB1 + cw2*0.30, bY + ch2*0.25),
            (oxB2 + 2*(cw2+gap2) + cw2*0.70, bY + 2*(ch2+gap2) + ch2*0.75),
            ACCENT_Y, rad=-0.50, lw=1.3, alpha=0.45)

# e* in D†  <- e in D^T  (conjugate)
trace_arrow((oxB2 + cw2 + gap2 + cw2*0.5, bY + (ch2+gap2) + ch2*0.5),
            (oxB3 + cw2 + gap2 + cw2*0.5, bY + (ch2+gap2) + ch2*0.5),
            ACCENT_O, rad=0.55, lw=1.3, alpha=0.45)
# b* <- b
trace_arrow((oxB2 + cw2*0.5, bY + (ch2+gap2) + ch2*0.5),
            (oxB3 + cw2 + gap2 + cw2*0.5, bY + 2*(ch2+gap2) + ch2*0.5),
            ACCENT_O, rad=0.50, lw=1.3, alpha=0.45)

# --- caption ---
ax.text(pBx + pBw/2, pBy + 0.32,
        'Step 1:  transpose rows↔columns.     '
        'Step 2:  conjugate every entry.',
        ha='center', va='center', fontsize=11.5, color=SUBINK, style='italic')

# ============================================================
#  PANEL C — ORTHONORMAL BASIS CHANGE  (bottom-right)
# ============================================================
pCx, pCy, pCw, pCh = 10.25, 0.55, 8.75, 6.95
panel(pCx, pCy, pCw, pCh,
      'C.   Orthonormal Basis Change  →  Unitarity')

# --- old basis (skewed, non-orthogonal) ---
o1 = (pCx + 1.7, pCy + 2.05)
o2 = (pCx + 3.95, pCy + 3.55)
o3 = (pCx + 2.55, pCy + 5.35)
ax.plot([o1[0], o2[0]], [o1[1], o2[1]], color='#d65f5f', lw=3.2, zorder=4,
        solid_capstyle='round')
ax.plot([o1[0], o3[0]], [o1[1], o3[1]], color='#5fd4a8', lw=3.2, zorder=4,
        solid_capstyle='round')
ax.plot([o2[0], o3[0]], [o2[1], o3[1]], color='#5db4f5', lw=3.2, zorder=4,
        solid_capstyle='round')
for pt, lab in [(o1,'e₁'), (o2,'e₂'), (o3,'e₃')]:
    ax.plot(*pt, 'o', color=INK, ms=9, zorder=6,
            markeredgecolor=BG, markeredgewidth=1.5)
    ax.text(pt[0]+0.18, pt[1]+0.18, lab, color=INK, fontsize=14,
            fontweight='bold', zorder=6)
ax.text(pCx + 2.7, pCy + 1.35, 'Old basis',
        ha='center', fontsize=12.5, color=SUBINK, fontweight='bold')
ax.text(pCx + 2.7, pCy + 1.02, '(non-orthogonal)',
        ha='center', fontsize=10.5, color=DIM, style='italic')

# --- new basis (orthonormal) ---
n1 = (pCx + 5.95, pCy + 2.05)
n2 = (pCx + 7.75, pCy + 2.05)
n3 = (pCx + 5.95, pCy + 4.55)
ax.plot([n1[0], n2[0]], [n1[1], n2[1]], color='#d65f5f', lw=3.2, zorder=4,
        solid_capstyle='round')
ax.plot([n1[0], n3[0]], [n1[1], n3[1]], color='#5fd4a8', lw=3.2, zorder=4,
        solid_capstyle='round')
ax.plot([n2[0], n3[0]], [n2[1], n3[1]], color='#5db4f5', lw=3.2, zorder=4,
        solid_capstyle='round')
# right-angle marker at n1
ra = 0.22
ax.plot([n1[0]+ra, n1[0]+ra, n1[0]],
        [n1[1], n1[1]+ra, n1[1]+ra],
        color=GOLD, lw=1.8, zorder=5)
for pt, lab in [(n1,'ê₁'), (n2,'ê₂'), (n3,'ê₃')]:
    ax.plot(*pt, 'o', color=INK, ms=9, zorder=6,
            markeredgecolor=BG, markeredgewidth=1.5)
    ax.text(pt[0]+0.18, pt[1]+0.18, lab, color=INK, fontsize=14,
            fontweight='bold', zorder=6)
ax.text(pCx + 6.85, pCy + 1.35, 'New basis',
        ha='center', fontsize=12.5, color=SUBINK, fontweight='bold')
ax.text(pCx + 6.85, pCy + 1.02, '(orthonormal)',
        ha='center', fontsize=10.5, color=GOLD, style='italic')

# --- transformation arrow ---
curved_arrow((pCx + 4.35, pCy + 3.55),
             (pCx + 5.55, pCy + 3.30),
             GOLD, rad=-0.30, lw=3.2)
ax.text(pCx + 4.95, pCy + 4.05, 'change of\n    basis',
        ha='center', va='bottom', fontsize=11.5, color=GOLD,
        fontweight='bold', zorder=6)

# --- inner-product condition box ---
box_x = pCx + 0.45; box_y = pCy + 5.75
box_w = pCw - 0.9;  box_h = 0.95
rrect(box_x, box_y, box_w, box_h, '#1a2338', '#3a4868', lw=1.5, r=0.10)
ax.text(box_x + box_w/2, box_y + box_h - 0.22,
        'Orthonormality condition  (new inner product ⟨·,·⟩′):',
        ha='center', va='top', fontsize=11.5, color=INK, fontweight='bold')
ax.text(box_x + box_w/2, box_y + 0.22,
        r'$\langle\,\hat{e}_i\,,\;\hat{e}_j\,\rangle^{\prime} \;=\; \delta_{ij}$'
        '          ⟹          '
        r'$D^{\dagger}(g)\,D(g) \;=\; \mathbf{I}$',
        ha='center', va='center', fontsize=13, color=GOLD)

# --- caption ---
ax.text(pCx + pCw/2, pCy + 0.32,
        'In the orthonormal basis the representation matrices '
        'satisfy  D†D = I,  i.e. they are unitary.',
        ha='center', va='center', fontsize=11.5, color=SUBINK, style='italic')

# ============================================================
#  LEGEND  (bottom strip, spans full width)
# ============================================================
leg_y = 0.08
items = [
    (ACCENT_G, 'group inverse  D(g⁻¹)'),
    (ACCENT_B, 'matrix inverse  D⁻¹(g)'),
    (ACCENT_P, 'conjugate-transpose  D†(g)'),
    (ACCENT_Y, 'transpose  (·)ᵀ'),
    (ACCENT_O, 'complex conjugate  (·)*'),
    (GOLD,     'orthonormal basis / unitarity'),
]
seg = 20.0 / len(items)
for i, (c, lab) in enumerate(items):
    cx = i*seg + seg/2
    ax.plot([cx-0.32, cx-0.10], [leg_y, leg_y], color=c, lw=3.5,
            solid_capstyle='round', zorder=5)
    ax.text(cx+0.0, leg_y, lab, ha='left', va='center',
            fontsize=10.5, color=SUBINK, zorder=5)

# ============================================================
#  RENDER
# ============================================================
plt.savefig('unitary_representation_diagram.png',
            dpi=200, facecolor=BG, bbox_inches='tight', pad_inches=0.15)
plt.show()
