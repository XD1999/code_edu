#!/bin/bash

# Script to package the VS Code extension

echo "Packaging AI Debug Explainer extension..."

# Compile TypeScript code
npm run compile

# Package the extension
npx vsce package

echo "Extension packaged successfully!"
echo "You can now install the .vsix file in VS Code."