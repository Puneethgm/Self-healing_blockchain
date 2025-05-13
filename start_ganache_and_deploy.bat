@echo off
REM Start Ganache CLI on port 8545 with deterministic accounts
start cmd /k "npx ganache-cli -p 8545 -d"

REM Wait for Ganache to start
timeout /t 5

REM Deploy contracts using Truffle migrations
truffle migrate --reset --network development

REM Run tests
truffle test --network development

REM Start monitoring script (adjust node path and script path as needed)
start cmd /k "node monitoring/BlockchainMonitor.js --config monitoring/config.json"
