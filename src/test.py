import numpy as np
import matplotlib.pyplot as plt

# Define the function f(x) = 4 + x - 3x^3


def f(x):
    return 4 + x - 3*x**3


# Define the limit value
L = 2

# Create x values for plotting
x = np.linspace(0.5, 1.5, 1000)
y = f(x)

# Create the plot
plt.figure(figsize=(12, 8))

# Plot the function
plt.plot(x, y, 'b-', linewidth=2, label=r'$f(x) = 4 + x - 3x^3$')

# Plot the limit value
plt.axhline(y=L, color='r', linestyle='--', linewidth=1.5, label=r'$L = 2$')

# For ε = 1
epsilon1 = 1
# Find δ for ε = 1
# We need |f(x) - 2| < 1
# |3x^3 - x - 2| < 1
# |x - 1| * |3x^2 + 3x + 2| < 1
# If we restrict |x - 1| < 1, then |3x^2 + 3x + 2| < 20
# So |x - 1| < 1/20
delta1 = 0.05

# Plot the ε-band for ε = 1
plt.axhline(y=L + epsilon1, color='g', linestyle=':',
            linewidth=1.5, label=r'$L + \epsilon = 3$')
plt.axhline(y=L - epsilon1, color='g', linestyle=':',
            linewidth=1.5, label=r'$L - \epsilon = 1$')

# Plot the δ-interval for δ = 0.05
plt.axvline(x=1 - delta1, color='m', linestyle='-.',
            linewidth=1.5, label=r'$x = 1 - \delta$')
plt.axvline(x=1 + delta1, color='m', linestyle='-.',
            linewidth=1.5, label=r'$x = 1 + \delta$')

# For ε = 0.1
epsilon2 = 0.1
# Find δ for ε = 0.1
# |x - 1| < 0.1/20 = 0.005
delta2 = 0.005

# Plot the ε-band for ε = 0.1
plt.axhline(y=L + epsilon2, color='c', linestyle=':',
            linewidth=1, label=r'$L + \epsilon = 2.1$')
plt.axhline(y=L - epsilon2, color='c', linestyle=':',
            linewidth=1, label=r'$L - \epsilon = 1.9$')

# Plot the δ-interval for δ = 0.005
plt.axvline(x=1 - delta2, color='y', linestyle='-.',
            linewidth=1, label=r'$x = 1 - \delta$')
plt.axvline(x=1 + delta2, color='y', linestyle='-.',
            linewidth=1, label=r'$x = 1 + \delta$')

# Mark the point (1, 2)
plt.plot(1, L, 'ro', markersize=8)

# Set labels and title
plt.xlabel('x', fontsize=12)
plt.ylabel('f(x)', fontsize=12)
plt.title(
    r'Epsilon-Delta Definition of $\lim_{x \to 1} (4 + x - 3x^3) = 2$', fontsize=14)
plt.grid(True, alpha=0.3)
plt.legend()

# Set axis limits
plt.xlim(0.5, 1.5)
plt.ylim(1.5, 3.5)

# Add text annotations
plt.text(1.05, 2.8, r'For $\epsilon = 1$, choose $\delta = 0.05$',
         fontsize=11, color='m')
plt.text(1.05, 2.5, r'For $\epsilon = 0.1$, choose $\delta = 0.005$',
         fontsize=11, color='y')

plt.show()

# Print the mathematical solution
print("Mathematical Solution:")
print("=" * 50)
print("We need to find δ such that:")
print(r"|f(x) - 2| < ε when 0 < |x - 1| < δ")
print(r"|4 + x - 3x^3 - 2| < ε")
print(r"|2 + x - 3x^3| < ε")
print(r"|3x^3 - x - 2| < ε")
print(r"|x - 1| * |3x^2 + 3x + 2| < ε")

print("\nFor ε = 1:")
print("If we restrict |x - 1| < 1, then |3x^2 + 3x + 2| < 20")
print("So we need |x - 1| < 1/20 = 0.05")
print("Thus, δ = 0.05 works for ε = 1")

print("\nFor ε = 0.1:")
print("If we restrict |x - 1| < 1, then |3x^2 + 3x + 2| < 20")
print("So we need |x - 1| < 0.1/20 = 0.005")
print("Thus, δ = 0.005 works for ε = 0.1")
