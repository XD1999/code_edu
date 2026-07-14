import numpy as np
import matplotlib.pyplot as plt

# ===============================
# Publication-quality style
# ===============================
plt.rcParams.update({
    "figure.dpi": 300,
    "font.family": "DejaVu Sans",
    "font.size": 12,
    "axes.facecolor": "white",
    "figure.facecolor": "white"
})

# Colors
NUCLEUS = "#8B0000"

S_COLOR = "#4C78A8"

POS_COLOR = "#D62728"
NEG_COLOR = "#1F77B4"

D_POS = "#2CA02C"
D_NEG = "#9467BD"

ALPHA = 0.45

# =====================================
# helper
# =====================================
def setup_axis(ax):
    ax.set_aspect("equal")
    ax.set_xlim(-1.7,1.7)
    ax.set_ylim(-1.7,1.7)
    ax.axis("off")

# =====================================
# s orbital
# =====================================
def plot_s(ax):

    theta = np.linspace(0,2*np.pi,500)
    r = np.ones_like(theta)

    x = r*np.cos(theta)
    y = r*np.sin(theta)

    ax.fill(x,y,color=S_COLOR,alpha=ALPHA)
    ax.plot(x,y,color=S_COLOR,lw=2)

    ax.scatter(0,0,s=80,c=NUCLEUS,zorder=5)

    ax.set_title(r"$s$",fontsize=18)


# =====================================
# p orbital
# =====================================
def plot_p(ax):

    theta1 = np.linspace(-np.pi/2,np.pi/2,500)
    r1 = np.cos(theta1)

    x1 = r1*np.cos(theta1)
    y1 = r1*np.sin(theta1)

    theta2 = np.linspace(np.pi/2,3*np.pi/2,500)
    r2 = -np.cos(theta2)

    x2 = r2*np.cos(theta2)
    y2 = r2*np.sin(theta2)

    ax.fill(x1,y1,color=POS_COLOR,alpha=ALPHA)
    ax.fill(x2,y2,color=NEG_COLOR,alpha=ALPHA)

    ax.plot(x1,y1,color=POS_COLOR,lw=2)
    ax.plot(x2,y2,color=NEG_COLOR,lw=2)

    ax.scatter(0,0,s=80,c=NUCLEUS,zorder=5)

    ax.set_title(r"$p_x$",fontsize=18)


# =====================================
# d orbital
# =====================================
def plot_d(ax):

    theta = np.linspace(0,2*np.pi,2000)

    r = np.abs(np.cos(2*theta))

    x = r*np.cos(theta)
    y = r*np.sin(theta)

    sign = np.cos(2*theta)

    pos = sign >= 0
    neg = sign < 0

    ax.fill(x[pos],y[pos],color=D_POS,alpha=ALPHA)
    ax.fill(x[neg],y[neg],color=D_NEG,alpha=ALPHA)

    ax.plot(x[pos],y[pos],color=D_POS,lw=2)
    ax.plot(x[neg],y[neg],color=D_NEG,lw=2)

    ax.scatter(0,0,s=80,c=NUCLEUS,zorder=5)

    ax.set_title(r"$d_{xy}$",fontsize=18)


# =====================================
# figure
# =====================================
fig,axs = plt.subplots(
    1,3,
    figsize=(10,3.8)
)

plot_s(axs[0])
plot_p(axs[1])
plot_d(axs[2])

for ax in axs:
    setup_axis(ax)

fig.suptitle(
    "Atomic Orbitals",
    fontsize=20,
    fontweight="bold"
)

plt.tight_layout()

plt.show()