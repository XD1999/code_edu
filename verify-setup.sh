#!/bin/bash

# Script to verify the AI Debug Explainer setup

echo "Verifying AI Debug Explainer setup..."

# Check if required files exist
echo "Checking for required files..."
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "src/extension.ts"
  "src/aiService.ts"
  "src/debugSessionTracker.ts"
  "src/knowledgeLibrary.ts"
  "src/knowledgePanel.ts"
  "example/calculator.js"
  ".vscode/launch.json"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing file: $file"
    MISSING_FILES=$((MISSING_FILES + 1))
  else
    echo "✅ Found file: $file"
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo "❌ $MISSING_FILES required files are missing"
  exit 1
fi

echo "✅ All required files are present"

# Check if node_modules exists
echo "Checking for dependencies..."
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules directory not found. Run 'npm install' first."
  exit 1
else
  echo "✅ node_modules directory found"
fi

# Check if compiled output exists
echo "Checking for compiled output..."
if [ ! -d "out" ]; then
  echo "⚠️  out directory not found. Run 'npm run compile' to compile the extension."
else
  JS_FILES=$(find out -name "*.js" | wc -l)
  if [ $JS_FILES -gt 0 ]; then
    echo "✅ Compiled JavaScript files found ($JS_FILES files)"
  else
    echo "❌ No compiled JavaScript files found. Run 'npm run compile'."
    exit 1
  fi
fi

echo "Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Configure your AI service API key in VS Code settings"
echo "2. Press F5 to launch the extension in a development host"
echo "3. Open example/calculator.js and start debugging"
echo "4. Step into functions to see AI explanations"