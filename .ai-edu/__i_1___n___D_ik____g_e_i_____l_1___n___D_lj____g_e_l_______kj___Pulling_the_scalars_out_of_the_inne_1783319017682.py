import matplotlib
matplotlib.rcParams['mathtext.fontset'] = 'cm'
matplotlib.rcParams['font.family'] = 'sans-serif'
matplotlib.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import numpy as np

# ═══════════════════════════════════════════════════
#  PALETTE
# ═══════════════════════════════════════════════════
BG       = '#F7F4EE'
INK      = '#1B1B2E'
INK_SOFT = '#4A4A6A'
RED      = '#C73E3A'    # conjugated / 1st argument
TEAL     = '#2A9D8F'    # linear / 2nd argument
ORANGE   = '#E8843C'    # basis / inner product
PURPLE   = '#6A4C93'    # delta / identity
GOLD     = '#C9A227'    # accents
BOX_BG   = '#FFFFFF'
BORDER   = '#D8D3C8'
SHADOW   = '#E5E0D5'

# ═══════════════════════════════════════════════════
#  FIGURE
# ═══════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(18, 24), dpi=200)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 100)
ax.set_ylim(0, 150)
ax.axis('off')

# Background texture: scattered dots
np.random.seed(42)
for _ in range(350):
    x, y = np.random.uniform(0, 100), np.random.uniform(0, 150)
    s = np.random.uniform(0.3, 1.8)
    ax.plot(x, y, '.', color='#E0DCD0', markersize=s, alpha=0.35)

# Faint background inner-product symbol
ax.text(50, 72, r'$\langle\,\cdot\,,\;\cdot\,\rangle$', fontsize=170,
        color='#E8E4D8', ha='center', va='center', alpha=0.12, zorder=0)

# ═══════════════════════════════════════════════════
#  TITLE
# ═══════════════════════════════════════════════════
ax.text(50, 145.5, 'Pulling Scalars Out of the Inner Product',
        fontsize=28, fontweight='bold', color=INK, ha='center', va='center')
ax.text(50, 141, 'Sesquilinearity  ·  Orthonormality  ·  The Unitary Condition',
        fontsize=15, color=INK_SOFT, ha='center', va='center', style='italic')
ax.plot([28, 72], [138.5, 138.5], color=GOLD, linewidth=2.5, solid_capstyle='round')

# ═══════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════
def stage_box(cx, cy, w, h, num, title, color):
    x, y = cx - w / 2, cy - h / 2
    # Drop shadow
    ax.add_patch(FancyBboxPatch((x + 0.4, y - 0.4), w, h,
        boxstyle="round,pad=0,rounding_size=1.0",
        facecolor=SHADOW, edgecolor='none', alpha=0.5, zorder=1))
    # Main panel
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0,rounding_size=1.0",
        facecolor=BOX_BG, edgecolor=BORDER, linewidth=1.5, zorder=2))
    # Coloured left accent bar
    ax.add_patch(FancyBboxPatch((x, y + 0.6), 1.0, h - 1.2,
        boxstyle="round,pad=0,rounding_size=0.5",
        facecolor=color, edgecolor='none', zorder=3))
    # Step-number circle
    ax.add_patch(Circle((x + 3.8, y + h - 3.2), 2.0,
        facecolor=color, edgecolor='none', zorder=4))
    ax.text(x + 3.8, y + h - 3.2, str(num), fontsize=14, fontweight='bold',
            color='white', ha='center', va='center', zorder=5)
    # Step title
    ax.text(x + 7.2, y + h - 3.2, title, fontsize=13, fontweight='bold',
            color=INK_SOFT, ha='left', va='center', zorder=5)

def flow_arrow(y_top, y_bot, color=INK_SOFT, label=None):
    ax.add_patch(FancyArrowPatch((50, y_top), (50, y_bot),
        arrowstyle='-|>', mutation_scale=18,
        color=color, linewidth=2.5, zorder=3))
    if label:
        ax.text(52.5, (y_top + y_bot) / 2, label, fontsize=9.5,
                color=INK_SOFT, ha='left', va='center', style='italic')

# ═══════════════════════════════════════════════════
#  STAGE 1 — Starting Point
# ═══════════════════════════════════════════════════
stage_box(50, 128, 82, 15, 1,
          'Starting Point — Vectors in the Inner Product', INK)
ax.text(50, 126,
    r'$\left\langle\;\sum_{i=1}^{n} D_{ik}(g)\,e_i\;,\;\sum_{l=1}^{n} D_{lj}(g)\,e_l\;\right\rangle \;=\; \delta_{kj}$',
    fontsize=22, color=INK, ha='center', va='center', zorder=5)
ax.text(50, 122,
    'Two basis-expanded images  D(g)e_k  and  D(g)e_j  inside the invariant inner product',
    fontsize=10.5, color=INK_SOFT, ha='center', va='center', style='italic')

# ═══════════════════════════════════════════════════
#  STAGE 2 — Sesquilinearity  (KEY STEP)
# ═══════════════════════════════════════════════════
stage_box(50, 105, 82, 17, 2,
          'Sesquilinearity — Pull Scalars Out  (conjugate the first)', RED)

# KEY-STEP badge
ax.add_patch(FancyBboxPatch((81, 110.5), 9, 4,
    boxstyle="round,pad=0,rounding_size=0.5",
    facecolor=GOLD, edgecolor='none', zorder=5))
ax.text(85.5, 112.5, 'KEY STEP', fontsize=8, fontweight='bold',
        color='white', ha='center', va='center', zorder=6)

ax.text(50, 103.5,
    r'$\sum_{i=1}^{n}\sum_{l=1}^{n}\;D_{ik}(g)^{*}\;\;D_{lj}(g)\;\;\langle e_i,\,e_l\rangle \;=\; \delta_{kj}$',
    fontsize=22, color=INK, ha='center', va='center', zorder=5)

# Colour-coded chips beneath the equation
chip_y = 98.5
for cx, c, label in [(15, RED,    'conjugated  (1st arg)'),
                      (40, TEAL,   'unchanged   (2nd arg)'),
                      (65, ORANGE, 'basis pair  ⟨eᵢ, eₗ⟩')]:
    ax.add_patch(FancyBboxPatch((cx, chip_y - 0.8), 2.5, 1.6,
        boxstyle="round,pad=0,rounding_size=0.3",
        facecolor=c, edgecolor='none', zorder=4))
    ax.text(cx + 3.2, chip_y, label, fontsize=9.5,
            color=INK_SOFT, ha='left', va='center')

# ═══════════════════════════════════════════════════
#  STAGE 3 — Orthonormality Collapse
# ═══════════════════════════════════════════════════
stage_box(50, 80, 82, 15, 3,
          'Orthonormality — Collapse the Double Sum', ORANGE)
ax.text(50, 78,
    r'$\sum_{i=1}^{n}\;D_{ik}(g)^{*}\;D_{ij}(g)\;=\;\delta_{kj}$',
    fontsize=24, color=INK, ha='center', va='center', zorder=5)
ax.text(50, 74,
    r'$\langle e_i, e_l\rangle = \delta_{il}\;$  forces  $\;l = i$,  collapsing  $\;\sum_i\sum_l \;\longrightarrow\; \sum_i$',
    fontsize=11.5, color=INK_SOFT, ha='center', va='center')

# ═══════════════════════════════════════════════════
#  STAGE 4 — Unitary Condition
# ═══════════════════════════════════════════════════
stage_box(50, 57, 82, 15, 4,
          'Reassembly — The Unitary Condition', PURPLE)
ax.text(50, 55,
    r'$\bigl[\,D^{\dagger}(g)\;D(g)\,\bigr]_{kj}\;=\;\delta_{kj}\quad\Longrightarrow\quad D^{\dagger}(g)\,D(g)\;=\;I$',
    fontsize=20, color=INK, ha='center', va='center', zorder=5)
ax.text(50, 51,
    r'$[D^{\dagger}]_{ki} = [D_{ik}]^{*}$   →   conjugate-transpose  ×  original  =  identity',
    fontsize=10.5, color=INK_SOFT, ha='center', va='center', style='italic')

# ═══════════════════════════════════════════════════
#  FLOW ARROWS
# ═══════════════════════════════════════════════════
flow_arrow(120, 114, RED,    'expand')
flow_arrow(96,  88,  ORANGE, 'apply δ_il')
flow_arrow(72,  65,  PURPLE, 'recognize D†')

# ═══════════════════════════════════════════════════
#  BOTTOM-LEFT — Colour Legend
# ═══════════════════════════════════════════════════
ax.add_patch(FancyBboxPatch((6, 10), 40, 30,
    boxstyle="round,pad=0,rounding_size=1.0",
    facecolor=BOX_BG, edgecolor=BORDER, linewidth=1.5, zorder=2))
ax.text(26, 37, 'Colour Legend', fontsize=14, fontweight='bold',
        color=INK, ha='center')

legend_items = [
    (RED,    'Conjugated scalar',  'From 1st argument — conjugate-linear'),
    (TEAL,   'Linear scalar',      'From 2nd argument — linear'),
    (ORANGE, 'Basis / inner prod', 'Orthonormal vectors  e_i'),
    (PURPLE, 'Kronecker delta',    'Result: δ_kj  or  identity  I'),
]
for i, (c, t, d) in enumerate(legend_items):
    ly = 33 - i * 5.5
    ax.add_patch(FancyBboxPatch((9, ly - 1), 3, 2,
        boxstyle="round,pad=0,rounding_size=0.4",
        facecolor=c, edgecolor='none', zorder=3))
    ax.text(13.5, ly + 0.3, t, fontsize=10.5, fontweight='bold',
            color=INK, ha='left', va='center')
    ax.text(13.5, ly - 1.5, d, fontsize=8.5,
            color=INK_SOFT, ha='left', va='center')

# ═══════════════════════════════════════════════════
#  BOTTOM-RIGHT — Sesquilinearity Concept Diagram
# ═══════════════════════════════════════════════════
ax.add_patch(FancyBboxPatch((54, 10), 40, 30,
    boxstyle="round,pad=0,rounding_size=1.0",
    facecolor=BOX_BG, edgecolor=BORDER, linewidth=1.5, zorder=2))
ax.text(74, 37, 'The Sesquilinearity Rule', fontsize=14, fontweight='bold',
        color=INK, ha='center')

ax.text(74, 31.5,
    r'$\langle\,\alpha\,x\,,\;\beta\,y\,\rangle\;=\;\alpha^{*}\,\beta\,\langle x,\,y\rangle$',
    fontsize=16, color=INK, ha='center', va='center')

# 1st-argument slot (red)
ax.add_patch(FancyBboxPatch((58, 22), 13, 5,
    boxstyle="round,pad=0,rounding_size=0.6",
    facecolor='#FBE4E3', edgecolor=RED, linewidth=2, zorder=3))
ax.text(64.5, 25, '1st arg', fontsize=9.5, fontweight='bold',
        color=RED, ha='center', va='center')
ax.text(64.5, 23, 'conjugate-linear', fontsize=7.5,
        color=RED, ha='center', va='center', style='italic')

# Comma
ax.text(72, 24.5, ',', fontsize=14, color=INK, ha='center', va='center')

# 2nd-argument slot (teal)
ax.add_patch(FancyBboxPatch((74, 22), 13, 5,
    boxstyle="round,pad=0,rounding_size=0.6",
    facecolor='#DFF2EE', edgecolor=TEAL, linewidth=2, zorder=3))
ax.text(80.5, 25, '2nd arg', fontsize=9.5, fontweight='bold',
        color=TEAL, ha='center', va='center')
ax.text(80.5, 23, 'linear', fontsize=7.5,
        color=TEAL, ha='center', va='center', style='italic')

# Brackets
ax.text(56.5, 24.5, '⟨', fontsize=20, color=INK,
        ha='center', va='center', fontweight='bold')
ax.text(88.5, 24.5, '⟩', fontsize=20, color=INK,
        ha='center', va='center', fontweight='bold')

# Curved "pulled-out" arrows
ax.annotate('', xy=(55, 15), xytext=(63, 21.5),
            arrowprops=dict(arrowstyle='->', color=RED, lw=1.5,
                            connectionstyle='arc3,rad=0.25'))
ax.text(54, 14.3, r'$\alpha^{*}$', fontsize=13, color=RED,
        ha='center', va='center', fontweight='bold')

ax.annotate('', xy=(93, 15), xytext=(80.5, 21.5),
            arrowprops=dict(arrowstyle='->', color=TEAL, lw=1.5,
                            connectionstyle='arc3,rad=-0.25'))
ax.text(94, 14.3, r'$\beta$', fontsize=13, color=TEAL,
        ha='center', va='center', fontweight='bold')

ax.text(74, 12.3, r'$\langle x,\,y\rangle$  remains inside',
        fontsize=9.5, color=INK_SOFT, ha='center', va='center', style='italic')

# ═══════════════════════════════════════════════════
#  FOOTER
# ═══════════════════════════════════════════════════
ax.text(50, 5.5,
    'Invariant inner product  →  orthonormal basis  →  unitary matrices  →  D(g⁻¹) = D†(g) = D⁻¹(g)',
    fontsize=11, color=INK_SOFT, ha='center', va='center', style='italic')
ax.text(50, 2.5,
    'Group inverse  =  Matrix inverse  =  Conjugate transpose',
    fontsize=10, color=GOLD, ha='center', va='center', fontweight='bold')

# ═══════════════════════════════════════════════════
#  RENDER
# ═══════════════════════════════════════════════════
plt.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
plt.savefig('sesquilinearity_derivation.png', dpi=200,
            facecolor=BG, bbox_inches='tight')
plt.show()