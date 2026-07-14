import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
import matplotlib.patheffects as pe

# ═══════════════════════════════════════════════════════════════
#  Spectral Shift Invariance — Static Diagram
#  "Equation (14.9) remains true if σ is replaced by (σ − xI)"
# ═══════════════════════════════════════════════════════════════

fig, ax = plt.subplots(1, 1, figsize=(16, 11), dpi=200)
fig.patch.set_facecolor('#F7F5F0')
ax.set_facecolor('#F7F5F0')

# ─── Color Palette ───
C_ORIG   = '#E63946'   # Vibrant crimson — original spectrum
C_SHIFT  = '#1D3557'   # Deep navy — shifted spectrum
C_ARROW  = '#F4A261'   # Warm amber — shift arrows
C_GRID   = '#E8E3DB'   # Subtle warm grid
C_AXIS   = '#A09B94'   # Muted axis
C_TEXT   = '#1A1A2E'   # Near-black text
C_ACCENT = '#2A9D8F'   # Teal accent
C_BOX_BG = '#FFFFFF'   # White box background
C_BORDER = '#C8C3BB'   # Soft border

# ─── Data: Spectrum of A ───
eigenvalues = np.array([
    [3.0,  2.5],
    [3.0, -2.5],
    [-1.0, 3.0],
    [-1.0, -3.0],
    [4.5,  0.0],
    [-3.0, 0.0]
])

x_val = 1.5
shifted = eigenvalues.copy()
shifted[:, 0] -= x_val

# ─── Axes Setup ───
ax.set_xlim(-6.5, 6.5)
ax.set_ylim(-5.5, 6.0)
ax.set_aspect('equal')

# Grid
for i in range(-6, 7):
    ax.axvline(x=i, color=C_GRID, linewidth=0.7, alpha=0.5, zorder=0)
for i in range(-5, 7):
    ax.axhline(y=i, color=C_GRID, linewidth=0.7, alpha=0.5, zorder=0)

# Axes
ax.axhline(y=0, color=C_AXIS, linewidth=2.5, zorder=1)
ax.axvline(x=0, color=C_AXIS, linewidth=2.5, zorder=1)

ax.text(6.2, -0.4, 'Re', fontsize=14, fontweight='bold', color=C_AXIS, ha='center')
ax.text(0.3, 5.7, 'Im', fontsize=14, fontweight='bold', color=C_AXIS, ha='left')

# ─── Convex Hulls (shape preservation under translation) ───
hull_orig = np.array([
    [4.5, 0.0], [3.0, 2.5], [-1.0, 3.0],
    [-3.0, 0.0], [-1.0, -3.0], [3.0, -2.5]
])
hull_shift = hull_orig.copy()
hull_shift[:, 0] -= x_val

poly_orig = Polygon(hull_orig, closed=True, facecolor=C_ORIG,
                    alpha=0.07, edgecolor=C_ORIG, linewidth=1.5,
                    linestyle='--', zorder=2)
ax.add_patch(poly_orig)

poly_shift = Polygon(hull_shift, closed=True, facecolor=C_SHIFT,
                     alpha=0.07, edgecolor=C_SHIFT, linewidth=1.5,
                     linestyle='--', zorder=2)
ax.add_patch(poly_shift)

# ─── Shift Arrows (original → shifted) ───
for i in range(len(eigenvalues)):
    ox, oy = eigenvalues[i]
    sx, sy = shifted[i]
    arrow = FancyArrowPatch(
        (ox, oy), (sx, sy),
        connectionstyle="arc3,rad=0.15",
        arrowstyle='->,head_width=6,head_length=8',
        color=C_ARROW, linewidth=2.2, alpha=0.75, zorder=3
    )
    ax.add_patch(arrow)

# ─── Original Eigenvalues ───
for i, (ex, ey) in enumerate(eigenvalues):
    glow = Circle((ex, ey), 0.30, facecolor=C_ORIG, alpha=0.12, zorder=4)
    ax.add_patch(glow)
    circle = Circle((ex, ey), 0.17, facecolor=C_ORIG, edgecolor='white',
                    linewidth=2.5, zorder=5)
    ax.add_patch(circle)

    label = f'\u03bb{i+1}'
    if ey > 0:
        lx, ly, ha = ex + 0.4, ey + 0.25, 'left'
    elif ey < 0:
        lx, ly, ha = ex + 0.4, ey - 0.3, 'left'
    else:
        lx, ly, ha = ex + 0.4, ey + 0.3, 'left'
    if ex > 4:
        lx, ha = ex - 0.4, 'right'

    ax.text(lx, ly, label, fontsize=12, fontweight='bold',
            color=C_ORIG, zorder=6, ha=ha, va='center',
            path_effects=[pe.withStroke(linewidth=3.5, foreground='#F7F5F0')])

# ─── Shifted Eigenvalues ───
for i, (ex, ey) in enumerate(shifted):
    glow = Circle((ex, ey), 0.30, facecolor=C_SHIFT, alpha=0.12, zorder=4)
    ax.add_patch(glow)
    circle = Circle((ex, ey), 0.17, facecolor=C_SHIFT, edgecolor='white',
                    linewidth=2.5, zorder=5)
    ax.add_patch(circle)

    label = f'\u03bb{i+1}\u2212x'
    if ey > 0:
        lx, ly, ha = ex - 0.4, ey + 0.25, 'right'
    elif ey < 0:
        lx, ly, ha = ex - 0.4, ey - 0.3, 'right'
    else:
        lx, ly, ha = ex - 0.4, ey + 0.3, 'right'
    if ex < -4:
        lx, ha = ex + 0.4, 'left'

    ax.text(lx, ly, label, fontsize=12, fontweight='bold',
            color=C_SHIFT, zorder=6, ha=ha, va='center',
            path_effects=[pe.withStroke(linewidth=3.5, foreground='#F7F5F0')])

# ─── Title ───
ax.text(0, 5.5, 'Spectral Shift Invariance', fontsize=24, fontweight='bold',
        color=C_TEXT, ha='center', va='center')
ax.text(0, 5.0, 'Equation (14.9) remains true when \u03c3 is replaced by (\u03c3 \u2212 xI)',
        fontsize=14, color='#666', ha='center', va='center', style='italic')

# ─── Big Shift Direction Arrow ───
big_arrow = FancyArrowPatch(
    (2.0, 4.35), (-0.5, 4.35),
    arrowstyle='->,head_width=12,head_length=10',
    color=C_ARROW, linewidth=3, alpha=0.6, zorder=3
)
ax.add_patch(big_arrow)
ax.text(0.75, 4.65, f'translation by \u2212x   (x = {x_val})', fontsize=12,
        fontweight='bold', color=C_ARROW, ha='center', zorder=4,
        path_effects=[pe.withStroke(linewidth=4, foreground='#F7F5F0')])

# ─── Formula Box ───
formula_box = FancyBboxPatch(
    (-6.3, -5.3), 5.8, 3.3,
    boxstyle="round,pad=0.2",
    facecolor=C_BOX_BG, edgecolor=C_BORDER, linewidth=2.5, zorder=7
)
ax.add_patch(formula_box)

ax.text(-3.4, -2.4, 'Spectral Identity (14.9)', fontsize=13, fontweight='bold',
        color=C_TEXT, ha='center', va='center', zorder=8)
ax.plot([-5.5, -1.3], [-2.65, -2.65], color=C_BORDER, linewidth=1, zorder=8)

ax.text(-3.4, -3.15, 'f( \u03c3(A) )  =  \u03c3( f(A) )', fontsize=18, fontweight='bold',
        color=C_ACCENT, ha='center', va='center', zorder=8)

ax.text(-3.4, -3.75, 'Replace  \u03c3  \u2192  (\u03c3 \u2212 xI):', fontsize=12,
        color=C_TEXT, ha='center', va='center', zorder=8)

ax.text(-3.4, -4.25, '\u03c3(A \u2212 xI)  =  \u03c3(A) \u2212 x', fontsize=17, fontweight='bold',
        color=C_ORIG, ha='center', va='center', zorder=8)

ax.text(-3.4, -4.85, '\u27f9  Identity (14.9) still holds  \u2713', fontsize=12,
        color=C_ACCENT, ha='center', va='center', zorder=8, style='italic',
        fontweight='bold')

# ─── Legend Box ───
legend_box = FancyBboxPatch(
    (0.3, -5.3), 6.0, 2.3,
    boxstyle="round,pad=0.2",
    facecolor=C_BOX_BG, edgecolor=C_BORDER, linewidth=2.5, zorder=7
)
ax.add_patch(legend_box)

ax.text(3.3, -3.4, 'Legend', fontsize=13, fontweight='bold',
        color=C_TEXT, ha='center', va='center', zorder=8)
ax.plot([0.8, 5.8], [-3.6, -3.6], color=C_BORDER, linewidth=1, zorder=8)

ax.plot(1.3, -4.0, 'o', color=C_ORIG, markersize=14,
        markeredgecolor='white', markeredgewidth=2.5, zorder=8)
ax.text(1.7, -4.0, '\u03c3(A)  \u2014  original spectrum', fontsize=12, color=C_TEXT,
        va='center', zorder=8)

ax.plot(1.3, -4.5, 'o', color=C_SHIFT, markersize=14,
        markeredgecolor='white', markeredgewidth=2.5, zorder=8)
ax.text(1.7, -4.5, '\u03c3(A\u2212xI)  \u2014  shifted spectrum', fontsize=12, color=C_TEXT,
        va='center', zorder=8)

ax.annotate('', xy=(1.5, -5.0), xytext=(1.1, -5.0),
            arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2.5), zorder=8)
ax.text(1.7, -5.0, 'spectral translation by \u2212x', fontsize=12, color=C_TEXT,
        va='center', zorder=8)

# ─── Clean Up ───
ax.set_xticks([])
ax.set_yticks([])
for spine in ax.spines.values():
    spine.set_visible(False)

plt.tight_layout()
plt.savefig('spectral_shift_invariance.png', dpi=200, bbox_inches='tight',
            facecolor='#F7F5F0', edgecolor='none')
plt.show()