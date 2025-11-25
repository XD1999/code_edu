/**
 * A simple calculator module demonstrating project structure
 */

class Calculator {
    /**
     * Adds two numbers together
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} Sum of a and b
     */
    add(a, b) {
        return a + b;
    }

    /**
     * Subtracts second number from first
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} Difference of a and b
     */
    subtract(a, b) {
        return a - b;
    }

    /**
     * Multiplies two numbers
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} Product of a and b
     */
    multiply(a, b) {
        return a * b;
    }

    /**
     * Divides first number by second
     * @param {number} a - Dividend
     * @param {number} b - Divisor
     * @returns {number} Quotient of a and b
     * @throws {Error} When dividing by zero
     */
    divide(a, b) {
        if (b === 0) {
            throw new Error("Division by zero");
        }
        return a / b;
    }

    /**
     * Calculates the power of a number
     * @param {number} base - Base number
     * @param {number} exponent - Exponent
     * @returns {number} base raised to the power of exponent
     */
    power(base, exponent) {
        return Math.pow(base, exponent);
    }
}

/**
 * Utility function to calculate factorial
 * @param {number} n - Number to calculate factorial for
 * @returns {number} Factorial of n
 */
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

/**
 * Main function to demonstrate calculator usage
 */
function main() {
    const calc = new Calculator();

    console.log("Addition: 5 + 3 =", calc.add(5, 3));
    console.log("Subtraction: 10 - 4 =", calc.subtract(10, 4));
    console.log("Multiplication: 6 * 7 =", calc.multiply(6, 7));
    console.log("Division: 15 / 3 =", calc.divide(15, 3));
    console.log("Power: 2^8 =", calc.power(2, 8));
    console.log("Factorial: 5! =", factorial(5));
}

// Run the main function
main();

module.exports = { Calculator, factorial };