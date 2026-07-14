import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D
import numpy as np

# --- Canvas & Configuration ---
plt.rcParams['font.family'] = 'DejaVu Sans'
fig, ax = plt.subplots(figsize=(16, 9), dpi=200)
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis('off')

# Dark theme background
fig.patch.set_facecolor('#0B0F19')
ax.set_facecolor('#0B0F19')

# --- Color Palette (Vibrant, Sci-Fi/Math aesthetic) ---
C_DJ      = '#00D2FF'  # Cyan for D^J
C_DK      = '#FF2E97'  # Magenta for D^K
C_M       = '#FFD400'  # Yellow for M
C_SIGMA   = '#39FF14'  # Neon Green for Sigma
C_TEXT    = '#E0E6ED'  # Off-white
C_SUB     = '#8B9BB4'  # Muted blue-gray
C_BOX_BG  = '#161C2E'  # Dark box fill
C_BOX_BD  = '#2A3245'  # Dark box border
C_ACCENT  = '#FF6B6B'  # Red accent for constraints

# --- Helper Functions ---
def draw_matrix(ax, x, y, w, h, color, label, sublabel, alpha=0.15, zorder=2):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.02,rounding_size=0.1",
                          linewidth=2.5, edgecolor=color,
                          facecolor=plt.cm.colors.to_rgba(color, alpha),
                          zorder=zorder)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h + 0.35, label,
            ha='center', va='bottom', color=color, fontsize=16, fontweight='bold', zorder=zorder+1)
    ax.text(x + w/2, y - 0.35, sublabel,
            ha='center', va='top', color=C_SUB, fontsize=11, fontstyle='italic', zorder=zorder+1)

def draw_text_box(ax, x, y, text, color, fontsize=11, width=3.5, height=0.8):
    box = FancyBboxPatch((x, y), width, height,
                         boxstyle="round,pad=0.1,rounding_size=0.15",
                         linewidth=1.5, edgecolor=color,
                         facecolor=C_BOX_BG, alpha=0.9, zorder=5)
    ax.add_patch(box)
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center', color=color, fontsize=fontsize, fontweight='bold', zorder=6)

# --- Title ---
ax.text(8.0, 8.5, "Schur's Lemma & The Grand Orthogonality Theorem",
        ha='center', va='center', color=C_TEXT, fontsize=22, fontweight='bold')
ax.text(8.0, 8.05, "Averaging an arbitrary matrix over a group yields a strictly constrained diagonal form",
        ha='center', va='center', color=C_SUB, fontsize=13, fontstyle='italic')

# --- LHS: The Summation ---
y_mid = 4.5
m_w, m_h = 1.2, 1.8

# D^J(g^-1)
draw_matrix(ax, 1.0, y_mid - m_h/2, m_w, m_h, C_DJ, r"$D^J(g^{-1})$", "Irrep J", alpha=0.15)

# M
draw_matrix(ax, 3.0, y_mid - m_h/2, m_w, m_h, C_M, r"$M_{jk}$", "Arbitrary Matrix", alpha=0.2)

# D^K(g)
draw_matrix(ax, 5.0, y_mid - m_h/2, m_w, m_h, C_DK, r"$D^K(g)$", "Irrep K", alpha=0.15)

# Summation Symbol
ax.text(0.3, y_mid, r"$\sum_{g \in G}$", ha='center', va='center',
        color=C_TEXT, fontsize=28, fontweight='bold')

# Multiplication dots
ax.text(2.4, y_mid, r"$\cdot$", ha='center', va='center', color=C_TEXT, fontsize=24)
ax.text(4.4, y_mid, r"$\cdot$", ha='center', va='center', color=C_TEXT, fontsize=24)

# Equals Sign
ax.text(7.0, y_mid, r"$=$", ha='center', va='center', color=C_TEXT, fontsize=28, fontweight='bold')

# --- RHS: The Constrained Result ---
# Delta_il (Diagonal Matrix)
d_w, d_h = 1.6, 2.4
d_x, d_y = 8.0, y_mid - d_h/2

# Background of Delta_il
rect_delta = FancyBboxPatch((d_x, d_y), d_w, d_h,
                          boxstyle="round,pad=0.02,rounding_size=0.1",
                          linewidth=2.5, edgecolor=C_SIGMA,
                          facecolor=plt.cm.colors.to_rgba(C_SIGMA, 0.1),
                          zorder=2)
ax.add_patch(rect_delta)

# Diagonal line representing delta_il
ax.plot([d_x + 0.2, d_x + d_w - 0.2], [d_y + 0.2, d_y + d_h - 0.2],
        color=C_SIGMA, linewidth=4, solid_capstyle='round', zorder=3, alpha=0.9)

# Labels for Delta_il
ax.text(d_x + d_w/2, d_y + d_h + 0.35, r"$\delta_{il}$",
        ha='center', va='bottom', color=C_SIGMA, fontsize=16, fontweight='bold')
ax.text(d_x + d_w/2, d_y - 0.35, "Identity Matrix",
        ha='center', va='top', color=C_SUB, fontsize=11, fontstyle='italic')

# Multiplication dot
ax.text(10.0, y_mid, r"$\cdot$", ha='center', va='center', color=C_TEXT, fontsize=24)

# Delta_JK (Kronecker Delta condition)
jk_w, jk_h = 1.6, 1.0
jk_x, jk_y = 10.5, y_mid - jk_h/2

rect_jk = FancyBboxPatch((jk_x, jk_y), jk_w, jk_h,
                          boxstyle="round,pad=0.02,rounding_size=0.1",
                          linewidth=2.5, edgecolor=C_ACCENT,
                          facecolor=plt.cm.colors.to_rgba(C_ACCENT, 0.15),
                          zorder=2)
ax.add_patch(rect_jk)

ax.text(jk_x + jk_w/2, jk_y + jk_h/2, r"$\delta_{JK}$",
        ha='center', va='center', color=C_ACCENT, fontsize=18, fontweight='bold', zorder=3)
ax.text(jk_x + jk_w/2, jk_y - 0.35, "Irreps Match",
        ha='center', va='top', color=C_SUB, fontsize=11, fontstyle='italic')

# Lambda(M) scalar
ax.text(12.5, y_mid + 0.6, r"$\lambda(M)$", ha='center', va='center',
        color=C_TEXT, fontsize=18, fontweight='bold')
ax.text(12.5, y_mid - 0.1, "Scalar", ha='center', va='center',
        color=C_SUB, fontsize=11, fontstyle='italic')

# --- Flow Arrow ---
arr = FancyArrowPatch((6.5, y_mid - 1.5), (8.0, y_mid - 1.5),
                      arrowstyle='-|>', mutation_scale=25,
                      color=C_SUB, linewidth=2, zorder=1)
ax.add_patch(arr)
ax.text(7.25, y_mid - 1.8, "Schur's Lemma", ha='center', va='top',
        color=C_SUB, fontsize=12, fontweight='bold')

# --- Bottom Annotations & Logic Flow ---
# Box 1: Intertwining Operator
draw_text_box(ax, 1.0, 1.5,
              r"$\sigma = \sum D^J(g^{-1}) M D^K(g)$",
              C_TEXT, fontsize=12, width=4.5, height=0.9)
ax.text(3.25, 2.55, "1. The Intertwining Operator",
        ha='center', color=C_TEXT, fontsize=13, fontweight='bold')

# Box 2: Commutation
draw_text_box(ax, 6.0, 1.5,
              r"$D^J(g) \sigma = \sigma D^K(g)$",
              C_DJ, fontsize=12, width=4.0, height=0.9)
ax.text(8.0, 2.55, "2. Commutes with all $g \in G$",
        ha='center', color=C_TEXT, fontsize=13, fontweight='bold')

# Box 3: Consequence
draw_text_box(ax, 10.5, 1.5,
              "Result is strictly diagonal",
              C_SIGMA, fontsize=12, width=4.5, height=0.9)
ax.text(12.75, 2.55, "3. Diagonal & Proportional",
        ha='center', color=C_TEXT, fontsize=13, fontweight='bold')

# Connecting arrows for bottom flow
ax.annotate("", xy=(6.0, 1.95), xytext=(5.5, 1.95),
            arrowprops=dict(arrowstyle="-|>", color=C_SUB, lw=2))
ax.annotate("", xy=(10.5, 1.95), xytext=(10.0, 1.95),
            arrowprops=dict(arrowstyle="-|>", color=C_SUB, lw=2))

# --- Top Right Contextual Note ---
note = ("If $M$ has a 1 at $(j,k)$ and 0 elsewhere:\n\n"
        r"$\frac{1}{|G|} \sum_{g \in G} D^J_{ij}(g^{-1}) D^K_{kl}(g) = \frac{1}{\text{dim}J} \delta_{jk} \delta_{il} \delta_{JK}$")
ax.text(14.5, 6.5, note, ha='center', va='center', color=C_SUB,
        fontsize=11, linespacing=1.8,
        bbox=dict(boxstyle="round,pad=0.8", facecolor=C_BOX_BG, edgecolor=C_BOX_BD, alpha=0.9))

# --- Legend ---
legend_elements = [
    mpatches.Patch(facecolor=plt.cm.colors.to_rgba(C_DJ, 0.3), edgecolor=C_DJ, label='Irrep $D^J$'),
    mpatches.Patch(facecolor=plt.cm.colors.to_rgba(C_M, 0.3), edgecolor=C_M, label='Arbitrary $M$'),
    mpatches.Patch(facecolor=plt.cm.colors.to_rgba(C_DK, 0.3), edgecolor=C_DK, label='Irrep $D^K$'),
    mpatches.Patch(facecolor=plt.cm.colors.to_rgba(C_SIGMA, 0.3), edgecolor=C_SIGMA, label='Diagonal Result'),
]
ax.legend(handles=legend_elements, loc='upper left', bbox_to_anchor=(0.01, 0.98),
          facecolor=C_BOX_BG, edgecolor=C_BOX_BD, labelcolor=C_TEXT, fontsize=10)

plt.tight_layout()
plt.show()