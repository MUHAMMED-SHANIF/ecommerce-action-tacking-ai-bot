const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { buildToolsPrompt } = require('../tools');
const cases = require('./cases.json');
const { callUniversalAI } = require('./models/universal');

// Helper to colorize console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

const SYSTEM_PROMPT_TEMPLATE = `You are ActionBot, a friendly and helpful AI shopping assistant for EMart.
You help customers search products, get recommendations, compare items, track orders, etc.

You have access to the following tools:
{{TOOLS_PROMPT}}

RESPONSE RULES (CRITICAL):
1. You MUST respond with ONLY raw valid JSON — no markdown, no explanation.
2. If a tool definition contains "[REQUIRES USER CONFIRMATION]", you MUST use "confirmation_request" FIRST.
3. Use types: "reply", "tool_call", "confirmation_request", "multi_step".

Type A — Conversational reply: {"type": "reply", "text": "..."}
Type B — Tool call: {"type": "tool_call", "tool": "...", "params": {...}}
Type C — Confirmation needed: {"type": "confirmation_request", "action": "...", "params": {...}, "question": "..."}
`;

async function evaluate() {
    const toolsPrompt = buildToolsPrompt();
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{{TOOLS_PROMPT}}', toolsPrompt);

    const activeModelName = process.env.EVAL_AI_MODEL || 'mistral';
    const activeBaseUrl = process.env.EVAL_AI_BASE_URL || 'http://localhost:11434/v1';

    const models = [
        { name: `Universal AI (${activeModelName} @ ${activeBaseUrl})`, fn: callUniversalAI }
    ];

    const results = [];

    console.log(`${colors.cyan}=== Starting AI Performance Evaluation ===${colors.reset}\n`);

    for (const model of models) {
        console.log(`${colors.blue}Testing Model: ${model.name}${colors.reset}`);
        const modelResults = {
            model: model.name,
            total_cases: cases.length,
            passed_json: 0,
            passed_tool: 0,
            total_latency: 0,
            details: []
        };

        for (const testCase of cases) {
            process.stdout.write(`  [${testCase.id}/${cases.length}] ${testCase.name}... `);
            
            const result = await model.fn(testCase.prompt, systemPrompt);
            
            if (result.error) {
                console.log(`${colors.red}FAILED (Error: ${result.error})${colors.reset}`);
                modelResults.details.push({ id: testCase.id, name: testCase.name, status: 'error', error: result.error });
                continue;
            }

            modelResults.total_latency += result.latency;
            
            const detail = {
                id: testCase.id,
                name: testCase.name,
                latency: result.latency,
                json_valid: !!result.parsed,
                tool_correct: false,
                response: result.parsed
            };

            if (detail.json_valid) {
                modelResults.passed_json++;
                
                // Validate tool selection
                const actualType = result.parsed.type;
                const actualTool = result.parsed.tool || result.parsed.action;
                
                if (actualType === testCase.expected_type) {
                    if (!testCase.expected_tool || actualTool === testCase.expected_tool) {
                        detail.tool_correct = true;
                        modelResults.passed_tool++;
                    }
                }
            }

            const statusColor = detail.tool_correct ? colors.green : (detail.json_valid ? colors.yellow : colors.red);
            const statusText = detail.tool_correct ? 'PASS' : (detail.json_valid ? 'MISMATCH' : 'INVALID JSON');
            console.log(`${statusColor}${statusText}${colors.reset} (${result.latency}ms)`);
            
            modelResults.details.push(detail);
        }

        modelResults.avg_latency = Math.round(modelResults.total_latency / modelResults.total_cases);
        results.push(modelResults);
        console.log(`\n${colors.cyan}--- Summary for ${model.name} ---${colors.reset}`);
        console.log(`JSON Validity: ${modelResults.passed_json}/${modelResults.total_cases}`);
        console.log(`Tool Accuracy: ${modelResults.passed_tool}/${modelResults.total_cases}`);
        console.log(`Avg Latency:   ${modelResults.avg_latency}ms\n`);
    }

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, `results/report_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log(`${colors.green}Evaluation complete! Report saved to: ${reportPath}${colors.reset}`);
}

evaluate().catch(err => console.error(`${colors.red}Evaluation Fatal Error:${colors.reset}`, err));
