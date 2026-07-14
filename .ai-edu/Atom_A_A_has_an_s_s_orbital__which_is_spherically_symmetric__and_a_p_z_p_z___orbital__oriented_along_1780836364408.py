import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

# ---------- Setup ----------
plt.rcParams['figure.dpi'] = 200
plt.rcParams['savefig.dpi'] = 200
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.facecolor'] = 'whitesmoke'
plt.rcParams['font.size'] = 14

fig, ax = plt.subplots(figsize=(8, 8))
ax.set_xlim(-4, 4)
ax.set_ylim(-4, 4)
ax.set_aspect('equal')
ax.axis('off')

# ---------- Colors ----------
S_COLOR = '#3a86ff'
P_POS_COLOR = '#e63946'
P_NEG_COLOR = '#457b9d'
EDGE_COLOR = '#1d3557'
ALPHA = 0.35

# ---------- s orbital ----------
s_circle = plt.Circle(
    (0, 0),
    1.2,
    facecolor=S_COLOR,
    edgecolor=EDGE_COLOR,
    linewidth=3,
    alpha=ALPHA,
    zorder=2
)
ax.add_patch(s_circle)

# highlight
s_highlight = plt.Circle(
    (0.25, 0.25),
    0.8,
    facecolor='white',
    edgecolor='none',
    alpha=0.2,
    zorder=3
)
ax.add_patch(s_highlight)

# ---------- pz orbital ----------
lobe_width = 0.8
lobe_height = 1.8

# upper lobe
pos_lobe = mpatches.Ellipse(
    (0, 1.5),
    width=lobe_width,
    height=lobe_height,
    facecolor=P_POS_COLOR,
    edgecolor=EDGE_COLOR,
    linewidth=3,
    alpha=ALPHA,
    zorder=2
)
ax.add_patch(pos_lobe)

# lower lobe
neg_lobe = mpatches.Ellipse(
    (0, -1.5),
    width=lobe_width,
    height=lobe_height,
    facecolor=P_NEG_COLOR,
    edgecolor=EDGE_COLOR,
    linewidth=3,
    alpha=ALPHA,
    zorder=2
)
ax.add_patch(neg_lobe)

# phase signs
ax.text(
    0, 2.5, '+',
    fontsize=20,
    fontweight='bold',
    color=P_POS_COLOR,
    ha='center',
    va='center'
)

ax.text(
    0, -2.5, '−',
    fontsize=20,
    fontweight='bold',
    color=P_NEG_COLOR,
    ha='center',
    va='center'
)

# ---------- z-axis ----------
ax.annotate(
    '',
    xy=(0, 3.8),
    xytext=(0, -3.8),
    arrowprops=dict(
        arrowstyle='<->',
        color='#457b9d',
        lw=2.5
    ),
    zorder=1
)

ax.text(
    0.3,
    3.8,
    'z (bond axis)',
    fontsize=12,
    color='#457b9d',
    fontweight='bold',
    va='bottom'
)

# ---------- Atom label ----------
ax.text(
    0,
    0,
    'A',
    fontsize=24,
    fontweight='bold',
    color='#1d3557',
    ha='center',
    va='center',
    zorder=10,
    bbox=dict(
        boxstyle='circle,pad=0.2',
        facecolor='white',
        edgecolor='#1d3557',
        lw=2
    )
)

# ---------- s orbital annotation ----------
bbox_s = FancyBboxPatch(
    (2.0, 0.5),
    0.1,
    0.1,
    boxstyle="round,pad=0.3",
    facecolor='#f1faee',
    edgecolor='#3a86ff',
    linewidth=2
)
ax.add_patch(bbox_s)

# FIXED HERE
ax.annotate(
    '',
    xy=(1.2, 0.3),
    xytext=(2.2, 0.8),
    arrowprops=dict(
        arrowstyle='->',
        color='#3a86ff',
        lw=2
    )
)

ax.text(
    2.3,
    0.8,
    's orbital\n(spherical)',
    fontsize=13,
    color='#1d3557',
    fontweight='bold',
    ha='left',
    va='center',
    bbox=dict(
        boxstyle='round,pad=0.3',
        facecolor='#f1faee',
        edgecolor='#3a86ff',
        lw=2
    )
)

# ---------- positive pz label ----------
ax.annotate(
    '',
    xy=(1.0, 1.7),
    xytext=(2.5, 2.2),
    arrowprops=dict(
        arrowstyle='->',
        color='#e63946',
        lw=2
    )
)

ax.text(
    2.6,
    2.2,
    'p$_z$ orbital\n(positive lobe)',
    fontsize=13,
    color='#1d3557',
    fontweight='bold',
    ha='left',
    va='center',
    bbox=dict(
        boxstyle='round,pad=0.3',
        facecolor='#f1faee',
        edgecolor='#e63946',
        lw=2
    )
)

# ---------- negative pz label ----------
ax.annotate(
    '',
    xy=(1.0, -1.7),
    xytext=(2.5, -2.2),
    arrowprops=dict(
        arrowstyle='->',
        color='#457b9d',
        lw=2
    )
)

ax.text(
    2.6,
    -2.2,
    'p$_z$ orbital\n(negative lobe)',
    fontsize=13,
    color='#1d3557',
    fontweight='bold',
    ha='left',
    va='center',
    bbox=dict(
        boxstyle='round,pad=0.3',
        facecolor='#f1faee',
        edgecolor='#457b9d',
        lw=2
    )
)

# ---------- Title ----------
ax.set_title(
    'Atom A: s and p$_z$ Orbitals',
    fontsize=20,
    fontweight='bold',
    color='#1d3557',
    pad=20
)

plt.tight_layout()
plt.show()