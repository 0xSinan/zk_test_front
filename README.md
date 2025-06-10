# TradePrivate dApp

> Privacy-First Perpetual DEX using Zero-Knowledge Proofs

[![License](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-4.2-orange.svg)](https://svelte.dev/)

TradePrivate is the first production-ready dark pool perpetual DEX that provides complete privacy through zero-knowledge proofs while maintaining capital efficiency and MEV protection.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/tradeprivate/tradeprivate-dapp.git
cd tradeprivate-dapp

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run development setup
npm run setup-dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [SDK Usage](#-sdk-usage)
- [Contributing](#-contributing)
- [License](#-license)

## 🔥 Features

### Core Privacy Features
- **Zero-Knowledge Proofs**: Complete order privacy using ZK-SNARKs
- **Account Anonymity**: Private account creation with commitment schemes
- **Order Encryption**: End-to-end encrypted order data
- **Nullifier System**: Double-spend protection without revealing order details

### Trading Features  
- **Dark Pool Trading**: MEV-protected order execution
- **Perpetual Contracts**: Up to 100x leverage
- **Capital Efficiency**: Minimal collateral requirements
- **Fast Settlement**: Near-instant order matching

### Security Features
- **Circuit Breaker**: Automatic protection mechanisms
- **Keeper System**: Decentralized order execution
- **Access Controls**: Multi-layer permission system
- **Emergency Pause**: Admin controls for critical situations

### Technical Features
- **Modular Architecture**: Clean, maintainable codebase
- **TypeScript Support**: Full type safety
- **Mobile Responsive**: PWA-ready design
- **Real-time Updates**: WebSocket integration

## 🏗 Architecture

### Frontend Stack
- **Framework**: SvelteKit 1.27+
- **Styling**: Custom CSS with design tokens
- **State Management**: Svelte stores
- **Build Tool**: Vite 4.5+
- **Package Manager**: npm

### Blockchain Integration
- **Web3 Library**: Viem + Wagmi
- **Wallet Support**: MetaMask, WalletConnect
- **Network Support**: Ethereum Mainnet, Sepolia Testnet

### Cryptography
- **ZK Circuits**: Circom/SnarkJS
- **Encryption**: AES-GCM with ECDH key exchange
- **Key Derivation**: HKDF with secure salts
- **Hashing**: Poseidon (ZK-friendly)

### Project Structure
```
tradeprivate-dapp/
├── public/                 # Static assets
│   ├── circuits/          # ZK circuit files (.wasm, .zkey)
│   ├── favicon.png        # App icon
│   └── manifest.json      # PWA manifest
├── src/
│   ├── lib/
│   │   ├── components/    # Reusable Svelte components
│   │   ├── config/        # App configuration
│   │   ├── contracts/     # Smart contract ABIs
│   │   ├── crypto/        # Cryptographic utilities
│   │   ├── stores/        # Svelte stores
│   │   ├── tradeprivate/  # Core SDK
│   │   └── utils/         # Helper functions
│   ├── routes/            # SvelteKit routes
│   ├── app.html           # HTML template
│   ├── app.css            # Global styles
│   └── main.js            # App entry point
├── scripts/               # Development scripts
├── tests/                 # Test suites
├── .github/workflows/     # CI/CD pipelines
└── docs/                  # Documentation
```

## 💻 Installation

### Prerequisites
- **Node.js**: ≥18.0.0
- **npm**: ≥8.0.0
- **Git**: Latest version

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Browser**: Chrome 100+, Firefox 100+, Safari 14+

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/tradeprivate/tradeprivate-dapp.git
   cd tradeprivate-dapp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure Environment**
   Edit `.env` with your settings:
   ```env
   # Blockchain
   VITE_CHAIN_ID=1
   VITE_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   
   # Contracts (replace with actual addresses)
   VITE_TRADE_PRIVATE_CONTRACT=0x...
   VITE_ZK_VERIFIER_MANAGER=0x...
   
   # API Keys
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
   VITE_ALCHEMY_API_KEY=your_alchemy_key
   ```

5. **Development Setup**
   ```bash
   npm run setup-dev
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_CHAIN_ID` | Blockchain network ID | `1` | ✅ |
| `VITE_RPC_URL` | RPC endpoint URL | - | ✅ |
| `VITE_TRADE_PRIVATE_CONTRACT` | Main contract address | - | ✅ |
| `VITE_ZK_VERIFIER_MANAGER` | Verifier contract address | - | ✅ |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | - | ✅ |
| `VITE_DEV_MODE` | Enable development features | `false` | ❌ |
| `VITE_DEBUG_LOGS` | Enable debug logging | `false` | ❌ |
| `VITE_MOCK_ZK_PROOFS` | Use mock proofs in dev | `false` | ❌ |

### Security Configuration

#### HKDF Salt Configuration
```env
VITE_HKDF_SALT=your-32-byte-salt-here
```

Generate a secure salt:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Session Management
```env
VITE_SESSION_TIMEOUT=3600000    # 1 hour
VITE_MAX_CONCURRENT_SESSIONS=5
```

### ZK Circuit Configuration

Place circuit files in `public/circuits/`:
- `account_creation.wasm` & `account_creation_pk.bin`
- `order_submission.wasm` & `order_submission_pk.bin`  
- `batch_execution.wasm` & `batch_execution_pk.bin`

## 🔧 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run test suite |
| `npm run test:ui` | Run tests with UI |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code |
| `npm run typecheck` | Check TypeScript types |

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Code Quality Checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

3. **Format Code**
   ```bash
   npm run format
   ```

4. **Build & Test**
   ```bash
   npm run build
   npm run preview
   ```

### Hot Reload
The development server supports hot module replacement (HMR) for instant updates during development.

### Environment-Specific Features
- **Development**: Mock data, debug logs, circuit simulation
- **Staging**: Real contracts on testnet
- **Production**: Mainnet contracts, optimizations

## 🔒 Security

### Security Principles

1. **Zero Trust Architecture**: Verify everything, trust nothing
2. **Defense in Depth**: Multiple security layers
3. **Privacy by Design**: Built-in privacy protection
4. **Secure by Default**: Safe default configurations

### Key Security Features

#### Cryptographic Security
- **Key Management**: Secure key generation and storage
- **Encryption**: AES-256-GCM with ECDH key exchange
- **Hashing**: Poseidon for ZK compatibility
- **Random Number Generation**: Cryptographically secure RNG

#### Application Security
- **Input Validation**: Client and server-side validation
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Same-site cookies and tokens
- **Secure Headers**: Security-focused HTTP headers

#### Smart Contract Security
- **Access Controls**: Role-based permissions
- **Reentrancy Protection**: OpenZeppelin guards
- **Emergency Pause**: Circuit breaker pattern
- **Slashing Mechanisms**: Economic security incentives

### Security Best Practices

#### For Developers
1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Validate all inputs** before processing
4. **Follow secure coding guidelines**
5. **Regular security audits** and updates

#### For Users
1. **Use hardware wallets** when possible
2. **Verify contract addresses** before interacting
3. **Keep software updated** to latest versions
4. **Enable two-factor authentication** where available
5. **Be cautious of phishing** attempts

### Security Audit

The project undergoes regular security audits:
- **Smart Contracts**: Audited by leading security firms
- **Frontend Code**: Automated security scanning
- **Dependencies**: Regular vulnerability assessments
- **Infrastructure**: Penetration testing

## 🧪 Testing

### Test Strategy

We employ a comprehensive testing strategy:

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Component interaction testing  
3. **End-to-End Tests**: Full user workflow testing
4. **Security Tests**: Vulnerability and penetration testing

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- AccountStatus.test.js

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run tests with UI
npm run test:ui
```

### Test Structure
```
tests/
├── unit/
│   ├── components/        # Component tests
│   ├── crypto/           # Cryptography tests
│   ├── stores/           # Store tests
│   └── utils/            # Utility tests
├── e2e/
│   ├── wallet-connection.spec.js
│   ├── account-creation.spec.js
│   └── order-submission.spec.js
└── setup.js              # Test configuration
```

### Mocking Strategy

For reliable testing, we mock external dependencies:
- **Blockchain Calls**: Mock Web3 providers
- **ZK Circuits**: Mock proof generation
- **API Calls**: Mock HTTP responses
- **Wallet Connections**: Mock wallet interactions

## 🚀 Deployment

### Build Process

1. **Production Build**
   ```bash
   npm run build
   ```

2. **Build Verification**
   ```bash
   npm run preview
   ```

3. **Asset Optimization**
   - Code splitting
   - Tree shaking
   - Minification
   - Compression

### Deployment Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

#### Docker
```bash
# Build Docker image
npm run build:docker

# Run container
docker run -p 3000:3000 tradeprivate-dapp
```

#### Static Hosting
```bash
# Build static files
npm run build

# Deploy the 'build' directory to your hosting provider
```

### Environment-Specific Deployments

#### Staging
- **URL**: https://staging.tradeprivate.finance
- **Network**: Sepolia Testnet
- **Features**: Debug logging, test data

#### Production
- **URL**: https://tradeprivate.finance
- **Network**: Ethereum Mainnet
- **Features**: Optimized, monitoring enabled

### CI/CD Pipeline

Our GitHub Actions workflow:

1. **Code Quality**
   - Linting
   - Type checking
   - Security scanning

2. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

3. **Build**
   - Production build
   - Asset optimization
   - Docker image creation

4. **Deploy**
   - Staging deployment
   - Production deployment (on main branch)

## 📊 Monitoring

### Performance Monitoring

#### Core Web Vitals
- **LCP**: Largest Contentful Paint < 2.5s
- **FID**: First Input Delay < 100ms
- **CLS**: Cumulative Layout Shift < 0.1

#### Custom Metrics
- **ZK Proof Generation Time**: < 30s
- **Transaction Confirmation Time**: < 60s
- **Order Submission Success Rate**: > 99%

### Error Monitoring

#### Sentry Integration
```env
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

#### Custom Error Tracking
- **JavaScript Errors**: Automatic capture
- **Network Errors**: API failure tracking
- **User Actions**: Failed transaction tracking

### Analytics

#### Privacy-Preserving Analytics
- **No Personal Data**: Anonymous usage tracking
- **Aggregated Metrics**: Statistical analysis only
- **Opt-out Available**: User privacy controls

#### Key Metrics
- **Daily Active Users**
- **Order Submission Volume**
- **Error Rates**
- **Performance Metrics**

### Health Checks

#### Application Health
```bash
# Check application status
curl https://tradeprivate.finance/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "99.99%",
  "lastDeployment": "2024-01-15T10:30:00Z"
}
```

#### Infrastructure Monitoring
- **Server Response Times**
- **Database Performance**
- **CDN Performance**
- **Third-party Service Status**

## 📚 SDK Usage

### TradePrivate SDK

The SDK provides a clean interface for interacting with the TradePrivate protocol.

#### Installation
```javascript
import { TradePrivateSDK } from '$lib/tradeprivate';
```

#### Initialization
```javascript
const sdk = new TradePrivateSDK({
  chainId: 1,
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-key',
  contracts: {
    tradePrivate: '0x...',
    zkVerifierManager: '0x...'
  }
});

await sdk.initialize();
```

#### Account Management
```javascript
// Create private account
const account = await sdk.account.create({
  privateKey: userPrivateKey,
  initialDeposit: '1000' // USDC
});

// Check account status
const status = await sdk.account.getStatus(commitment);

// Deposit funds
await sdk.account.deposit(amount);

// Withdraw funds
await sdk.account.withdraw(amount, proof);
```

#### Order Management
```javascript
// Submit private order
const order = await sdk.orders.submit({
  type: 'market',
  side: 'buy',
  amount: '100',
  leverage: 10,
  slippage: 0.5
});

// Get order status
const status = await sdk.orders.getStatus(orderId);

// Cancel order
await sdk.orders.cancel(orderId);
```

#### Cryptographic Operations
```javascript
// Generate commitment
const commitment = await sdk.crypto.generateCommitment(
  privateKey,
  amount,
  nonce
);

// Create ZK proof
const proof = await sdk.crypto.generateProof('order_submission', {
  privateInputs: { privateKey, amount },
  publicInputs: { commitment, nullifier }
});

// Encrypt order data
const encrypted = await sdk.crypto.encryptOrder(orderData, recipientKey);
```

#### Event Listening
```javascript
// Listen for order events
sdk.events.on('orderSubmitted', (event) => {
  console.log('Order submitted:', event);
});

// Listen for account events
sdk.events.on('accountCreated', (event) => {
  console.log('Account created:', event);
});
```

#### Error Handling
```javascript
try {
  await sdk.orders.submit(orderData);
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    // Handle insufficient balance
  } else if (error instanceof ProofGenerationError) {
    // Handle proof generation failure
  } else {
    // Handle other errors
  }
}
```

### Advanced Usage

#### Custom Circuit Integration
```javascript
// Load custom circuit
await sdk.circuits.load('custom_circuit', {
  wasmPath: '/circuits/custom.wasm',
  zkeyPath: '/circuits/custom_pk.bin'
});

// Generate proof with custom circuit
const proof = await sdk.crypto.generateProof('custom_circuit', inputs);
```

#### Batch Operations
```javascript
// Submit multiple orders
const orders = await sdk.orders.submitBatch([
  { type: 'limit', side: 'buy', amount: '50', price: '100' },
  { type: 'limit', side: 'sell', amount: '75', price: '110' }
]);
```

## 🤝 Contributing

We welcome contributions to TradePrivate! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Add** tests for new functionality
5. **Ensure** all tests pass
6. **Submit** a pull request

### Code Standards

- **TypeScript**: Use TypeScript for type safety
- **ESLint**: Follow our linting rules
- **Prettier**: Use consistent code formatting
- **Comments**: Document complex logic
- **Tests**: Include tests for new features

### Security Disclosures

For security vulnerabilities, please email security@tradeprivate.finance instead of opening a public issue.

## 📄 License

This project is licensed under the Business Source License 1.1 (BUSL-1.1). See the [LICENSE](LICENSE) file for details.

### License Summary
- **Non-Production Use**: Free for non-production use
- **Production Use**: Requires commercial license after 4 years
- **Source Available**: Code is publicly available
- **Contributions**: Welcome under the same license

## 🆘 Support

### Documentation
- **API Docs**: [docs.tradeprivate.finance](https://docs.tradeprivate.finance)
- **Tutorials**: [learn.tradeprivate.finance](https://learn.tradeprivate.finance)
- **FAQ**: [help.tradeprivate.finance](https://help.tradeprivate.finance)

### Community
- **Discord**: [discord.gg/tradeprivate](https://discord.gg/tradeprivate)
- **Twitter**: [@TradePrivate](https://twitter.com/TradePrivate)
- **GitHub**: [Issues & Discussions](https://github.com/tradeprivate/tradeprivate-dapp)

### Professional Support
- **Email**: support@tradeprivate.finance
- **Response Time**: 24-48 hours
- **Priority Support**: Available for enterprise users

---

**Built with ❤️ by the TradePrivate Team**

*Privacy is not a luxury, it's a fundamental right.* 