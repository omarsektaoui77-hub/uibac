// Secret pattern detectors for ZeroLeak Security Engine

module.exports = {
  // Slack Webhook URLs
  slackWebhook: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/g,
  
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
  
  // All patterns combined
  allPatterns: function() {
    return [
      this.slackWebhook,
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
      this.apiKeyPrefix
    ];
  },
  
  // Get pattern name for reporting
  getPatternName: function(pattern) {
    const names = {
      [this.slackWebhook]: 'Slack Webhook URL',
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
      [this.apiKeyPrefix]: 'API Key'
    };
    return names[pattern] || 'Unknown Pattern';
  }
};
