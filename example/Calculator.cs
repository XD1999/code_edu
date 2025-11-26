/**
 * A simple calculator class demonstrating C# support
 */
using System;

public class Calculator {
    
    /**
     * Adds two numbers together
     */
    public int Add(int a, int b) {
        return a + b;
    }
    
    /**
     * Subtracts second number from first
     */
    public int Subtract(int a, int b) {
        return a - b;
    }
    
    /**
     * Multiplies two numbers
     */
    public int Multiply(int a, int b) {
        return a * b;
    }
    
    /**
     * Divides first number by second
     */
    public double Divide(double a, double b) {
        if (b == 0) {
            throw new DivideByZeroException("Division by zero");
        }
        return a / b;
    }
    
    /**
     * Calculates the power of a number
     */
    public double Power(double baseNum, int exponent) {
        return Math.Pow(baseNum, exponent);
    }
    
    /**
     * Main method to demonstrate calculator usage
     */
    public static void Main(string[] args) {
        Calculator calc = new Calculator();
        
        Console.WriteLine("Addition: 5 + 3 = " + calc.Add(5, 3));
        Console.WriteLine("Subtraction: 10 - 4 = " + calc.Subtract(10, 4));
        Console.WriteLine("Multiplication: 6 * 7 = " + calc.Multiply(6, 7));
        Console.WriteLine("Division: 15 / 3 = " + calc.Divide(15.0, 3.0));
        Console.WriteLine("Power: 2^8 = " + calc.Power(2, 8));
    }
}