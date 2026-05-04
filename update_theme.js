const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'frontend/src');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Primary Dark Green
    content = content.replace(/#065f46/g, '#1b5e20');
    content = content.replace(/#047857/g, '#144216');

    // 2. Accent Lime
    content = content.replace(/bg-\[#fb641b\]\s*text-white/g, 'bg-[#cddc39] text-gray-900');
    content = content.replace(/text-white\s*bg-\[#fb641b\]/g, 'text-gray-900 bg-[#cddc39]');
    content = content.replace(/#fb641b/g, '#cddc39');
    
    // Also replace yellow-400 with accent where used (search button)
    content = content.replace(/bg-yellow-400\s*text-\[#1b5e20\]/g, 'bg-[#cddc39] text-gray-900');
    content = content.replace(/hover:bg-yellow-300/g, 'hover:bg-[#b7c433]'); // slightly darker lime for hover

    // 3. Background 
    content = content.replace(/#f1f3f6/g, '#ffffff');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(directory);
files.forEach(replaceInFile);
console.log('Done');
