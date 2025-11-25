"""
A simple calculator module demonstrating Python support
"""

def add(a, b):
    """Adds two numbers together"""
    return a + b

def subtract(a, b):
    """Subtracts second number from first"""
    return a - b

def multiply(a, b):
    """Multiplies two numbers"""
    return a * b

def divide(a, b):
    """Divides first number by second"""
    if b == 0:
        raise ValueError("Division by zero")
    return a / b

def power(base, exponent):
    """Calculates the power of a number"""
    return base ** exponent

def factorial(n):
    """Calculates factorial of a number"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def main():
    """Main function to demonstrate calculator usage"""
    print("Addition: 5 + 3 =", add(5, 3))
    print("Subtraction: 10 - 4 =", subtract(10, 4))
    print("Multiplication: 6 * 7 =", multiply(6, 7))
    print("Division: 15 / 3 =", divide(15, 3))
    print("Power: 2^8 =", power(2, 8))
    print("Factorial: 5! =", factorial(5))

# Run the main function
if __name__ == "__main__":
    main()