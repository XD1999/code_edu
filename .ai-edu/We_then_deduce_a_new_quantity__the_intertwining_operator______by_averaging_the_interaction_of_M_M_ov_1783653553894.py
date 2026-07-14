import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Wedge
from matplotlib.lines import Line2D
import numpy as np

# ─────────────────────────────────────────────────────────────────────────────
# Palette  (deep navy canvas, warm + cool accents)
# ─────────────────────────────────────────────────────────────────────────────
BG          = "#0E1530"
PANEL_BG    = "#161E40"
INK         = "#F4F1DE"
INK_DIM     = "#A8B0C8"
INK_FAINT   = "#5C6488"
DJ_COL      = "#FF6B6B"   # D_J  – warm coral
DK_COL      = "#4ECDC4"   # D_K  – cool teal
M_COL       = "#FFD166"   # M    – amber
SIGMA_COL   = "#C77DFF"   # Σ    – violet
G_COL       = "#95E1D3"   # G    – mint
ACCENT      = "#F38181"
ZERO_COL    = "#7A86B0"
LAMBDA_COL  = "#FFB84C"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.weight": "bold",
    "axes.unicode_minus": False,
})

# ─────────────────────────────────────────────────────────────────────────────
# Figure
# ─────────────────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(20, 11), facecolor=BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 20); ax.set_ylim(0, 11)
ax.set_aspect("equal"); ax.axis("off")

# Subtle dot grid
for x in np.arange(0.4, 20, 0.4):
    for y in np.arange(0.4, 11, 0.4):
        ax.plot(x, y, ".", color="#1E2A4F", markersize=0.6, alpha=0.5)

# ── Title ────────────────────────────────────────────────────────────────────
ax.text(10, 10.55, "Intertwining Operator  Σ",
        ha="center", va="center", fontsize=30, color=INK, weight="bold")
ax.text(10, 9.95, "Deduced by averaging the interaction of  M  over all group actions",
        ha="center", va="center", fontsize=13.5, color=INK_DIM, style="italic")

# ── Formula bar ───────────────────────────────────────────────────────────────
fbox = FancyBboxPatch((4.0, 8.95), 12.0, 0.62,
                      boxstyle="round,pad=0.04,rounding_size=0.18",
                      facecolor=PANEL_BG, edgecolor=INK_FAINT, linewidth=1.2, zorder=3)
ax.add_patch(fbox)
ax.text(10, 9.26,
        "Σ   =   Σ        D_J(g⁻¹)  ·  M  ·  D_K(g)",
        ha="center", va="center", fontsize=17, color=INK, weight="bold", zorder=4)
ax.text(5.55, 8.78, "g ∈ G", ha="center", va="center",
        fontsize=11, color=G_COL, style="italic", weight="bold", zorder=4)

# ── Group orbit (background) ─────────────────────────────────────────────────
gcx, gcy, gr = 10.0, 5.0, 2.55
ax.add_patch(Circle((gcx, gcy), gr + 0.18, fill=False,
                    edgecolor=G_COL, linewidth=1.4, alpha=0.35, linestyle=(0, (4, 4))))
ax.add_patch(Circle((gcx, gcy), gr - 0.18, fill=False,
                    edgecolor=G_COL, linewidth=0.8, alpha=0.18, linestyle=(0, (2, 4))))

# Group label
ax.text(gcx, gcy + gr + 0.55, "G  (finite group)",
        ha="center", va="center", fontsize=12.5, color=G_COL, weight="bold", style="italic")
ax.text(gcx, gcy + gr + 0.22, "symmetry orbit",
        ha="center", va="center", fontsize=9, color=INK_FAINT, style="italic")

# ── Group elements g_1 … g_5 around the orbit ────────────────────────────────
n_elems = 5
g_positions = []
for i in range(n_elems):
    ang = np.pi/2 + i * 2*np.pi/n_elems
    g_positions.append((gcx + gr*np.cos(ang), gcy + gr*np.sin(ang), i+1))

for gx, gy, idx in g_positions:
    # halo
    ax.add_patch(Circle((gx, gy), 0.46, facecolor=G_COL, alpha=0.10, zorder=4))
    # node
    ax.add_patch(Circle((gx, gy), 0.34, facecolor=G_COL, edgecolor="white",
                        linewidth=1.6, zorder=5))
    ax.text(gx, gy, f"g{idx}", ha="center", va="center",
            fontsize=11, color=BG, weight="bold", zorder=6)

# ── Central Σ node ───────────────────────────────────────────────────────────
ax.add_patch(Circle((gcx, gcy), 0.95, facecolor=SIGMA_COL, alpha=0.14, zorder=5))
ax.add_patch(Circle((gcx, gcy), 0.72, facecolor=SIGMA_COL, edgecolor="white",
                    linewidth=2.4, zorder=6))
ax.text(gcx, gcy, "Σ", ha="center", va="center",
        fontsize=34, color="white", weight="bold", zorder=7)
ax.text(gcx, gcy - 1.05, "Σ  =  sum over  G",
        ha="center", va="center", fontsize=10, color=SIGMA_COL, style="italic", weight="bold")

# ── Arrows from each g_i into Σ ───────────────────────────────────────────────
for gx, gy, idx in g_positions:
    dx, dy = gcx - gx, gcy - gy
    L = np.hypot(dx, dy)
    ux, uy = dx/L, dy/L
    start = (gx + ux*0.40, gy + uy*0.40)
    end   = (gcx - ux*0.78, gcy - uy*0.78)
    arr = FancyArrowPatch(start, end,
                          arrowstyle="-|>", mutation_scale=14,
                          color=G_COL, linewidth=1.3, alpha=0.55,
                          connectionstyle="arc3,rad=0.04", zorder=4)
    ax.add_patch(arr)

# ── D_J gate (left) ──────────────────────────────────────────────────────────
dj_x, dj_y = 3.0, 5.0
ax.add_patch(FancyBboxPatch((dj_x-0.95, dj_y-0.95), 1.9, 1.9,
                            boxstyle="round,pad=0.04,rounding_size=0.18",
                            facecolor=DJ_COL, edgecolor="white",
                            linewidth=2.4, alpha=0.92, zorder=6))
ax.text(dj_x, dj_y+0.22, "D_J", ha="center", va="center",
        fontsize=22, color="white", weight="bold", zorder=7)
ax.text(dj_x, dj_y-0.30, "(g⁻¹)", ha="center", va="center",
        fontsize=11, color="white", style="italic", weight="bold", zorder=7)
ax.text(dj_x, dj_y+1.30, "irrep  D_J", ha="center", va="center",
        fontsize=11, color=DJ_COL, weight="bold")
ax.text(dj_x, dj_y-1.30, "acts on  V_J", ha="center", va="center",
        fontsize=9, color=INK_DIM, style="italic")

# ── M node (between D_J and Σ) ───────────────────────────────────────────────
m_x, m_y = 6.0, 5.0
ax.add_patch(Circle((m_x, m_y), 0.50, facecolor=M_COL, alpha=0.16, zorder=5))
ax.add_patch(Circle((m_x, m_y), 0.38, facecolor=M_COL, edgecolor="white",
                    linewidth=2.0, zorder=6))
ax.text(m_x, m_y, "M", ha="center", va="center",
        fontsize=20, color=BG, weight="bold", zorder=7)
ax.text(m_x, m_y+0.85, "arbitrary probe", ha="center", va="center",
        fontsize=9.5, color=M_COL, style="italic", weight="bold")
ax.text(m_x, m_y-0.85, "V_K  →  V_J", ha="center", va="center",
        fontsize=8.5, color=INK_DIM, style="italic")

# ── D_K gate (right of Σ) ───────────────────────────────────────────────────
dk_x, dk_y = 13.5, 5.0
ax.add_patch(FancyBboxPatch((dk_x-0.95, dk_y-0.95), 1.9, 1.9,
                            boxstyle="round,pad=0.04,rounding_size=0.18",
                            facecolor=DK_COL, edgecolor="white",
                            linewidth=2.4, alpha=0.92, zorder=6))
ax.text(dk_x, dk_y+0.22, "D_K", ha="center", va="center",
        fontsize=22, color="white", weight="bold", zorder=7)
ax.text(dk_x, dk_y-0.30, "(g)", ha="center", va="center",
        fontsize=11, color="white", style="italic", weight="bold", zorder=7)
ax.text(dk_x, dk_y+1.30, "irrep  D_K", ha="center", va="center",
        fontsize=11, color=DK_COL, weight="bold")
ax.text(dk_x, dk_y-1.30, "acts on  V_K", ha="center", va="center",
        fontsize=9, color=INK_DIM, style="italic")

# ── Flow arrows along the pipeline ───────────────────────────────────────────
def flow(p0, p1, color, lw=2.6, alpha=0.9, rad=0.0, z=5):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>",
                                 mutation_scale=22, color=color,
                                 linewidth=lw, alpha=alpha,
                                 connectionstyle=f"arc3,rad={rad}", zorder=z))

flow((dj_x+1.00, dj_y), (m_x-0.42, m_y), DJ_COL, lw=2.8)
flow((m_x+0.42, m_y),  (gcx-0.78, gcy), M_COL, lw=2.8)
flow((gcx+0.78, gcy), (dk_x-1.00, dk_y), DK_COL, lw=2.8)

# Tiny flow labels
ax.text(4.5, 5.30, "transform", ha="center", va="center",
        fontsize=8.5, color=DJ_COL, style="italic", weight="bold")
ax.text(7.5, 5.30, "probe", ha="center", va="center",
        fontsize=8.5, color=M_COL, style="italic", weight="bold")
ax.text(12.2, 5.30, "transform", ha="center", va="center",
        fontsize=8.5, color=DK_COL, style="italic", weight="bold")

# ── "averaging" annotation under the orbit ───────────────────────────────────
avg_y = 1.95
ax.add_patch(FancyBboxPatch((6.7, avg_y-0.42), 6.6, 0.85,
                            boxstyle="round,pad=0.04,rounding_size=0.14",
                            facecolor=PANEL_BG, edgecolor=SIGMA_COL,
                            linewidth=1.4, alpha=0.95, zorder=6))
ax.text(10.0, avg_y, "averaging  M  over the group orbit",
        ha="center", va="center", fontsize=11.5, color=SIGMA_COL, weight="bold", zorder=7)

# ── Schur's-Lemma outcome panel (right) ──────────────────────────────────────
panel_x, panel_y, panel_w, panel_h = 15.7, 1.4, 3.9, 7.0
ax.add_patch(FancyBboxPatch((panel_x, panel_y), panel_w, panel_h,
                            boxstyle="round,pad=0.06,rounding_size=0.22",
                            facecolor=PANEL_BG, edgecolor=INK_FAINT,
                            linewidth=1.4, alpha=0.96, zorder=4))
ax.text(panel_x + panel_w/2, panel_y + panel_h - 0.42,
        "Schur's Lemma", ha="center", va="center",
        fontsize=15, color=INK, weight="bold", zorder=5)
ax.text(panel_x + panel_w/2, panel_y + panel_h - 0.80,
        "binary outcome of  Σ", ha="center", va="center",
        fontsize=10, color=INK_DIM, style="italic", zorder=5)

# Case 1 — inequivalent
c1_y = panel_y + panel_h - 1.65
ax.add_patch(FancyBboxPatch((panel_x+0.25, c1_y-0.95), panel_w-0.5, 1.85,
                            boxstyle="round,pad=0.04,rounding_size=0.14",
                            facecolor="#1A2240", edgecolor=ZERO_COL,
                            linewidth=1.2, alpha=0.95, zorder=5))
ax.text(panel_x+0.45, c1_y+0.55, "Inequivalent", ha="left", va="center",
        fontsize=12, color=ZERO_COL, weight="bold", zorder=6)
ax.text(panel_x+0.45, c1_y+0.20, "D_J  ≇  D_K", ha="left", va="center",
        fontsize=10.5, color=INK_DIM, style="italic", zorder=6)
ax.text(panel_x + panel_w/2, c1_y-0.45, "Σ  =  0",
        ha="center", va="center", fontsize=19, color=ZERO_COL, weight="bold", zorder=6)

# Case 2 — identical
c2_y = panel_y + 1.85
ax.add_patch(FancyBboxPatch((panel_x+0.25, c2_y-0.95), panel_w-0.5, 1.85,
                            boxstyle="round,pad=0.04,rounding_size=0.14",
                            facecolor="#241A33", edgecolor=LAMBDA_COL,
                            linewidth=1.2, alpha=0.95, zorder=5))
ax.text(panel_x+0.45, c2_y+0.55, "Identical", ha="left", va="center",
        fontsize=12, color=LAMBDA_COL, weight="bold", zorder=6)
ax.text(panel_x+0.45, c2_y+0.20, "D_J  ≅  D_K", ha="left", va="center",
        fontsize=10.5, color=INK_DIM, style="italic", zorder=6)
ax.text(panel_x + panel_w/2, c2_y-0.45, "Σ  =  λ · I",
        ha="center", va="center", fontsize=19, color=LAMBDA_COL, weight="bold", zorder=6)

# λ derivation footnote
ax.text(panel_x + panel_w/2, panel_y + 0.30,
        "λ  =  |G| · Tr(M) / dim J",
        ha="center", va="center", fontsize=10.5, color=LAMBDA_COL,
        style="italic", weight="bold", zorder=6)

# Arrow from Σ to the panel
ax.add_patch(FancyArrowPatch((gcx+0.85, gcy+0.25), (panel_x-0.05, c1_y-0.05),
                             arrowstyle="-|>", mutation_scale=18,
                             color=INK_FAINT, linewidth=1.6, alpha=0.7,
                             connectionstyle="arc3,rad=-0.25", zorder=4))
ax.add_patch(FancyArrowPatch((gcx+0.85, gcy-0.25), (panel_x-0.05, c2_y+0.05),
                             arrowstyle="-|>", mutation_scale=18,
                             color=INK_FAINT, linewidth=1.6, alpha=0.7,
                             connectionstyle="arc3,rad=0.25", zorder=4))

# ── Legend (bottom-left) ─────────────────────────────────────────────────────
legend_items = [
    ("D_J(g⁻¹)",  DJ_COL),
    ("M",          M_COL),
    ("D_K(g)",     DK_COL),
    ("Σ",          SIGMA_COL),
    ("g ∈ G",      G_COL),
]
lx, ly = 0.6, 0.55
for label, col in legend_items:
    ax.add_patch(Circle((lx+0.18, ly), 0.13, facecolor=col, edgecolor="white",
                        linewidth=1.2, zorder=6))
    ax.text(lx+0.42, ly, label, ha="left", va="center",
            fontsize=10.5, color=INK_DIM, weight="bold", zorder=6)
    lx += 1.55

# ── Save & show ───────────────────────────────────────────────────────────────
plt.savefig("intertwining_operator_sigma.png", dpi=200,
            facecolor=BG, bbox_inches="tight", pad_inches=0.2)
plt.show()
