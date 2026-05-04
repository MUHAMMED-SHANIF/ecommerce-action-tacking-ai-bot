const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'frontend/src');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // === PRIMARY GREEN ===
    // #1b5e20 → #0B3D2E (deep green)
    content = content.replace(/#1b5e20/gi, '#0B3D2E');
    // #144216 → #145A3A (hover/gradient green)
    content = content.replace(/#144216/gi, '#145A3A');
    // #059669 → #145A3A (secondary green accents)
    content = content.replace(/#059669/gi, '#145A3A');
    // #388e3c → #0B3D2E (discount green, rating green)
    content = content.replace(/#388e3c/gi, '#0B3D2E');
    // #22c55e → #F59E0B (category hover green → orange accent)
    content = content.replace(/#22c55e/gi, '#F59E0B');

    // === ACCENT ORANGE ===
    // #cddc39 (lime) → #F59E0B (orange)
    // Fix text color: lime had text-gray-900, orange needs text-white
    content = content.replace(/bg-\[#cddc39\]\s*text-gray-900/g, 'bg-[#F59E0B] text-white');
    content = content.replace(/text-gray-900\s*bg-\[#cddc39\]/g, 'text-white bg-[#F59E0B]');
    content = content.replace(/#cddc39/gi, '#F59E0B');
    // #b7c433 (lime hover) → #FFB020 (orange hover)
    content = content.replace(/#b7c433/gi, '#FFB020');
    // #ff9f00 (old orange cart button) → #F59E0B
    content = content.replace(/#ff9f00/gi, '#F59E0B');
    // #fb641b → #F59E0B (if any remain)
    content = content.replace(/#fb641b/gi, '#F59E0B');

    // === YELLOW → ORANGE ===
    content = content.replace(/text-yellow-300/g, 'text-[#F59E0B]');
    content = content.replace(/text-yellow-200/g, 'text-[#FFB020]');
    content = content.replace(/bg-yellow-400/g, 'bg-[#F59E0B]');
    content = content.replace(/hover:bg-yellow-300/g, 'hover:bg-[#FFB020]');

    // === BACKGROUND ===
    // #f1f2f4 → #F5EFE6 (soft cream)
    content = content.replace(/#f1f2f4/gi, '#F5EFE6');
    // #f1f3f6 → #F5EFE6
    content = content.replace(/#f1f3f6/gi, '#F5EFE6');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(__dirname, filePath)}`);
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
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(directory);
files.forEach(replaceInFile);
console.log('\nDone! Theme updated.');
