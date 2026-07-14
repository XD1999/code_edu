import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np

# ─── palette ──────────────────────────────────────────────────────────────
BG          = "#0d1117"
PANEL       = "#161b22"
PANEL_EDGE  = "#30363d"
GRID        = "#21262d"
INK         = "#e6edf3"
INK_DIM     = "#8b949e"
INK_FAINT   = "#484f58"
J_COLOR     = "#ff6b6b"
J_FILL      = "#3a1f1f"
K_COLOR     = "#4ecdc4"
K_FILL      = "#1a3331"
SIG_COLOR   = "#ffd93d"
SIG_FILL    = "#3a321a"
ACCENT      = "#a78bfa"
ACCENT_FILL = "#2a1f4a"

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
    "axes.unicode_minus": False,
})

fig = plt.figure(figsize=(20, 13), facecolor=BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 20)
ax.set_ylim(0, 13)
ax.axis("off")
ax.set_facecolor(BG)

# ─── background grid ───────────────────────────────────────────────────────
for x in np.arange(0, 20.5, 0.5):
    ax.plot([x, x], [0, 13], color=GRID, lw=0.4, alpha=0.35, zorder=0)
for y in np.arange(0, 13.5, 0.5):
    ax.plot([0, 20], [y, y], color=GRID, lw=0.4, alpha=0.35, zorder=0)

# ─── title ─────────────────────────────────────────────────────────────────
ax.text(10, 12.45,
        "Intertwining Operator  &  Schur's Lemma",
        ha="center", va="center", fontsize=25, fontweight="bold",
        color=INK, zorder=20)
ax.text(10, 11.78,
        r"$\Sigma=\sum_{g\in G}\,D_J(g^{-1})\,M\,D_K(g)$"
        "        obeys        "
        r"$D_J(g)\,\Sigma\;=\;\Sigma\,D_K(g)$"
        "   for any  $g\in G$",
        ha="center", va="center", fontsize=15, color=INK_DIM, zorder=20)

# ─── helper: rounded panel ─────────────────────────────────────────────────
def panel(x, y, w, h, fc=PANEL, ec=PANEL_EDGE, lw=1.5, alpha=1.0, z=2):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle="round,pad=0.04,rounding_size=0.18",
                       facecolor=fc, edgecolor=ec, linewidth=lw,
                       alpha=alpha, zorder=z, mutation_aspect=0.6)
    ax.add_patch(p)

# ─── helper: node box ─────────────────────────────────────────────────────
def node(cx, cy, w, h, label, sub, fc, ec, z=10):
    p = FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                       boxstyle="round,pad=0.03,rounding_size=0.14",
                       facecolor=fc, edgecolor=ec, linewidth=2.6,
                       zorder=z, mutation_aspect=0.6)
    ax.add_patch(p)
    ax.text(cx, cy + 0.20, label, ha="center", va="center",
            fontsize=19, fontweight="bold", color=ec, zorder=z+1)
    ax.text(cx, cy - 0.28, sub, ha="center", va="center",
            fontsize=10.5, color=INK_DIM, zorder=z+1)

# ─── helper: arrow ─────────────────────────────────────────────────────────
def arrow(p1, p2, color, lw=3.0, style="-|>", z=8, conn="arc3,rad=0"):
    a = FancyArrowPatch(p1, p2,
                       arrowstyle=style, mutation_scale=22,
                       color=color, lw=lw, zorder=z,
                       connectionstyle=conn,
                       path_effects=[pe.Stroke(linewidth=lw+1.6, foreground=BG),
                                     pe.Normal()])
    ax.add_patch(a)

# ─── helper: label badge ───────────────────────────────────────────────────
def badge(cx, cy, text, fc, ec, tc=INK, fs=13, pad=0.10):
    w = 0.30 + 0.125 * len(text)
    p = FancyBboxPatch((cx - w/2, cy - 0.235), w, 0.47,
                       boxstyle="round,pad=0.02,rounding_size=0.10",
                       facecolor=fc, edgecolor=ec, linewidth=1.6,
                       zorder=15, mutation_aspect=0.6)
    ax.add_patch(p)
    ax.text(cx, cy, text, ha="center", va="center",
            fontsize=fs, fontweight="bold", color=tc, zorder=16)

# ═══ MAIN COMMUTATIVE DIAGRAM ═════════════════════════════════════════════
panel(0.5, 1.8, 11.0, 9.0, fc=PANEL, ec=PANEL_EDGE, lw=1.8, alpha=0.55, z=1)
ax.text(6.0, 10.35, "Commutative Diagram",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color=INK_DIM, zorder=20)

# node positions
VJ_T = (3.0, 8.6);   VK_T = (9.0, 8.6)
VJ_B = (3.0, 3.0);  VK_B = (9.0, 3.0)

node(*VJ_T, 2.5, 1.15, r"$V_J$", "rep. space  J", J_FILL, J_COLOR)
node(*VK_T, 2.5, 1.15, r"$V_K$", "rep. space  K", K_FILL, K_COLOR)
node(*VJ_B, 2.5, 1.15, r"$V_J$", r"$D_J(g^{-1})$ applied", J_FILL, J_COLOR)
node(*VK_B, 2.5, 1.15, r"$V_K$", r"$D_K(g^{-1})$ applied", K_FILL, K_COLOR)

# top horizontal: D_J(g)
arrow((VJ_T[0]+1.25, VJ_T[1]), (VK_T[0]-1.25, VK_T[1]), J_COLOR, lw=3.4)
badge(6.0, 8.6, r"$D_J(g)$", "#2a1414", J_COLOR)

# bottom horizontal: D_K(g)
arrow((VJ_B[0]+1.25, VJ_B[1]), (VK_B[0]-1.25, VK_B[1]), K_COLOR, lw=3.4)
badge(6.0, 3.0, r"$D_K(g)$", "#142828", K_COLOR)

# left vertical: D_J(g⁻¹)
arrow((VJ_T[0], VJ_T[1]-0.58), (VJ_B[0], VJ_B[1]+0.58), J_COLOR, lw=3.4)
badge(1.55, 5.8, r"$D_J(g^{-1})$", "#2a1414", J_COLOR, fs=11)

# right vertical: D_K(g⁻¹)
arrow((VK_T[0], VK_T[1]-0.58), (VK_B[0], VK_B[1]+0.58), K_COLOR, lw=3.4)
badge(10.45, 5.8, r"$D_K(g^{-1})$", "#142828", K_COLOR, fs=11)

# diagonal: Σ (intertwining)
arrow((VJ_T[0]+1.25, VJ_T[1]-0.30), (VK_B[0]-1.25, VK_B[1]+0.30),
      SIG_COLOR, lw=4.2, z=9)
badge(6.0, 5.8, r"$\Sigma$", SIG_FILL, SIG_COLOR, fs=16)

# ─── Σ definition box ──────────────────────────────────────────────────────
panel(0.7, 0.25, 10.6, 1.25, fc="#1a1505", ec=SIG_COLOR, lw=1.8, alpha=0.85, z=5)
ax.text(6.0, 1.05,
        r"$\Sigma\;=\;\sum_{g\,\in\,G}\;D_J(g^{-1})\,M\,D_K(g)$",
        ha="center", va="center", fontsize=15, color=SIG_COLOR,
        fontweight="bold", zorder=20)
ax.text(6.0, 0.55,
        "Σ is constructed to intertwine  D_J  and  D_K",
        ha="center", va="center", fontsize=10.5, color=INK_DIM,
        style="italic", zorder=20)

# ═══ RIGHT PANEL: CONSEQUENCES ════════════════════════════════════════════
panel(12.0, 1.8, 7.5, 9.0, fc=PANEL, ec=PANEL_EDGE, lw=1.8, alpha=0.55, z=1)
ax.text(15.75, 10.35, "Consequence  (Schur's Lemma)",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color=INK_DIM, zorder=20)

# Case 1: J = K
panel(12.3, 7.55, 6.9, 2.25, fc="#1a1505", ec=SIG_COLOR, lw=2.0, alpha=0.9, z=6)
ax.text(15.75, 9.45, "Case 1:   J = K  (same irrep)",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color=SIG_COLOR, zorder=20)
ax.text(15.75, 8.75,
        r"$\Sigma_{il}\;=\;\lambda(M)\,\delta_{il}\,\delta_{JK}$",
        ha="center", va="center", fontsize=15, color=INK, zorder=20)
ax.text(15.75, 8.05,
        "Σ is a scalar multiple of the identity",
        ha="center", va="center", fontsize=11, color=INK_DIM,
        style="italic", zorder=20)

# Case 2: J ≠ K
panel(12.3, 4.85, 6.9, 2.25, fc="#1a0d0d", ec=J_COLOR, lw=2.0, alpha=0.9, z=6)
ax.text(15.75, 6.75, "Case 2:   J ≠ K  (inequivalent irreps)",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color=J_COLOR, zorder=20)
ax.text(15.75, 6.05,
        r"$\Sigma\;=\;0$",
        ha="center", va="center", fontsize=17, color=INK, zorder=20)
ax.text(15.75, 5.35,
        "Σ vanishes identically",
        ha="center", va="center", fontsize=11, color=INK_DIM,
        style="italic", zorder=20)

# Grand orthogonality
panel(12.3, 2.15, 6.9, 2.25, fc=ACCENT_FILL, ec=ACCENT, lw=2.0, alpha=0.9, z=6)
ax.text(15.75, 4.05, "Grand Orthogonality Theorem",
        ha="center", va="center", fontsize=12.5, fontweight="bold",
        color=ACCENT, zorder=20)
ax.text(15.75, 3.30,
        r"$\frac{1}{|G|}\sum_{g\in G}\,D^{J}_{ij}(g^{-1})\,D^{K}_{kl}(g)"
        r"\;=\;\frac{1}{\dim J}\,\delta_{jk}\,\delta_{il}\,\delta_{JK}$",
        ha="center", va="center", fontsize=11.5, color=INK, zorder=20)
ax.text(15.75, 2.50,
        "matrix elements of irreps are orthogonal on G",
        ha="center", va="center", fontsize=10, color=INK_DIM,
        style="italic", zorder=20)

# ─── bottom annotation ────────────────────────────────────────────────────
ax.text(10.0, 0.85,
        "The intertwining relation  "
        r"$D_J(g)\,\Sigma\;=\;\Sigma\,D_K(g)$"
        "  holds for every  $g\in G$,  so  Σ  commutes with the entire group action.",
        ha="center", va="center", fontsize=11.5, color=INK_DIM, zorder=20)

# ─── legend ────────────────────────────────────────────────────────────────
legend_items = [
    (J_COLOR,   r"$D_J$  — irrep J"),
    (K_COLOR,   r"$D_K$  — irrep K"),
    (SIG_COLOR, r"$\Sigma$  — intertwining operator"),
    (ACCENT,    "orthogonality relation"),
]
for i, (c, lab) in enumerate(legend_items):
    cx = 1.4 + i * 2.55
    ax.plot([cx, cx+0.45], [11.15, 11.15], color=c, lw=4, zorder=20,
            solid_capstyle="round")
    ax.text(cx + 0.60, 11.15, lab, fontsize=10.5, color=INK_DIM,
            va="center", ha="left", zorder=20)

plt.savefig("intertwining_operator.png", dpi=200, facecolor=BG,
            bbox_inches="tight", pad_inches=0.15)
plt.show()
