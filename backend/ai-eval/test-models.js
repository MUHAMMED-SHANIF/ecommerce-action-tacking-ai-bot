const { callGroq } = require('../services/aiProviders/groqProvider');
const { callOllama } = require('../services/aiProviders/ollamaProvider');
const { getSystemPrompt } = require('../services/aiService');

const MODELS_TO_TEST = [
  { provider: 'groq', model: 'llama-3.1-8b-instant', name: 'Groq Llama 3.1 8B' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B' },
  { provider: 'ollama', model: 'qwen2.5:7b', name: 'Ollama Qwen 2.5 7B' }
];

const testCases = [
  { id: 1, role: 'user', input: "Find phones under 20000 and add the first to cart", expected_type: 'multi_step' },
  { id: 2, role: 'seller', input: "Show my sales report for this month", expected_type: 'tool_call', expected_tool: 'seller_sales_report' },
  { id: 3, role: 'admin', input: "How many users signed up this week?", expected_type: 'tool_call', expected_tool: 'admin_view_users' }
];

function scoreResult(testCase, data) {
  const json_valid = !!data && typeof data === 'object';
  const correct_type = data?.type === testCase.expected_type;
  const correct_tool = testCase.expected_tool ? data?.tool === testCase.expected_tool : true;
  
  return {
    json_valid,
    correct_type,
    correct_tool,
    overall: json_valid && correct_type && correct_tool
  };
}

async function runEvaluation() {
  console.log('🧪 Testing AI Models for E-Mart ActionBot\n');
  const results = {};

  for (const model of MODELS_TO_TEST) {
    console.log(`\nTesting: ${model.name}`);
    console.log('─'.repeat(60));
    
    results[model.name] = { passed: 0, total: testCases.length, avgLatency: 0, details: [] };
    
    for (const testCase of testCases) {
      process.stdout.write(`  ${testCase.id}. ${testCase.input.slice(0, 40)}... `);
      
      const messages = [
        { role: 'system', content: `Respond in JSON. Available tools: search_products, add_to_cart, seller_sales_report, admin_view_users.` },
        { role: 'user', content: testCase.input }
      ];
      
      const providerFunc = model.provider === 'groq' ? callGroq : callOllama;
      const res = await providerFunc(messages, { model: model.model, settings: { temperature: 0.1 } });
      
      const scores = scoreResult(testCase, res.data);
      results[model.name].details.push({ ...res, scores });

      if (scores.overall) {
        results[model.name].passed++;
        console.log('✅');
      } else {
        console.log('❌', res.error || 'Wrong output');
      }
    }
    
    const details = results[model.name].details;
    results[model.name].avgLatency = Math.round(details.reduce((s, d) => s + (d.latency || 0), 0) / details.length);
  }

  // Comparison Table
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESULTS COMPARISON');
  console.log('═'.repeat(80));
  console.log('Model                    | Pass%  | Latency');
  console.log('─'.repeat(80));
  
  Object.entries(results).forEach(([name, stats]) => {
    const passRate = Math.round((stats.passed / stats.total) * 100);
    console.log(`${name.padEnd(24)} | ${String(passRate).padStart(5)}% | ${stats.avgLatency}ms`);
  });
  console.log('═'.repeat(80));
}

runEvaluation();
