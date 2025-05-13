# Self-Healing Blockchain

This project implements a self-healing blockchain system with attack detection and protection mechanisms.

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- npm
- Truffle
- Ganache CLI (for local blockchain development)

### Installing Ganache CLI

Ganache CLI is a command-line version of Ganache, a personal blockchain for Ethereum development you can use to deploy contracts, develop applications, and run tests.

To install Ganache CLI globally, run the following command:

```bash
npm install -g ganache-cli
```

You can verify the installation by running:

```bash
ganache-cli --version
```

### Starting Ganache and Deploying Contracts

You can start Ganache and deploy the smart contracts using the provided batch script:

```bash
./start_ganache_and_deploy.bat
```

This script will start Ganache CLI and deploy all necessary contracts to the local blockchain.

### Running Tests

To run the attack detection tests:

```bash
npx truffle test test/attack_detection_test.js
```

To run the custom attack simulation tests:

```bash
npx truffle test test/custom_attack_simulation.js
```

## Project Structure

- `contracts/`: Solidity smart contracts
- `migrations/`: Deployment scripts
- `monitoring/`: Blockchain monitoring and alerting system
- `test/`: Test scripts for attack detection and simulations
- `server/`: Backend server code

## Features

- Attack detection for various attack types including high transaction frequency, excessive gas usage, reentrancy, DDoS, double spending, and data tampering.
- Self-healing mechanisms to blacklist attackers and apply security patches.
- Machine learning-based attack detection integration.
- Real-time blockchain monitoring with WebSocket provider.

## Usage

Start the backend server:

```bash
npm start
```

The monitoring system will automatically start and subscribe to blockchain events.

## License

This project is licensed under the MIT License.
