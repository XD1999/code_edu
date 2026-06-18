const fs = require('fs');
const content = fs.readFileSync('out/knowledgeMapPanel.js', 'utf8');

// Extract all nonce script blocks
const regex = /<script nonce="\$\{nonce\}">([\s\S]*?)<\/script>/g;
let match;
let blockNum = 0;
while ((match = regex.exec(content)) !== null) {
    blockNum++;
    const js = match[1];
    const tempFile = `temp_block${blockNum}.js`;
    fs.writeFileSync(tempFile, js, 'utf8');
    console.log(`Block ${blockNum}: ${js.length} chars, written to ${tempFile}`);
}

// Now check each block for syntax errors using eval in a try-catch
for (let i = 1; i <= blockNum; i++) {
    const tempFile = `temp_block${i}.js`;
    const js = fs.readFileSync(tempFile, 'utf8');
    try {
        new Function(js);
        console.log(`Block ${i}: SYNTAX OK`);
    } catch (e) {
        console.log(`Block ${i}: SYNTAX ERROR: ${e.message}`);
    }
}
