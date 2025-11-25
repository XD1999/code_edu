# AI Debug Explainer

A VS Code extension that helps newcomers learn complex projects through AI-powered debugging explanations.

## Features

- Automatically generates a comprehensive project overview showing all files, functions, and dependency relationships
- Provides AI-powered explanations of functions during debugging sessions
- Builds a knowledge library of function explanations for future reference
- Interactive knowledge panel to browse explanations

## How It Works

1. **Project Overview Generation**: When you start a debugging session, the extension automatically generates a comprehensive overview of your project, including:
   - File structure and organization
   - Key functions and their roles
   - Dependency relationships between modules

2. **Interactive Debugging Assistance**: During debugging:
   - Step into functions using F11
   - The extension sends all functions in the current trace to AI for explanation
   - Explanations include function purpose, inputs, outputs, and processing logic
   - All explanations are saved to your personal knowledge library

3. **Knowledge Library**: 
   - Stores all generated explanations
   - Available for reference during future debugging sessions
   - Accessible through the Knowledge Panel

## Setup

1. Install the extension in VS Code
2. Configure your AI service settings:
   - `ai-debug-explainer.apiKey`: Your API key for OpenAI, Moonshot, or compatible service
   - `ai-debug-explainer.apiUrl`: API endpoint (defaults to OpenAI)
   - `ai-debug-explainer.model`: Model to use (defaults to gpt-3.5-turbo)

## Usage

1. Toggle the extension on/off using the Command Palette (`Ctrl+Shift+P`) and running "AI Debug Explainer: Toggle"
2. Start a debugging session (F5)
3. Step into functions (F11) to trigger AI explanations
4. View your knowledge library with "AI Debug Explainer: Show Knowledge Library"

## Supported Languages

- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#

## Requirements

- VS Code 1.74.0 or higher
- Access to an AI service (OpenAI, Moonshot, or compatible)