# TradePrivate Deployed Contracts

## Configuration

Voici la configuration actuelle pour le réseau **Sepolia** :

- **Chain ID**: `11155111`
- **RPC**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY_HERE`

## Addresses des Contrats

- **TradePrivate Core**: `0xC7f9bDe6F483205282064219a8aa084fb5a05b97`
- **ZK Verifier Manager**: `0x2BE2cEB1016Bb5aa15c95032E82b46Fd7C0E595c`
- **Mock USDC**: `0xAfb77C2408AC6d3704d7476B2002BD7d035cF8D6`

## Network Information
- **Chain**: Sepolia Testnet (Chain ID: 11155111)
- **RPC**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY_HERE`
- **Deployed**: Latest deployment
- **Status**: Active

## Usage
These addresses are now hardcoded in the application configuration at:
- `src/lib/config/constants.js`

## Wallet Setup
To use the application:
1. **Connect to Sepolia**: Make sure your wallet is connected to Sepolia testnet
2. **Get Sepolia ETH**: Get test ETH from a Sepolia faucet
3. **Contract Interaction**: The app will automatically verify contract deployment

## Troubleshooting
If you get "contract not deployed" errors:
1. Verify you're on Sepolia network (Chain ID: 11155111)
2. Check the contract addresses on Etherscan Sepolia
3. Enable development mode to bypass verification temporarily

## Environment Variables (Optional)
```bash
VITE_CHAIN_ID=11155111
VITE_TRADE_PRIVATE_ADDRESS=0xC7f9bDe6F483205282064219a8aa084fb5a05b97
VITE_ZK_VERIFIER_MANAGER_ADDRESS=0x2BE2cEB1016Bb5aa15c95032E82b46Fd7C0E595c
VITE_USDC_ADDRESS=0xAfb77C2408AC6d3704d7476B2002BD7d035cF8D6
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY_HERE

# Development flags
VITE_DEV_MODE=true
VITE_SKIP_SIGNATURE_VERIFICATION=true  # Skip contract verification
``` 