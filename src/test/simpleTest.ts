// Simple test to verify the extension components are working

import { AIService } from '../aiService';
import { KnowledgeLibrary } from '../knowledgeLibrary';
import { DebugSessionTracker } from '../debugSessionTracker';

console.log('Testing AI Debug Explainer components...');

// Test that we can instantiate the classes
try {
    // This would normally be provided by VS Code
    const mockContext: any = {
        globalState: {
            get: () => { },
            update: () => Promise.resolve()
        }
    };

    const knowledgeLibrary = new KnowledgeLibrary(mockContext);
    console.log('✓ KnowledgeLibrary instantiated successfully');

    const aiService = new AIService();
    console.log('✓ AIService instantiated successfully');

    console.log('All components instantiated successfully!');
} catch (error) {
    console.error('Error instantiating components:', error);
}