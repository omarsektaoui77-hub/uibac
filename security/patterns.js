// Secret pattern detectors for ZeroLeak Security Engine

module.exports = {
  // Slack Webhook URLs (expanded to catch variants)
  slackWebhook: /hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/gi,
  
  // Base64 encoded secrets (long base64 strings that might be secrets)
  // More specific to avoid file paths - look for standalone base64 strings
  base64Secret: /(?:^|\s)([A-Za-z0-9+/]{40,}={0,2})(?:\s|$)/g,
  
  // OpenAI API keys
  openAIKey: /sk-[a-zA-Z0-9]{48,}/g,
  
  // Firebase API keys
  firebaseKey: /AIza[a-zA-Z0-9_-]{35}/g,
  
  // AWS Access Keys
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  
  // GitHub tokens
  githubToken: /ghp_[a-zA-Z0-9]{36}/g,
  
  // Stripe API keys
  stripeKey: /sk_(live|test)_[a-zA-Z0-9]{24,}/g,
  
  // Twilio keys
  twilioKey: /SK[a-f0-9]{32}/g,
  
  // SendGrid keys
  sendGridKey: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
  
  // Database URLs (PostgreSQL, MySQL, MongoDB)
  databaseUrl: /(postgres|mysql|mongodb):\/\/[a-zA-Z0-9:_-]+@[a-zA-Z0-9.-]+:[0-9]+/g,
  
  // JWT tokens
  jwtToken: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  
  // Private keys (RSA, SSH)
  privateKey: /-----BEGIN (RSA )?PRIVATE KEY-----/g,
  
  // API keys with common prefixes
  apiKeyPrefix: /(api_key|apikey|api-key)\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
  
  // Heuristic: String concatenation with env vars (fragmentation attack)
  envConcatenation: /['"](https?:\/\/[^'"]+)['"]\s*\+\s*(process\.env|process\.getenv)/gi,
  
  // Heuristic: Outbound exfiltration (fetch/axios with env vars)
  exfiltration: /(fetch|axios|http\.request)\s*\(\s*['"]https?:\/\/[^'"]*['"]\s*\+\s*process\.env/gi,
  
  // Heuristic: External domain with env var (potential exfiltration)
  externalDomainEnv: /['"]https?:\/\/[^'"]*['"]\s*\+\s*process\.env/gi,
  
  // Zero Trust: Forbidden patterns (hard block) - more specific to avoid false positives
  forbiddenConsoleLog: /console\.log\s*\(\s*process\.env\.[A-Z_]+/gi,
  forbiddenFetchEnv: /fetch\s*\(\s*["'`]?process\.env\.[A-Z_]+/gi,
  forbiddenAxiosEnv: /axios\.(post|get|put|delete)\s*\(\s*["'`]?process\.env\.[A-Z_]+/gi,
  
  // All patterns combined
  allPatterns: function() {
    return [
      this.slackWebhook,
      this.base64Secret,
      this.openAIKey,
      this.firebaseKey,
      this.awsAccessKey,
      this.githubToken,
      this.stripeKey,
      this.twilioKey,
      this.sendGridKey,
      this.databaseUrl,
      this.jwtToken,
      this.privateKey,
      this.apiKeyPrefix,
      this.envConcatenation,
      this.exfiltration,
      this.externalDomainEnv,
      this.forbiddenConsoleLog,
      this.forbiddenFetchEnv,
      this.forbiddenAxiosEnv
    ];
  },
  
  // Get pattern name for reporting
  getPatternName: function(pattern) {
    const names = {
      [this.slackWebhook]: 'Slack Webhook URL',
      [this.base64Secret]: 'Base64 Encoded Secret',
      [this.openAIKey]: 'OpenAI API Key',
      [this.firebaseKey]: 'Firebase API Key',
      [this.awsAccessKey]: 'AWS Access Key',
      [this.githubToken]: 'GitHub Token',
      [this.stripeKey]: 'Stripe API Key',
      [this.twilioKey]: 'Twilio Key',
      [this.sendGridKey]: 'SendGrid Key',
      [this.databaseUrl]: 'Database URL',
      [this.jwtToken]: 'JWT Token',
      [this.privateKey]: 'Private Key',
      [this.apiKeyPrefix]: 'API Key',
      [this.envConcatenation]: 'Suspicious: URL + Env Var (Fragmentation)',
      [this.exfiltration]: 'Suspicious: Exfiltration Attempt',
      [this.externalDomainEnv]: 'Suspicious: External Domain + Env Var',
      [this.forbiddenConsoleLog]: 'FORBIDDEN: console.log with process.env',
      [this.forbiddenFetchEnv]: 'FORBIDDEN: fetch with process.env',
      [this.forbiddenAxiosEnv]: 'FORBIDDEN: axios with process.env'
    };
    return names[pattern] || 'Unknown Pattern';
  }
};
