"use strict";
// Simple test to verify the extension components are working
Object.defineProperty(exports, "__esModule", { value: true });
const aiService_1 = require("../aiService");
const knowledgeLibrary_1 = require("../knowledgeLibrary");
console.log('Testing AI Debug Explainer components...');
// Test that we can instantiate the classes
try {
    // This would normally be provided by VS Code
    const mockContext = {
        globalState: {
            get: () => { },
            update: () => Promise.resolve()
        }
    };
    const knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(mockContext);
    console.log('✓ KnowledgeLibrary instantiated successfully');
    const aiService = new aiService_1.AIService();
    console.log('✓ AIService instantiated successfully');
    console.log('All components instantiated successfully!');
}
catch (error) {
    console.error('Error instantiating components:', error);
}
//# sourceMappingURL=simpleTest.js.map