/**
 * A simple calculator demonstrating C++ support
 */

#include <iostream>
#include <cmath>
#include <stdexcept>

class Calculator {
public:
    /**
     * Adds two numbers together
     */
    int add(int a, int b) {
        return a + b;
    }
    
    /**
     * Subtracts second number from first
     */
    int subtract(int a, int b) {
        return a - b;
    }
    
    /**
     * Multiplies two numbers
     */
    int multiply(int a, int b) {
        return a * b;
    }
    
    /**
     * Divides first number by second
     */
    double divide(double a, double b) {
        if (b == 0) {
            throw std::invalid_argument("Division by zero");
        }
        return a / b;
    }
    
    /**
     * Calculates the power of a number
     */
    double power(double base, int exponent) {
        return std::pow(base, exponent);
    }
};

/**
 * Calculates factorial of a number
 */
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

/**
 * Main function to demonstrate calculator usage
 */
int main() {
    Calculator calc;
    
    std::cout << "Addition: 5 + 3 = " << calc.add(5, 3) << std::endl;
    std::cout << "Subtraction: 10 - 4 = " << calc.subtract(10, 4) << std::endl;
    std::cout << "Multiplication: 6 * 7 = " << calc.multiply(6, 7) << std::endl;
    std::cout << "Division: 15 / 3 = " << calc.divide(15.0, 3.0) << std::endl;
    std::cout << "Power: 2^8 = " << calc.power(2, 8) << std::endl;
    std::cout << "Factorial: 5! = " << factorial(5) << std::endl;
    
    return 0;
}