# AI Debug Explainer

A VS Code extension that helps newcomers learn complex projects through AI-powered debugging explanations. The extension automatically generates project overviews and provides contextual explanations of functions during debugging sessions.

## Key Features

- **Project Overview Generation**: Automatically generates a comprehensive overview showing all files, functions, and dependency relationships.
- **Interactive Debugging Assistance**: Provides AI-powered explanations of functions during debugging sessions (triggered via F11).
- **Knowledge Library**: Builds a personal library of function explanations for future reference, accessible via a dedicated panel.
- **AI Integration**: Supports OpenAI, Moonshot, or compatible services with configurable settings.

## How It Works

1.  **Project Overview**: When you start a debugging session, the extension analyzes your project structure, key functions, and dependencies.
2.  **Debugging**: Step into functions using `F11`. The extension sends the current function context to the AI service.
3.  **Explanation**: The AI generates an explanation of the function's purpose, inputs, outputs, and logic, which is displayed and saved.
4.  **Review**: Access all generated explanations in the Knowledge Panel.

## Prerequisites

- Visual Studio Code (version 1.74.0 or higher)
- Node.js and npm
- An API key for an AI service (OpenAI, Moonshot, or compatible)

## Installation & Configuration

1.  **Install the Extension**:
    - Clone the repository: `git clone <repository-url>`
    - Install dependencies: `npm install`
    - Compile: `npm run compile`
    - Press `F5` to launch the extension in a development host.
    *(Or install via .vsix package if available)*

2.  **Configure AI Service**:
    Open VS Code Settings (`Ctrl+,`) and search for "AI Debug Explainer". Set the following:
    - `ai-debug-explainer.apiKey`: Your API key.
    - `ai-debug-explainer.apiUrl`: API endpoint (defaults to OpenAI).
    - `ai-debug-explainer.model`: Model to use (defaults to `gpt-3.5-turbo`).

## Usage Guide

### Getting Started

1.  **Toggle Extension**: Open Command Palette (`Ctrl+Shift+P`) and run `AI Debug Explainer: Toggle`.
2.  **Start Debugging**: Open your project (or the provided `example/calculator.js`), set breakpoints, and start debugging (`F5`).
3.  **Step & Explain**: Use `F11` to step into functions. The extension will automatically request and display an AI explanation.
4.  **View Knowledge**: Open Command Palette and run `AI Debug Explainer: Show Knowledge Library`.

### Example Workflow
1. Open `example/calculator.js`.
2. Set a breakpoint.
3. Start debugging.
4. Step into various functions.
5. Watch as AI explanations appear and fill your library.

### Using the Knowledge MSP Panel

The Knowledge MSP (Map, Search, Process) panel is a powerful sidebar tool that helps you organize, explore, and understand project knowledge in an interactive way. Here's how to use it effectively:

#### Opening the Panel
- The Knowledge Map panel is located in the Activity Bar on the left side of VS Code
- Click on the "AI Debug Explainer" icon in the Activity Bar
- Select "Knowledge Map" to open the panel

#### Setting Context
1. **Copy Text**: Select and copy any text (from code, documentation, or other sources) that you want to analyze
2. **Set Context**: Use the keyboard shortcut `Ctrl+Alt+S` (or `Cmd+Alt+S` on Mac) to set the copied text as context
3. **Visualize**: The panel will show the text organized into paragraphs with a clean layout

#### Explaining Terms
1. **Select Term**: Highlight a word or phrase in your code editor that you want explained
2. **Copy and Explain**: Copy the selection (`Ctrl+C`) and use the shortcut `Ctrl+Alt+E` (or `Cmd+Alt+E` on Mac)
3. **View Explanation**: The AI-generated explanation will appear in the Knowledge Map panel, associated with the relevant paragraph
4. **Expand/Collapse**: Click on the term chips to expand or collapse their explanations

#### Different Explanation Types
The extension explains a term through three pedagogical approaches — **Encapsulation**, **Reduction**, and **Concretization** — and two independent switches:

- **Modifier → auto-visualization**: `Ctrl+Alt+{key}` explains *without* generating a visualization; `Ctrl+Shift+{key}` explains *and* auto-generates a visualization script bonded to the term.
- **Language → global mode**: `Ctrl+Alt+F` toggles the whole extension between **Natural Language** and **Math** mode. Whichever mode is active decides whether the prompt uses plain-language description or mathematical formulation (LaTeX). The current mode is shown in the status bar (click it to toggle).

So with the language mode set to Natural, `Ctrl+Alt+E` gives a natural-language encapsulation and `Ctrl+Shift+E` gives the same plus a visualization; flip to Math (`Ctrl+Alt+F`) and both now produce mathematical encapsulations.

| Approach       | No auto-viz  | Auto-viz       |
| -------------- | ------------ | -------------- |
| Encapsulation  | `Ctrl+Alt+E` | `Ctrl+Shift+E` |
| Reduction      | `Ctrl+Alt+R` | `Ctrl+Shift+R` |
| Concretization | `Ctrl+Alt+C` | `Ctrl+Shift+C` |
| Deduction      | `Ctrl+Alt+D` | `Ctrl+Shift+D` |

Comparative learning from the Architecture tab follows the same rule: `Ctrl+Alt+X` compares without visualization, `Ctrl+Shift+X` compares and auto-generates a visualization; language comes from the global mode.

Manual visualization is separate: `Ctrl+Alt+V` generates an animated visualization, `Ctrl+Shift+V` generates a static diagram (both act on the clipboard expression directly).

#### Interactive Features
- **Nested Context**: When explaining terms within existing explanations, the panel creates nested views for better organization
- **Markdown Support**: The panel renders Markdown formatting for better readability
- **LaTeX/KaTeX Support**: Mathematical formulas in LaTeX format are rendered beautifully
- **Architecture Tab**: Switch to the Architecture tab to visualize project architecture diagrams generated by the AI

#### Managing Knowledge
- **Trace Integration**: When debugging, function explanations are automatically added to the Knowledge Map
- **Persistent Storage**: All knowledge is saved between VS Code sessions
- **Clear Data**: Use commands in the Command Palette to clear traces or function explanations when needed

#### Best Practices
1. Set contextual code snippets before asking for explanations to get more relevant answers
2. Switch the global language mode (`Ctrl+Alt+F`) between Natural and Math depending on whether you want plain-language intuition or formal derivation
3. Use the `Ctrl+Shift+` variants when you want a visualization generated alongside the explanation, `Ctrl+Alt+` when you only want the text
4. Organize your knowledge by setting different contexts for different parts of your project
5. Leverage the architecture visualization to understand system design patterns

### Knowledge Panel Commands
- `AI Debug Explainer: Extract Context` - Set clipboard content as current context (`Ctrl+Alt+S`)
- `AI Debug Explainer: Encapsulation` / `Reduction` / `Concretization` / `Deduction` - Explain the selected term (`Ctrl+Alt+E/R/C/D`), no visualization
- `AI Debug Explainer: … (Auto-Visualize)` - Same approaches *plus* an auto-generated visualization (`Ctrl+Shift+E/R/C/D`)
- `AI Debug Explainer: Compare` / `Compare (Auto-Visualize)` - Comparative learning from the Architecture tab (`Ctrl+Alt+X` / `Ctrl+Shift+X`)
- `AI Debug Explainer: Toggle Language Mode` - Switch the global Natural/Math language mode (`Ctrl+Alt+F`)

## Technical Architecture & Project Structure

**Core Components:**
- **Extension Entry Point** ([src/extension.ts](src/extension.ts)): Manages lifecycle and commands.
- **AI Service** ([src/aiService.ts](src/aiService.ts)): Handles AI communication and prompting.
- **Debug Session Tracker** ([src/debugSessionTracker.ts](src/debugSessionTracker.ts)): Monitors debug events and captures traces.
- **Knowledge Library** ([src/knowledgeLibrary.ts](src/knowledgeLibrary.ts)): Manages storage of explanations.
- **Knowledge Panel** ([src/knowledgeMapPanel.ts](src/knowledgeMapPanel.ts)): Webview interface for browsing explanations.

**File Structure:**
```
.
├── src/                  # Source code
│   ├── extension.ts
│   ├── aiService.ts
│   ├── ...
├── example/              # Example project (calculator.js)
├── out/                  # Compiled output
├── package.json          # Extension manifest
└── ...
```

## Supported Languages

- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#

## Troubleshooting

- **Extension Not Working**: Verify API key and internet connection. Ensure debug session is active.
- **No Explanations**: Ensure you are stepping *into* functions (`F11`). Check Output panel for errors.
- **Knowledge Panel Empty**: Ensure extension is toggled ON and you have successfully debugged/stepped through code.

## Development

- **Compile**: `npm run compile`
- **Watch**: `npm run watch`
- **Test**: `npm run test`
- **Package**: `npx vsce package`

## License

This project is licensed under the MIT License.