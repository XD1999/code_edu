"use strict";
// Simple test to verify the extension components are working
exports.__esModule = true;
var aiService_1 = require("../aiService");
var knowledgeLibrary_1 = require("../knowledgeLibrary");
console.log('Testing AI Debug Explainer components...');
// Test that we can instantiate the classes
try {
    // This would normally be provided by VS Code
    var mockContext = {
        globalState: {
            get: function () { },
            update: function () { return Promise.resolve(); }
        }
    };
    var knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(mockContext);
    console.log('✓ KnowledgeLibrary instantiated successfully');
    var aiService = new aiService_1.AIService();
    console.log('✓ AIService instantiated successfully');
    console.log('All components instantiated successfully!');
}
catch (error) {
    console.error('Error instantiating components:', error);
}
