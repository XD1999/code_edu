"""
Static diagram: A bijective linear map T: V -> W has a well-defined
linear inverse T^{-1}, proving T is invertible.
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle
from matplotlib.lines import Line2D

# ---------- quality defaults ----------
plt.rcParams.update({
    "figure.dpi": 150,
    "savefig.dpi": 200,
    "font.family": "DejaVu Sans",
    "font.size": 12,
    "axes.linewidth": 1.4,
    "path.sketch": None,
})

# ---------- palette ----------
BG       = "#0f1424"   # deep navy background
PANEL    = "#161c33"
GRID     = "#26304f"
AXIS     = "#8a93b8"
V_TINT   = "#1b3a4b"
W_TINT   = "#3a1b3a"
V_ACCENT = "#36d3ff"   # cyan for V
W_ACCENT = "#ff5d8f"   # magenta for W
T_COLOR  = "#ffd166"   # warm yellow for T arrow
INV_COLOR= "#7cf08a"   # green for T^{-1} arrow
TEXT     = "#eef2ff"
SUBTEXT  = "#aab2d5"

# ---------- linear map ----------
theta = np.deg2rad(28)
s = 1.35
T = s * np.array([[np.cos(theta), -np.sin(theta)],
                  [np.sin(theta),  np.cos(theta)]])
Tinv = np.linalg.inv(T)

# sample vectors in V (basis + a few)
vecs_V = np.array([
    [1.0, 0.0],
    [0.0, 1.0],
    [1.6, 0.6],
    [0.6, 1.6],
    [2.1, 0.9],
])
vecs_W = vecs_V @ T.T          # images under T

labels_V = ["e₁", "e₂", "v₁", "v₂", "v₃"]
labels_W = ["T(e₁)", "T(e₂)", "T(v₁)", "T(v₂)", "T(v₃)"]

# ---------- figure ----------
fig = plt.figure(figsize=(16, 9), facecolor=BG)
ax  = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0,16); ax.set_ylim(0,9)
ax.set_aspect("equal"); ax.axis("off")

# subtle background vignette panels
for (x0,y0,w,h,clr) in [(0.4,1.0,6.6,7.0,V_TINT),(8.9,1.0,6.6,7.0,W_TINT)]:
    ax.add_patch(FancyBboxPatch((x0,y0), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.25",
                 fc=clr, ec=GRID, lw=1.5, alpha=0.55, zorder=0))

# ---------- title ----------
ax.text(8.0, 8.55,
        "Bijective Linear Map  T : V → W  and its Inverse  T⁻¹ : W → V",
        ha="center", va="center", color=TEXT, fontsize=20, fontweight="bold",
        zorder=10)
ax.text(8.0, 8.12,
        "Injective  +  Surjective   ⇒   T is invertible,   T⁻¹∘T = id_V ,  T∘T⁻¹ = id_W",
        ha="center", va="center", color=SUBTEXT, fontsize=12.5, zorder=10)

# ---------- helper: draw a coordinate plane ----------
def draw_plane(cx, cy, span=2.6, tint=V_TINT, accent=V_ACCENT,
               title="", subtitle=""):
    # grid
    for i in range(-6,7):
        ax.plot([cx+i*0.5, cx+i*0.5],[cy-span,cy+span],
                color=GRID, lw=0.7, alpha=0.55, zorder=1)
        ax.plot([cx-span,cx+span],[cy+i*0.5,cy+i*0.5],
                color=GRID, lw=0.7, alpha=0.55, zorder=1)
    # axes
    ax.annotate("", xy=(cx+span+0.15, cy), xytext=(cx-span-0.15, cy),
                arrowprops=dict(arrowstyle="-|>", color=AXIS, lw=1.8,
                                mutation_scale=14), zorder=2)
    ax.annotate("", xy=(cx, cy+span+0.15), xytext=(cx, cy-span-0.15),
                arrowprops=dict(arrowstyle="-|>", color=AXIS, lw=1.8,
                                mutation_scale=14), zorder=2)
    ax.text(cx+span+0.25, cy-0.18, "x", color=AXIS, fontsize=11, zorder=3)
    ax.text(cx-0.22, cy+span+0.25, "y", color=AXIS, fontsize=11, zorder=3)
    # title
    ax.text(cx, cy+span+0.55, title, ha="center", va="center",
            color=accent, fontsize=16, fontweight="bold", zorder=5)
    ax.text(cx, cy+span+0.18, subtitle, ha="center", va="center",
            color=SUBTEXT, fontsize=10.5, zorder=5)
    return cx, cy

cxV, cyV = 3.7, 4.2
cxW, cyW = 12.3, 4.2
draw_plane(cxV, cyV, span=2.6, tint=V_TINT, accent=V_ACCENT,
           title="V", subtitle="domain  ·  dim V = 2")
draw_plane(cxW, cyW, span=2.6, tint=W_TINT, accent=W_ACCENT,
           title="W", subtitle="codomain  ·  dim W = 2")

# ---------- draw vectors ----------
def draw_vec(cx, cy, v, color, label, lw=2.6, alpha=1.0, zorder=6,
             label_dx=0.18, label_dy=0.18, label_bg=True):
    ax.annotate("", xy=(cx+v[0], cy+v[1]), xytext=(cx, cy),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw,
                                mutation_scale=18, alpha=alpha),
                zorder=zorder)
    # tip marker
    ax.add_patch(Circle((cx+v[0], cy+v[1]), 0.055,
                 fc=color, ec="white", lw=1.2, zorder=zorder+1, alpha=alpha))
    # label
    if label_bg:
        ax.text(cx+v[0]+label_dx, cy+v[1]+label_dy, label,
                color=TEXT, fontsize=11.5, fontweight="bold",
                ha="left", va="bottom", zorder=zorder+2,
                bbox=dict(boxstyle="round,pad=0.2", fc="#0b1020",
                          ec=color, lw=1.0, alpha=0.92))
    else:
        ax.text(cx+v[0]+label_dx, cy+v[1]+label_dy, label,
                color=color, fontsize=11.5, fontweight="bold",
                ha="left", va="bottom", zorder=zorder+2)

# basis vectors drawn thicker
for i,(v,lab) in enumerate(zip(vecs_V, labels_V)):
    is_basis = i<2
    draw_vec(cxV, cyV, v, V_ACCENT if is_basis else "#9be7ff",
             lab, lw=3.2 if is_basis else 2.4,
             label_dy=0.22 if is_basis else 0.0,
             label_dx=0.22 if is_basis else 0.18)

for i,(v,lab) in enumerate(zip(vecs_W, labels_W)):
    is_basis = i<2
    draw_vec(cxW, cyW, v, W_ACCENT if is_basis else "#ffb3cc",
             lab, lw=3.2 if is_basis else 2.4,
             label_dy=0.22 if is_basis else 0.0,
             label_dx=0.22 if is_basis else 0.18)

# origin dots
ax.add_patch(Circle((cxV,cyV),0.07,fc="white",ec=AXIS,lw=1.2,zorder=8))
ax.add_patch(Circle((cxW,cyW),0.07,fc="white",ec=AXIS,lw=1.2,zorder=8))

# ---------- mapping arrows between planes ----------
# T : V -> W  (top, yellow)
arrow_T = FancyArrowPatch((cxV+2.9, cyV+1.7), (cxW-2.9, cyW+1.7),
                          connectionstyle="arc3,rad=-0.18",
                          arrowstyle="-|>", mutation_scale=32,
                          lw=3.2, color=T_COLOR, zorder=9)
ax.add_patch(arrow_T)
ax.text((cxV+cxW)/2, cyV+2.55, "T",
        ha="center", va="center", color=T_COLOR, fontsize=22,
        fontweight="bold", zorder=10,
        bbox=dict(boxstyle="round,pad=0.35", fc="#0b1020",
                  ec=T_COLOR, lw=1.6))
ax.text((cxV+cxW)/2, cyV+2.12, "linear · bijective",
        ha="center", va="center", color=SUBTEXT, fontsize=10.5, zorder=10)

# T^{-1} : W -> V  (bottom, green)
arrow_inv = FancyArrowPatch((cxW-2.9, cyW-1.7), (cxV+2.9, cyV-1.7),
                            connectionstyle="arc3,rad=-0.18",
                            arrowstyle="-|>", mutation_scale=32,
                            lw=3.2, color=INV_COLOR, zorder=9)
ax.add_patch(arrow_inv)
ax.text((cxV+cxW)/2, cyV-2.55, "T⁻¹",
        ha="center", va="center", color=INV_COLOR, fontsize=22,
        fontweight="bold", zorder=10,
        bbox=dict(boxstyle="round,pad=0.35", fc="#0b1020",
                  ec=INV_COLOR, lw=1.6))
ax.text((cxV+cxW)/2, cyV-2.12, "well-defined linear inverse",
        ha="center", va="center", color=SUBTEXT, fontsize=10.5, zorder=10)

# ---------- correspondence dashed links (one-to-one) ----------
link_pairs = [(0,0),(2,2),(4,4)]   # show a few 1-1 pairings
for (iV,iW) in link_pairs:
    pV = (cxV+vecs_V[iV,0], cyV+vecs_V[iV,1])
    pW = (cxW+vecs_W[iW,0], cyW+vecs_W[iW,1])
    ax.add_patch(FancyArrowPatch(pV, pW,
                 connectionstyle="arc3,rad=0.12",
                 arrowstyle="-", lw=1.0,
                 color="#5a6488", linestyle=(0,(4,3)),
                 alpha=0.7, zorder=4))

# ---------- property callouts ----------
def callout(x, y, w, h, title, body, accent):
    ax.add_patch(FancyBboxPatch((x,y), w, h,
                 boxstyle="round,pad=0.04,rounding_size=0.15",
                 fc="#0b1020", ec=accent, lw=1.6, alpha=0.95, zorder=7))
    ax.text(x+w/2, y+h-0.28, title, ha="center", va="top",
            color=accent, fontsize=11.5, fontweight="bold", zorder=8)
    ax.text(x+w/2, y+h-0.62, body, ha="center", va="top",
            color=TEXT, fontsize=10, zorder=8, wrap=True)

callout(0.55, 0.35, 3.0, 0.95, "INJECTIVE",
        "ker(T) = {0}\neach w ∈ W has\n≤ 1 pre-image", V_ACCENT)
callout(6.5, 0.35, 3.0, 0.95, "SURJECTIVE",
        "im(T) = W\nevery w ∈ W\nis hit by some v", W_ACCENT)
callout(12.45, 0.35, 3.0, 0.95, "INVERTIBLE",
        "T⁻¹ exists & is linear\nT⁻¹∘T = id_V\nT∘T⁻¹ = id_W", INV_COLOR)

# ---------- legend (top-right of V panel) ----------
legend_items = [
    Line2D([0],[0], color=V_ACCENT, lw=3, label="basis of V"),
    Line2D([0],[0], color="#9be7ff", lw=2.4, label="vectors vᵢ ∈ V"),
    Line2D([0],[0], color=W_ACCENT, lw=3, label="basis of W = T(basis)"),
    Line2D([0],[0], color="#ffb3cc", lw=2.4, label="images T(vᵢ) ∈ W"),
    Line2D([0],[0], color="#5a6488", lw=1.2, linestyle=(0,(4,3)),
           label="v ↔ T(v)  pairing"),
]
leg = ax.legend(handles=legend_items, loc="upper left",
                bbox_to_anchor=(0.04, 0.965), frameon=True,
                facecolor="#0b1020", edgecolor=GRID, labelcolor=TEXT,
                fontsize=9.5, ncol=5, columnspacing=1.6, handlelength=2.2)
leg.get_frame().set_linewidth(1.2)

# ---------- footer ----------
ax.text(8.0, 0.08,
        "T linear & bijective  ⟺  T carries a basis of V to a basis of W  ⟺  T⁻¹ is itself linear.",
        ha="center", va="center", color=SUBTEXT, fontsize=10.5, style="italic")

plt.show()