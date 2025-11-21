# AI Debug Explainer - Usage Guide

## Installation

1. Open VS Code
2. Navigate to Extensions (Ctrl+Shift+X)
3. Search for "AI Debug Explainer"
4. Click Install

## Configuration

Before using the extension, you need to configure your AI service credentials:

1. Open VS Code Settings (Ctrl+,)
2. Search for "AI Debug Explainer"
3. Set the following required values:
   - `ai-debug-explainer.apiKey`: Your API key for OpenAI, Moonshot, or compatible service
   - `ai-debug-explainer.apiUrl`: API endpoint (optional, defaults to OpenAI)
   - `ai-debug-explainer.model`: Model to use (optional, defaults to gpt-3.5-turbo)

## Getting Started

1. **Toggle the Extension**: 
   - Open the Command Palette (Ctrl+Shift+P)
   - Run "AI Debug Explainer: Toggle" to activate the extension

2. **Start Debugging**:
   - Set breakpoints in your code
   - Start a debugging session (F5)
   - The extension will automatically generate a project overview

3. **Step Through Code**:
   - Use F11 to step into functions
   - The extension will send all functions in the current trace to AI for explanation
   - Explanations will be saved to your knowledge library

4. **View Knowledge Library**:
   - Open the Command Palette (Ctrl+Shift+P)
   - Run "AI Debug Explainer: Show Knowledge Library"
   - Browse all generated explanations

## Features

### Project Overview Generation
When you start a debugging session, the extension automatically generates a comprehensive overview of your project including:
- File structure and organization
- Key functions and their roles
- Dependency relationships between modules

### Interactive Debugging Assistance
During debugging sessions:
- Step into functions using F11
- Receive AI-powered explanations of functions in the current trace
- Understand function purpose, inputs, outputs, and processing logic
- Build a personal knowledge library of explanations

### Knowledge Library
- Stores all generated explanations
- Available for reference during future debugging sessions
- Accessible through the Knowledge Panel

## Supported Languages

The extension supports debugging for:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#

## Example Workflow

1. Open the example project in the `example/` directory
2. Set a breakpoint in the [calculator.js](example/calculator.js) file
3. Start debugging with the "Debug Calculator" configuration
4. Step into various functions to see AI explanations
5. View the Knowledge Library to see all generated explanations

## Troubleshooting

### No Explanations Generated
- Check that your API key is correctly configured
- Verify your AI service is accessible
- Ensure you have an active internet connection

### Knowledge Panel Not Showing
- Make sure the extension is toggled on
- Try running "AI Debug Explainer: Show Knowledge Library" from the Command Palette

### Debugging Not Working
- Verify your launch configuration is correct
- Check that breakpoints are properly set
- Ensure your code can be executed in a debugging session