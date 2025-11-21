# AI Debug Explainer - Quick Start Guide

## Prerequisites

- Visual Studio Code (version 1.74.0 or higher)
- Node.js and npm
- An API key for an AI service (OpenAI, Moonshot, or compatible)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-debug-explainer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

## Configuration

1. Open VS Code and navigate to Settings (Ctrl+,)
2. Search for "AI Debug Explainer"
3. Set your API key in `ai-debug-explainer.apiKey`
4. Optionally configure:
   - `ai-debug-explainer.apiUrl` (default: OpenAI endpoint)
   - `ai-debug-explainer.model` (default: gpt-3.5-turbo)

## Running the Extension

1. Press `F5` to launch the extension in a development host
2. In the development host:
   - Open the example project: `example/calculator.js`
   - Set a breakpoint in the file
   - Start debugging (F5)
   - Step into functions (F11) to trigger AI explanations

## Using the Extension

1. **Toggle the Extension**:
   - Open Command Palette (Ctrl+Shift+P)
   - Run "AI Debug Explainer: Toggle"

2. **View Knowledge Library**:
   - Open Command Palette (Ctrl+Shift+P)
   - Run "AI Debug Explainer: Show Knowledge Library"

## Project Structure

```
src/
├── extension.ts          # Main extension logic
├── aiService.ts          # AI integration
├── debugSessionTracker.ts # Debug event handling
├── knowledgeLibrary.ts   # Knowledge storage
├── knowledgePanel.ts     # Knowledge display
example/
└── calculator.js         # Sample application
```

## Key Components

### Extension ([src/extension.ts](src/extension.ts))
- Entry point for the VS Code extension
- Manages extension lifecycle and commands

### AI Service ([src/aiService.ts](src/aiService.ts))
- Communicates with AI providers
- Generates prompts and processes responses

### Debug Session Tracker ([src/debugSessionTracker.ts](src/debugSessionTracker.ts))
- Monitors debugging sessions
- Captures function traces for explanation

### Knowledge Library ([src/knowledgeLibrary.ts](src/knowledgeLibrary.ts))
- Stores and retrieves explanations
- Manages persistent storage

### Knowledge Panel ([src/knowledgePanel.ts](src/knowledgePanel.ts))
- Displays explanations in a webview
- Provides user interface for knowledge browsing

## Troubleshooting

### Extension Not Working
- Verify API key is correctly configured
- Check internet connectivity
- Ensure debugging session is active

### No Explanations Generated
- Check that functions are being stepped into
- Verify AI service is accessible
- Look at VS Code output panel for error messages

### Knowledge Panel Empty
- Ensure the extension is toggled on
- Check that debugging has been performed
- Verify explanations are being generated

## Development

### Compiling
```bash
npm run compile
```

### Watching for Changes
```bash
npm run watch
```

### Testing
```bash
npm run test
```

## Packaging

To create a .vsix package:
```bash
npx vsce package
```

## Support

For issues and feature requests, please [create an issue](<issue-tracker-url>) on the repository.