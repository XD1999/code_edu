
"""
Visualization: D^J(g^{-1}) D^J(g) = I  =>  Sum over S_3 equals 6

A polished static diagram showing how each of the 6 elements of the symmetric
group S_3 contributes exactly 1 (the (1,1) entry of the identity matrix) when
we form the product D^J(g^{-1}) D^J(g), yielding a total sum of 6.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, RegularPolygon
from matplotlib.lines import Line2D
import numpy as np

# ─── Palette ──────────────────────────────────────────────────────────────
BG          = '#0f1424'
PANEL_BG    = '#1a2138'
PANEL_EDGE  = '#2a3454'
INK         = '#e8ecf5'
INK_DIM     = '#9aa3bd'
INK_FAINT   = '#5a6480'
GOLD        = '#f5c542'
GOLD_DIM    = '#b8941f'
TEAL        = '#3dd6c8'
TEAL_DIM    = '#1a8a82'
CORAL       = '#ff6b6b'
CORAL_DIM   = '#a83838'
LAVENDER    = '#a78bfa'
LAVENDER_DIM= '#6d4fb0'
MINT        = '#7ee787'
MINT_DIM    = '#3a8a3a'
SKY         = '#5ca8e8'
SKY_DIM     = '#2a5a8a'

plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 11,
    'text.color': INK,
    'axes.edgecolor': PANEL_EDGE,
    'axes.labelcolor': INK,
    'xtick.color': INK_DIM,
    'ytick.color': INK_DIM,
    'figure.facecolor': BG,
    'axes.facecolor': BG,
})

# ─── Helper: draw a small matrix ───────────────────────────────────────────
def draw_matrix(ax, cx, cy, entries, label, color, scale=0.5, fontsize=9, label_offset=(0, -0.55)):
    """
    Draw a 2×2 matrix at (cx, cy) with bracket-style delimiters.
    entries: list of 4 strings [a,b,c,d] for [[a,b],[c,d]]
    """
    w = scale
    h = scale * 0.55
    # Brackets
    bracket_lw = 2.0
    gap = 0.06
    # Left bracket [
    ax.plot([cx-w/2-gap, cx-w/2-gap, cx-w/2-gap+0.08],
            [cy-h/2+0.08, cy-h/2, cy+h/2], color=color, lw=bracket_lw, solid_capstyle='round')
    ax.plot([cx-w/2-gap+0.08, cx-w/2-gap],
            [cy+h/2, cy+h/2], color=color, lw=bracket_lw, solid_capstyle='round')
    # Right bracket ]
    ax.plot([cx+w/2+gap-0.08, cx+w/2+gap, cx+w/2+gap],
            [cy+h/2, cy+h/2, cy-h/2+0.08], color=color, lw=bracket_lw, solid_capstyle='round')
    ax.plot([cx+w/2+gap, cx+w/2+gap-0.08],
            [cy-h/2, cy-h/2], color=color, lw=bracket_lw, solid_capstyle='round')
    # Entries
    positions = [(-w/4, h/4), (w/4, h/4), (-w/4, -h/4), (w/4, -h/4)]
    for (dx, dy), val in zip(positions, entries):
        ax.text(cx+dx, cy+dy, val, ha='center', va='center',
                fontsize=fontsize, color=INK, fontweight='bold')
    # Label below
    ax.text(cx+label_offset[0], cy+label_offset[1], label,
            ha='center', va='top', fontsize=8.5, color=color, fontstyle='italic')


def draw_identity_matrix(ax, cx, cy, color=GOLD, scale=0.5, fontsize=10):
    """Draw the 2×2 identity matrix with highlighted (1,1) entry."""
    w = scale
    h = scale * 0.55
    gap = 0.06
    # Brackets
    ax.plot([cx-w/2-gap, cx-w/2-gap, cx-w/2-gap+0.08],
            [cy-h/2+0.08, cy-h/2, cy+h/2], color=color, lw=2.0, solid_capstyle='round')
    ax.plot([cx-w/2-gap+0.08, cx-w/2-gap],
            [cy+h/2, cy+h/2], color=color, lw=2.0, solid_capstyle='round')
    ax.plot([cx+w/2+gap-0.08, cx+w/2+gap, cx+w/2+gap],
            [cy+h/2, cy+h/2, cy-h/2+0.08], color=color, lw=2.0, solid_capstyle='round')
    ax.plot([cx+w/2+gap, cx+w/2+gap-0.08],
            [cy-h/2, cy-h/2], color=color, lw=2.0, solid_capstyle='round')
    # Highlight (1,1) entry
    rect = mpatches.FancyBboxPatch(
        (cx-w/2-0.02, cy+0.02), w/2-0.02, h/2-0.04,
        boxstyle="round,pad=0.01", facecolor=GOLD, alpha=0.25, edgecolor=GOLD, linewidth=1.5)
    ax.add_patch(rect)
    # Entries
    ax.text(cx-w/4, cy+h/4, '1', ha='center', va='center',
            fontsize=fontsize, color=GOLD, fontweight='bold')
    ax.text(cx+w/4, cy+h/4, '0', ha='center', va='center',
            fontsize=fontsize, color=INK_DIM)
    ax.text(cx-w/4, cy-h/4, '0', ha='center', va='center',
            fontsize=fontsize, color=INK_DIM)
    ax.text(cx+w/4, cy-h/4, '1', ha='center', va='center',
            fontsize=fontsize, color=INK_DIM)


# ─── Helper: draw a small triangle icon for each group element ────────────
def draw_triangle_icon(ax, cx, cy, element, color, size=0.28):
    """
    Draw a small equilateral triangle representing the symmetry action.
    element: one of 'e','r','r2','s','sr','sr2'
    """
    # Base triangle vertices (pointing up)
    angles_base = [90, 210, 330]
    verts_base = [(cx + size*np.cos(np.radians(a)), cy + size*np.sin(np.radians(a)))
                  for a in angles_base]
    
    # Apply the symmetry to get the transformed triangle
    # We'll just draw the base triangle and indicate the action with a small symbol
    # Base triangle (faint)
    tri_base = plt.Polygon(verts_base, fill=False, edgecolor=INK_FAINT,
                          lw=1.0, linestyle='--', alpha=0.5)
    ax.add_patch(tri_base)
    
    # Transformed triangle
    if element == 'e':
        verts_t = verts_base
    elif element == 'r':
        # 120° rotation
        verts_t = [(cx + size*np.cos(np.radians(a+120)), cy + size*np.sin(np.radians(a+120)))
                   for a in angles_base]
    elif element == 'r2':
        verts_t = [(cx + size*np.cos(np.radians(a+240)), cy + size*np.sin(np.radians(a+240)))
                   for a in angles_base]
    elif element == 's':
        # reflection over vertical axis
        verts_t = [(cx - (v[0]-cx), v[1]) for v in verts_base]
    elif element == 'sr':
        verts_t = [(cx - (v[0]-cx), v[1]) for v in
                   [(cx + size*np.cos(np.radians(a+120)), cy + size*np.sin(np.radians(a+120)))
                    for a in angles_base]]
    elif element == 'sr2':
        verts_t = [(cx - (v[0]-cx), v[1]) for v in
                   [(cx + size*np.cos(np.radians(a+240)), cy + size*np.sin(np.radians(a+240)))
                    for a in angles_base]]
    
    tri_t = plt.Polygon(verts_t, fill=True, facecolor=color, alpha=0.18,
                        edgecolor=color, lw=1.8)
    ax.add_patch(tri_t)
    
    # Vertex labels (small)
    labels = ['1', '2', '3']
    for (vx, vy), lbl in zip(verts_t, labels):
        ax.text(vx, vy, lbl, ha='center', va='center', fontsize=5.5,
                color=INK, fontweight='bold',
                bbox=dict(boxstyle='circle,pad=0.1', facecolor=color, edgecolor='none', alpha=0.7))


# ─── Main figure ───────────────────────────────────────────────────────────
fig = plt.figure(figsize=(18, 11), dpi=150, facecolor=BG)

# Master grid
gs = fig.add_gridspec(3, 1, height_ratios=[1.0, 2.8, 1.0],
                      hspace=0.18,
                      left=0.04, right=0.96, top=0.95, bottom=0.04)

# ═══ HEADER ═══════════════════════════════════════════════════════════════
ax_header = fig.add_subplot(gs[0])
ax_header.set_facecolor(BG)
ax_header.set_xlim(0, 1); ax_header.set_ylim(0, 1)
ax_header.axis('off')

# Title
ax_header.text(0.5, 0.72,
               'Representation Identity:  D$^J$(g$^{-1}$) · D$^J$(g) = I',
               ha='center', va='center', fontsize=22, fontweight='bold', color=INK)
ax_header.text(0.5, 0.30,
               'For every element g in G = S₃, the product of the inverse and forward\n'
               'representation matrices yields the identity — contributing 1 to the sum.',
               ha='center', va='center', fontsize=12, color=INK_DIM, linespacing=1.5)

# Decorative underline
ax_header.plot([0.35, 0.65], [0.12, 0.12], color=GOLD, lw=2.5, solid_capstyle='round')

# ═══ MAIN PANEL: 6 group elements ═════════════════════════════════════════
ax_main = fig.add_subplot(gs[1])
ax_main.set_facecolor(PANEL_BG)
ax_main.set_xlim(-0.5, 11.5)
ax_main.set_ylim(-1.8, 3.2)
ax_main.axis('off')

# Panel border
panel_border = FancyBboxPatch(
    (-0.4, -1.7), 11.8, 4.8,
    boxstyle="round,pad=0.05", facecolor=PANEL_BG, edgecolor=PANEL_EDGE, linewidth=1.5)
ax_main.add_patch(panel_border)

# Section label
ax_main.text(0.1, 2.7, 'Summation over all g ∈ S₃  (|G| = 6)',
              fontsize=13, fontweight='bold', color=INK)
ax_main.text(0.1, 2.35, 'Each element contributes the (1,1) entry of I, which is 1',
              fontsize=10, color=INK_DIM, fontstyle='italic')

# The 6 elements and their colors
elements = [
    ('e',   'e',     SKY,      SKY_DIM),
    ('r',   'r',     TEAL,     TEAL_DIM),
    ('r2',  'r²',    MINT,     MINT_DIM),
    ('s',   's',     CORAL,    CORAL_DIM),
    ('sr',  'sr',    LAVENDER, LAVENDER_DIM),
    ('sr2', 'sr²',   GOLD,     GOLD_DIM),
]

# Matrix entries for D^J(g) — using the 2D irrep of S_3
# We'll show simplified symbolic entries
sqrt3_2 = '√3/2'
n_sqrt3_2 = '-√3/2'
half = '½'
n_half = '-½'

matrices = {
    'e':   ['1','0','0','1'],
    'r':   [n_half, n_sqrt3_2, sqrt3_2, n_half],
    'r2':  [n_half, sqrt3_2, n_sqrt3_2, n_half],
    's':   ['1','0','0','-1'],
    'sr':  [n_half, n_sqrt3_2, n_sqrt3_2, half],
    'sr2': [n_half, sqrt3_2, sqrt3_2, half],
}

# Inverse mapping
inverses = {
    'e': 'e', 'r': 'r2', 'r2': 'r',
    's': 's', 'sr': 'sr', 'sr2': 'sr2'
}

# Layout: 6 columns
col_centers = np.linspace(0.9, 10.1, 6)

for idx, (key, label, color, color_dim) in enumerate(elements):
    cx = col_centers[idx]
    
    # ── Card background ──
    card = FancyBboxPatch(
        (cx-0.75, -1.4), 1.5, 3.8,
        boxstyle="round,pad=0.03", facecolor='#222b48',
        edgecolor=color_dim, linewidth=1.2, alpha=0.85)
    ax_main.add_patch(card)
    
    # ── Element label ──
    ax_main.text(cx, 2.15, f'g = {label}',
                 ha='center', va='center', fontsize=13, fontweight='bold', color=color)
    inv_label = inverses[key]
    if inv_label == 'r2': inv_label = 'r²'
    elif inv_label == 'sr2': inv_label = 'sr²'
    ax_main.text(cx, 1.78, f'g⁻¹ = {inv_label}',
                 ha='center', va='center', fontsize=10, color=INK_DIM, fontstyle='italic')
    
    # ── Triangle icon ──
    draw_triangle_icon(ax_main, cx, 1.15, key, color, size=0.22)
    
    # ── Equation: D^J(g⁻¹) · D^J(g) = I ──
    # D^J(g⁻¹) matrix
    draw_matrix(ax_main, cx-0.42, 0.15, matrices[inverses[key]],
                f'D$^J$(g⁻¹)', color, scale=0.42, fontsize=6.5, label_offset=(0, -0.32))
    
    # Multiply sign
    ax_main.text(cx-0.15, 0.15, '·', ha='center', va='center',
                 fontsize=14, color=INK_DIM, fontweight='bold')
    
    # D^J(g) matrix
    draw_matrix(ax_main, cx+0.12, 0.15, matrices[key],
                f'D$^J$(g)', color, scale=0.42, fontsize=6.5, label_offset=(0, -0.32))
    
    # Equals sign
    ax_main.text(cx+0.38, 0.15, '=', ha='center', va='center',
                 fontsize=12, color=INK_DIM, fontweight='bold')
    
    # Identity matrix
    draw_identity_matrix(ax_main, cx+0.58, 0.15, color=GOLD, scale=0.42, fontsize=8)
    
    # ── Contribution badge ──
    badge = FancyBboxPatch(
        (cx-0.3, -1.15), 0.6, 0.5,
        boxstyle="round,pad=0.02", facecolor=color, edgecolor='none', alpha=0.2)
    ax_main.add_patch(badge)
    badge_border = FancyBboxPatch(
        (cx-0.3, -1.15), 0.6, 0.5,
        boxstyle="round,pad=0.02", facecolor='none', edgecolor=color, linewidth=1.5)
    ax_main.add_patch(badge_border)
    
    ax_main.text(cx, -0.9, '= 1', ha='center', va='center',
                 fontsize=14, fontweight='bold', color=color)

# ─── Accumulation arrows ──────────────────────────────────────────────────
# Draw arrows from each badge down to the sum bar
for idx, (key, label, color, color_dim) in enumerate(elements):
    cx = col_centers[idx]
    arrow = FancyArrowPatch(
        (cx, -1.2), (cx, -1.45),
        arrowstyle='->,head_width=4,head_length=3',
        color=color, lw=1.5, alpha=0.7)
    ax_main.add_patch(arrow)

# ─── Sum bar ──────────────────────────────────────────────────────────────
sum_bar = FancyBboxPatch(
    (0.15, -1.65), 10.7, 0.22,
    boxstyle="round,pad=0.01", facecolor=GOLD_DIM, edgecolor=GOLD,
    linewidth=1.5, alpha=0.3)
ax_main.add_patch(sum_bar)

# ═══ FOOTER: Final sum ════════════════════════════════════════════════════
ax_footer = fig.add_subplot(gs[2])
ax_footer.set_facecolor(BG)
ax_footer.set_xlim(0, 1); ax_footer.set_ylim(0, 1)
ax_footer.axis('off')

# Sum expression
sum_text = "  +  ".join([f"1" for _ in range(6)])
ax_footer.text(0.5, 0.78,
               f'LHS  =  {sum_text}  =  6',
               ha='center', va='center', fontsize=18, fontweight='bold', color=INK)

# Annotation
ax_footer.text(0.5, 0.30,
               'Each of the 6 group elements contributes exactly 1\n'
               '(the (1,1) entry of the identity matrix I), giving a total of 6 = |G|.',
               ha='center', va='center', fontsize=11, color=INK_DIM, linespacing=1.5)

# Decorative box around the result
result_box = FancyBboxPatch(
    (0.30, 0.62), 0.40, 0.22,
    boxstyle="round,pad=0.02", facecolor=PANEL_BG, edgecolor=GOLD,
    linewidth=1.5, transform=ax_footer.transAxes)
ax_footer.add_patch(result_box)
ax_footer.text(0.5, 0.73, 'LHS = 6',
               ha='center', va='center', fontsize=16, fontweight='bold', color=GOLD,
               transform=ax_footer.transAxes)

# ─── Save and show ────────────────────────────────────────────────────────
plt.savefig('representation_identity_sum.png', dpi=150, facecolor=BG,
            bbox_inches='tight', pad_inches=0.2)
plt.show()
