require('dotenv').config();

const MODEL_CONFIG = {
  // Groq models (cloud, fast)
  groq: {
    user: {
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      provider: 'groq',
      priority: 1,
      settings: {
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }
    },
    seller: {
      model: process.env.GROQ_SELLER_MODEL || 'llama-3.3-70b-versatile',
      provider: 'groq',
      priority: 1,
      settings: {
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      }
    },
    admin: {
      model: process.env.GROQ_ADMIN_MODEL || 'llama-3.3-70b-versatile',
      provider: 'groq',
      priority: 1,
      settings: {
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      }
    }
  },
  
  // Ollama models (local fallback)
  ollama: {
    user: {
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
      provider: 'ollama',
      priority: 2,
      settings: { temperature: 0.1, num_predict: 500 }
    },
    seller: {
      model: process.env.OLLAMA_SELLER_MODEL || 'qwen2.5:7b',
      provider: 'ollama',
      priority: 2,
      settings: { temperature: 0.1, num_predict: 800 }
    },
    admin: {
      model: process.env.OLLAMA_ADMIN_MODEL || 'qwen2.5:7b',
      provider: 'ollama',
      priority: 2,
      settings: { temperature: 0.1, num_predict: 800 }
    }
  }
};

function getModelsForRole(role) {
  const models = [];
  const normalizedRole = role === 'customer' ? 'user' : role;
  
  // Add Groq if configured
  if (process.env.GROQ_API_KEY) {
    models.push(MODEL_CONFIG.groq[normalizedRole] || MODEL_CONFIG.groq.user);
  }
  
  // Add Ollama as fallback
  models.push(MODEL_CONFIG.ollama[normalizedRole] || MODEL_CONFIG.ollama.user);
  
  return models.sort((a, b) => a.priority - b.priority);
}

module.exports = {
  MODEL_CONFIG,
  getModelsForRole
};
