import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Arc
from matplotlib.lines import Line2D
from matplotlib.collections import LineCollection
import matplotlib.patheffects as pe

# ── reproducibility ────────────────────────────────────────────────
SEED = 7
np.random.seed(SEED)

# ── high-quality global configuration ──────────────────────────────
plt.rcParams.update({
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "font.family": "DejaVu Sans",
    "font.size": 13,
    "axes.linewidth": 1.4,
    "axes.edgecolor": "#2A2A2A",
    "text.color": "#1A1A1A",
    "axes.labelcolor": "#1A1A1A",
    "xtick.color": "#3A3A3A",
    "ytick.color": "#3A3A3A",
    "pdf.fonttype": 42,
    "ps.fonttype": 42,
})

# ── palette (deep navy + warm accents, presentation-grade) ─────────
BG          = "#F4F1EA"   # warm parchment background
INK         = "#1A1A1A"
INK_SOFT    = "#3A3A3A"
PANEL       = "#FBF9F4"
PANEL_EDGE  = "#C9C2B0"

C_GROUP     = "#2E5C8A"   # deep blue   — group
C_REP       = "#C75B12"   # burnt orange— representation map
C_UNITARY   = "#1F7A4D"   # forest green— unitary matrices
C_COND      = "#8E2D6B"   # plum        — condition
C_ACCENT    = "#D4A017"   # gold        — highlights
C_VEC1      = "#C0392B"   # red
C_VEC2      = "#2471A3"   # blue

# ── figure & canvas ────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 10), facecolor=BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.set_aspect("equal")
ax.axis("off")

# ── subtle background texture: faint dot grid ──────────────────────
gx = np.arange(0.4, 16, 0.6)
gy = np.arange(0.4, 10, 0.6)
XX, YY = np.meshgrid(gx, gy)
ax.scatter(XX, YY, s=1.2, c="#D9D2BF", alpha=0.55, zorder=0, edgecolors="none")

# ══════════════════════════════════════════════════════════════════
#  TITLE
# ══════════════════════════════════════════════════════════════════
ax.text(8.0, 9.55,
        "then the  D(g)  become unitary matrices",
        ha="center", va="center",
        fontsize=23, fontweight="bold", color=INK,
        path_effects=[pe.withStroke(linewidth=3, foreground=BG)])
ax.text(8.0, 9.05,
        "a group representation whose image lies in U(n)",
        ha="center", va="center",
        fontsize=13, color=INK_SOFT, style="italic")

# ══════════════════════════════════════════════════════════════════
#  PANEL 1 — GROUP G  (left)
# ══════════════════════════════════════════════════════════════════
p1 = FancyBboxPatch((0.5, 1.3), 4.0, 6.6,
                    boxstyle="round,pad=0.04,rounding_size=0.18",
                    facecolor=PANEL, edgecolor=PANEL_EDGE,
                    linewidth=1.8, zorder=1)
ax.add_patch(p1)

ax.text(2.5, 7.55, "G", ha="center", va="center",
        fontsize=34, fontweight="bold", color=C_GROUP,
        path_effects=[pe.withStroke(linewidth=2, foreground=BG)])
ax.text(2.5, 7.05, "abstract group", ha="center", va="center",
        fontsize=11, color=INK_SOFT, style="italic")

# Cayley-table-like grid of group elements
elements = ["e", "g₁", "g₂", "g₃", "g₄", "g₅", "g₆", "g₇", "g₈"]
nE = 3
cell = 0.78
ox = 2.5 - (nE * cell) / 2
oy = 5.6
for idx, el in enumerate(elements):
    r, c = divmod(idx, nE)
    x = ox + c * cell
    y = oy - r * cell
    # cell background
    ax.add_patch(FancyBboxPatch((x, y), cell, cell,
                                boxstyle="round,pad=0.0,rounding_size=0.06",
                                facecolor="#EAF0F6", edgecolor=C_GROUP,
                                linewidth=1.3, alpha=0.85, zorder=2))
    ax.text(x + cell/2, y + cell/2, el,
            ha="center", va="center",
            fontsize=15, fontweight="bold", color=C_GROUP, zorder=3)

# group axioms box
axioms = [
    "closure:   gᵢ · gⱼ  ∈  G",
    "identity:  e · g  =  g",
    "inverse:   g · g⁻¹ =  e",
    "assoc.:    (gᵢgⱼ)gₖ = gᵢ(gⱼgₖ)",
]
ay = 3.05
for a in axioms:
    ax.text(0.85, ay, a, ha="left", va="center",
            fontsize=10.5, color=INK_SOFT, family="DejaVu Sans Mono")
    ay -= 0.42

ax.text(2.5, 1.55, "elements & structure of G",
        ha="center", va="center", fontsize=10,
        color=INK_SOFT, style="italic")

# ══════════════════════════════════════════════════════════════════
#  ARROW — representation map D   (centre)
# ══════════════════════════════════════════════════════════════════
arrow = FancyArrowPatch((4.65, 4.6), (6.55, 4.6),
                        arrowstyle="-|>",
                        mutation_scale=34,
                        linewidth=4.2,
                        color=C_REP,
                        zorder=5,
                        connectionstyle="arc3,rad=0.0")
ax.add_patch(arrow)

# label above arrow
ax.text(5.6, 5.35, "D", ha="center", va="center",
        fontsize=30, fontweight="bold", color=C_REP,
        path_effects=[pe.withStroke(linewidth=2.5, foreground=BG)])
ax.text(5.6, 4.85, "representation", ha="center", va="center",
        fontsize=10.5, color=C_REP, style="italic")
ax.text(5.6, 4.15, "homomorphism", ha="center", va="center",
        fontsize=9.5, color=INK_SOFT, style="italic")

# small annotation: D(gᵢgⱼ) = D(gᵢ)D(gⱼ)
ax.text(5.6, 3.55, "D(gᵢgⱼ) = D(gᵢ) D(gⱼ)",
        ha="center", va="center", fontsize=10,
        color=INK_SOFT, family="DejaVu Sans Mono",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#F7E9DE",
                  edgecolor=C_REP, linewidth=1.0))

# ══════════════════════════════════════════════════════════════════
#  PANEL 2 — U(n): the unitary matrices  (centre-right)
# ══════════════════════════════════════════════════════════════════
p2 = FancyBboxPatch((6.7, 1.3), 4.6, 6.6,
                    boxstyle="round,pad=0.04,rounding_size=0.18",
                    facecolor=PANEL, edgecolor=PANEL_EDGE,
                    linewidth=1.8, zorder=1)
ax.add_patch(p2)

ax.text(9.0, 7.55, "U(n)", ha="center", va="center",
        fontsize=34, fontweight="bold", color=C_UNITARY,
        path_effects=[pe.withStroke(linewidth=2, foreground=BG)])
ax.text(9.0, 7.05, "unitary group of degree n", ha="center", va="center",
        fontsize=11, color=INK_SOFT, style="italic")

# a stylised unitary matrix D(g)
mat_x, mat_y = 7.15, 3.55
cell_s = 0.62
rows, cols = 4, 4
# bracket-like frame
ax.add_patch(FancyBboxPatch((mat_x - 0.12, mat_y - 0.12),
                            cols * cell_s + 0.24, rows * cell_s + 0.24,
                            boxstyle="round,pad=0.0,rounding_size=0.10",
                            facecolor="#E8F2EC", edgecolor=C_UNITARY,
                            linewidth=2.2, zorder=2))

# generate a "nice" unitary-ish pattern of complex entries
import numpy as np
rng = np.random.default_rng(SEED)
# random unitary via QR of random complex
A = rng.standard_normal((4, 4)) + 1j * rng.standard_normal((4, 4))
Q, R = np.linalg.qr(A)
Umat = Q  # unitary

# magnitude and phase for visual encoding
mags = np.abs(Umat)
phases = np.angle(Umat)
mags = mags / mags.max()

# phase -> color wheel
def phase_color(ph):
    palette = [
        (0.00, "#C0392B"),  # red
        (0.25, "#D4A017"),  # gold
        (0.50, "#1F7A4D"),  # green
        (0.75, "#2471A3"),  # blue
        (1.00, "#C0392B"),  # wrap
    ]
    t = (ph % (2*np.pi)) / (2*np.pi)
    for i in range(len(palette)-1):
        if palette[i][0] <= t <= palette[i+1][0]:
            f = (t - palette[i][0]) / (palette[i+1][0] - palette[i][0])
            from matplotlib.colors import to_rgb
            c1 = np.array(to_rgb(palette[i][1]))
            c2 = np.array(to_rgb(palette[i+1][1]))
            return tuple((1-f)*c1 + f*c2)
    return "#888888"

for r in range(rows):
    for c in range(cols):
        x = mat_x + c * cell_s
        y = mat_y + (rows - 1 - r) * cell_s
        col = phase_color(phases[r, c])
        alpha = 0.25 + 0.65 * mags[r, c]
        ax.add_patch(mpatches.Rectangle((x, y), cell_s, cell_s,
                                        facecolor=col, edgecolor="white",
                                        linewidth=1.4, alpha=alpha, zorder=3))
        # entry label (a + ib form, abbreviated)
        re = Umat[r, c].real
        im = Umat[r, c].imag
        sign = "+" if im >= 0 else "−"
        label = f"{re:+.2f}{sign}{abs(im):.2f}i"
        ax.text(x + cell_s/2, y + cell_s/2, label,
                ha="center", va="center",
                fontsize=6.6, color=INK, family="DejaVu Sans Mono",
                zorder=4)

# matrix label
ax.text(mat_x + cols*cell_s/2, mat_y - 0.35, "D(g)  ∈  U(n)",
        ha="center", va="center",
        fontsize=13, fontweight="bold", color=C_UNITARY)

# legend for cell colour = phase
ax.text(mat_x, mat_y + rows*cell_s + 0.30,
        "cell hue = phase(arg entry),  intensity = |entry|",
        ha="left", va="center", fontsize=8.5, color=INK_SOFT, style="italic")

# ══════════════════════════════════════════════════════════════════
#  PANEL 3 — unitarity condition  (right)
# ══════════════════════════════════════════════════════════════════
p3 = FancyBboxPatch((11.55, 1.3), 4.0, 6.6,
                    boxstyle="round,pad=0.04,rounding_size=0.18",
                    facecolor=PANEL, edgecolor=PANEL_EDGE,
                    linewidth=1.8, zorder=1)
ax.add_patch(p3)

ax.text(13.55, 7.55, "D(g)† D(g) = I",
        ha="center", va="center",
        fontsize=22, fontweight="bold", color=C_COND,
        path_effects=[pe.withStroke(linewidth=2, foreground=BG)])
ax.text(13.55, 7.05, "the unitarity condition",
        ha="center", va="center",
        fontsize=11, color=INK_SOFT, style="italic")

# geometric picture: unitary action preserves the unit circle
cx, cy, R = 13.55, 4.35, 1.05
# unit circle
theta = np.linspace(0, 2*np.pi, 400)
ax.plot(cx + R*np.cos(theta), cy + R*np.sin(theta),
        color=INK_SOFT, linewidth=1.8, zorder=3)
# filled disc (very light)
ax.add_patch(Circle((cx, cy), R, facecolor="#EFEAF1",
                    edgecolor="none", alpha=0.5, zorder=2))

# axes
ax.annotate("", xy=(cx + R + 0.35, cy), xytext=(cx - R - 0.35, cy),
            arrowprops=dict(arrowstyle="->", color=INK_SOFT, lw=1.2))
ax.annotate("", xy=(cx, cy + R + 0.35), xytext=(cx, cy - R - 0.35),
            arrowprops=dict(arrowstyle="->", color=INK_SOFT, lw=1.2))
ax.text(cx + R + 0.40, cy, "Re", fontsize=9, color=INK_SOFT, va="center")
ax.text(cx, cy + R + 0.40, "Im", fontsize=9, color=INK_SOFT, ha="center")

# original vector v (red)
v_ang = 0.55
vx, vy = R*np.cos(v_ang), R*np.sin(v_ang)
ax.annotate("", xy=(cx + vx, cy + vy), xytext=(cx, cy),
            arrowprops=dict(arrowstyle="-|>", color=C_VEC1, lw=2.6,
                            mutation_scale=18))
ax.text(cx + vx + 0.12, cy + vy + 0.12, "v",
        fontsize=13, fontweight="bold", color=C_VEC1)

# transformed vector D(g)v (blue) — rotated by some angle
u_ang = v_ang + 1.15
ux, uy = R*np.cos(u_ang), R*np.sin(u_ang)
ax.annotate("", xy=(cx + ux, cy + uy), xytext=(cx, cy),
            arrowprops=dict(arrowstyle="-|>", color=C_VEC2, lw=2.6,
                            mutation_scale=18))
ax.text(cx + ux + 0.12, cy + uy + 0.12, "D(g) v",
        fontsize=13, fontweight="bold", color=C_VEC2)

# rotation arc
arc = Arc((cx, cy), 0.7, 0.7, angle=0,
          theta1=np.degrees(v_ang), theta2=np.degrees(u_ang),
          color=C_ACCENT, linewidth=2.0, zorder=4)
ax.add_patch(arc)
ax.text(cx + 0.55*np.cos((v_ang+u_ang)/2),
        cy + 0.55*np.sin((v_ang+u_ang)/2),
        "θ", fontsize=11, color=C_ACCENT, fontweight="bold")

# inner-product preservation note
ax.text(13.55, 2.55,
        "⟨D(g)u, D(g)v⟩ = ⟨u, v⟩",
        ha="center", va="center", fontsize=11.5,
        color=INK, family="DejaVu Sans Mono",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#F4E9EF",
                  edgecolor=C_COND, linewidth=1.0))
ax.text(13.55, 2.05,
        "lengths & angles preserved",
        ha="center", va="center", fontsize=10,
        color=INK_SOFT, style="italic")

ax.text(13.55, 1.55, "geometric meaning of unitarity",
        ha="center", va="center", fontsize=10,
        color=INK_SOFT, style="italic")

# ══════════════════════════════════════════════════════════════════
#  BOTTOM CAPTION / LEGEND
# ══════════════════════════════════════════════════════════════════
legend_elems = [
    Line2D([0], [0], color=C_GROUP,   lw=4, label="group  G  (domain)"),
    Line2D([0], [0], color=C_REP,     lw=4, label="representation  D  (map)"),
    Line2D([0], [0], color=C_UNITARY, lw=4, label="unitary matrices  U(n)  (codomain)"),
    Line2D([0], [0], color=C_COND,    lw=4, label="unitarity condition  D†D = I"),
]
leg = ax.legend(handles=legend_elems, loc="lower center",
                bbox_to_anchor=(0.5, 0.005), ncol=4,
                frameon=True, fontsize=10.5,
                facecolor=PANEL, edgecolor=PANEL_EDGE)
leg.get_frame().set_linewidth(1.4)
leg.get_frame().set_boxstyle("round,pad=0.6,rounding_size=0.12")

# subtle outer frame
ax.add_patch(FancyBboxPatch((0.18, 0.18), 15.64, 9.64,
                            boxstyle="round,pad=0.02,rounding_size=0.10",
                            facecolor="none", edgecolor="#B7AE96",
                            linewidth=1.4, zorder=0))

# ── render ─────────────────────────────────────────────────────────
plt.show()