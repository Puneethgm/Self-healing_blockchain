# Self-Healing Blockchain Network for Attack Detection and Prevention

## Overview

This project implements a self-healing blockchain network that detects and prevents attacks using smart contracts and monitoring tools. The system includes:

- **AttackDetector**: A smart contract that monitors suspicious activities such as high transaction frequency, excessive gas usage, failed transactions, reentrancy, DoS, DDoS, double spending, and Sybil attacks.
- **SelfHealingManager**: Manages attack responses including blacklisting addresses, applying security patches, and managing healing states.
- **VulnerabilityPatches**: Manages security patches that can be applied or reverted dynamically to protect the network.
- **SecureToken**: A token contract with built-in security checks to prevent transactions involving blacklisted addresses.
- **Monitoring System**: JavaScript scripts to monitor blockchain events and alert the system.
- **Backend Server**: Express.js server providing API endpoints to interact with the network.

## What Has Been Done

- Developed Solidity smart contracts for attack detection, self-healing management, vulnerability patching, and secure token.
- Created migration scripts to deploy contracts on a local Ganache blockchain.
- Implemented monitoring scripts to listen for blockchain events and trigger alerts.
- Built a backend server to expose APIs for interacting with the self-healing network.
- Provided deployment automation via `start_ganache_and_deploy.bat` script.
- Added comprehensive linking between contracts to enable coordinated attack detection and response.

## Execution Steps

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Ganache and Deploy Contracts**

   Run the batch script to start Ganache, compile, deploy contracts, run tests, and start monitoring:

   ```bash
   .\start_ganache_and_deploy.bat
   ```

3. **Start Backend Server**

   In a new terminal, start the Express backend server:

   ```bash
   npm start
   ```

4. **Interact with the Network**

   Use the API endpoints defined in `server/routes.js` to check system status, view blacklisted addresses, and trigger recovery modes.
5. **attack stimulation using the custom attack**
    use the attack.js file to stimulate the attack on the network
    and also in this we are mainly focusing on the double spending ,DDos,data tampering,51% attack 

    **to run this test case **
    
     ```bash
     npx truffle test test/custom_attack_simulation.js
    ```


## Common Errors and Resolutions

- **Ganache Port Already in Use**

  ```
  Error: listen EADDRINUSE: address already in use 127.0.0.1:8545
  ```

  *Resolution*: Ensure no other Ganache instance or service is running on port 8545. Stop any existing Ganache processes or change the port in `truffle-config.js` and `start_ganache_and_deploy.bat`.

- **Solidity Compiler Version Mismatch**

  ```
  ParserError: Source file requires different compiler version
  ```

  *Resolution*: Update `truffle-config.js` to specify the Solidity compiler version `0.8.17` to match the contracts' pragma.

- **Deployment Errors Due to Missing Constructor Parameters**

  ```
  Invalid number of parameters for "undefined". Got X expected Y!
  ```

  *Resolution*: Ensure the deployment scripts provide all required constructor parameters for contracts, especially for `AttackDetector` which requires 6 parameters.

- **Missing Migrations Contract**

  ```
  Could not find artifacts for Migrations from any sources
  ```

  *Resolution*: Add the `Migrations.sol` contract to the `contracts` directory. This contract is required by Truffle for managing migrations.

- **Compilation Warnings About SPDX License Identifier**

  ```
  Warning: SPDX license identifier not provided in source file.
  ```

  *Resolution*: Add SPDX license identifiers at the top of each Solidity file, e.g., `// SPDX-License-Identifier: UNLICENSED`.

## Additional Notes

- The project uses Ganache as a local Ethereum blockchain for development and testing.
- The smart contracts are written in Solidity 0.8.17.
- The monitoring system and backend server are implemented in JavaScript using Node.js and Express.
- Tests are located in the `test` directory and can be run using Truffle.

---

For any further assistance or issues, please feel free to reach out.
# Self-healing_blockchain
