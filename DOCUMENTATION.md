# AI Debug Explainer - Complete Documentation

## Overview

AI Debug Explainer is a VS Code extension that helps newcomers learn complex projects through AI-powered debugging explanations. The extension automatically generates project overviews and provides contextual explanations of functions during debugging sessions.

## Documentation Files

This project includes comprehensive documentation to help you understand, use, and contribute to the extension:

### 1. [README.md](README.md)
- High-level project overview
- Feature list
- Setup and usage instructions
- Supported languages

### 2. [USAGE.md](USAGE.md)
- Detailed usage guide
- Configuration instructions
- Step-by-step workflows
- Troubleshooting tips

### 3. [QUICKSTART.md](QUICKSTART.md)
- Fast-track setup guide
- Prerequisites
- Installation steps
- Running the extension
- Development workflow

### 4. [SUMMARY.md](SUMMARY.md)
- Technical architecture overview
- Component descriptions
- Project structure
- Future enhancement ideas

### 5. [ package.json](package.json)
- Extension manifest
- Configuration schema
- Command definitions
- Dependency list

## Source Code

The extension is organized into the following core components:

### Extension Entry Point
- [src/extension.ts](src/extension.ts) - Main extension logic and lifecycle management

### Core Services
- [src/aiService.ts](src/aiService.ts) - AI integration and prompt management
- [src/debugSessionTracker.ts](src/debugSessionTracker.ts) - Debug event monitoring
- [src/knowledgeLibrary.ts](src/knowledgeLibrary.ts) - Knowledge storage and retrieval
- [src/knowledgePanel.ts](src/knowledgePanel.ts) - Knowledge display interface

### Test Files
- [src/test/](src/test/) - Unit and integration tests

## Example Project

- [example/calculator.js](example/calculator.js) - Sample application for testing the extension

## Configuration

The extension can be configured through VS Code settings:

- `ai-debug-explainer.apiKey` - API key for AI service
- `ai-debug-explainer.apiUrl` - API endpoint URL
- `ai-debug-explainer.model` - AI model to use

## Development Scripts

- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch and recompile on changes
- `npm run test` - Run tests
- `npx vsce package` - Package extension for distribution

## Verification Scripts

- [verify-setup.sh](verify-setup.sh) - Verify project setup
- [package-extension.sh](package-extension.sh) - Package the extension

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## Support

For issues, feature requests, or questions, please [create an issue](<issue-tracker-url>) on the repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.