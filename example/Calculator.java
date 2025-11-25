/**
 * A simple calculator class demonstrating Java support
 */
public class Calculator {
    
    /**
     * Adds two numbers together
     * @param a First number
     * @param b Second number
     * @return Sum of a and b
     */
    public int add(int a, int b) {
        return a + b;
    }
    
    /**
     * Subtracts second number from first
     * @param a First number
     * @param b Second number
     * @return Difference of a and b
     */
    public int subtract(int a, int b) {
        return a - b;
    }
    
    /**
     * Multiplies two numbers
     * @param a First number
     * @param b Second number
     * @return Product of a and b
     */
    public int multiply(int a, int b) {
        return a * b;
    }
    
    /**
     * Divides first number by second
     * @param a Dividend
     * @param b Divisor
     * @return Quotient of a and b
     * @throws ArithmeticException When dividing by zero
     */
    public int divide(int a, int b) throws ArithmeticException {
        if (b == 0) {
            throw new ArithmeticException("Division by zero");
        }
        return a / b;
    }
    
    /**
     * Calculates the power of a number
     * @param base Base number
     * @param exponent Exponent
     * @return base raised to the power of exponent
     */
    public double power(double base, int exponent) {
        return Math.pow(base, exponent);
    }
    
    /**
     * Main method to demonstrate calculator usage
     */
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        
        System.out.println("Addition: 5 + 3 = " + calc.add(5, 3));
        System.out.println("Subtraction: 10 - 4 = " + calc.subtract(10, 4));
        System.out.println("Multiplication: 6 * 7 = " + calc.multiply(6, 7));
        System.out.println("Division: 15 / 3 = " + calc.divide(15, 3));
        System.out.println("Power: 2^8 = " + calc.power(2, 8));
    }
}