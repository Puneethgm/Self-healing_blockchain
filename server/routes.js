const express = require('express');
const router = express.Router();

const BlockchainMonitor = require('../monitoring/BlockchainMonitor');
const config = require('../monitoring/config.json');

const monitor = new BlockchainMonitor(config);
monitor.start();

router.get('/status', (req, res) => {
  res.json({ status: 'Self-Healing Blockchain Network API is running' });
});

router.get('/blacklist', (req, res) => {
  res.json({ blacklistedAddresses: Array.from(monitor.blacklistedAddresses) });
});

router.get('/attacks', (req, res) => {
  res.json({ recentAttacks: monitor.attackHistory.slice(-10) });
});

router.get('/ml-detections', (req, res) => {
  res.json({ recentMLDetections: monitor.mlDetector.getRecentDetections(10) });
});

router.post('/recovery/trigger', (req, res) => {
  // TODO: Implement logic to trigger recovery mode on SelfHealingManager contract
  res.json({ message: 'Recovery mode triggered (placeholder)' });
});

router.post('/recovery/exit', (req, res) => {
  // TODO: Implement logic to exit recovery mode on SelfHealingManager contract
  res.json({ message: 'Exited recovery mode (placeholder)' });
});

module.exports = router;

// Placeholder route to get system status
router.get('/status', (req, res) => {
  res.json({ status: 'Self-Healing Blockchain Network API is running' });
});

// Placeholder route to get blacklisted addresses
router.get('/blacklist', (req, res) => {
  // TODO: Implement logic to fetch blacklisted addresses from blockchain
  res.json({ blacklistedAddresses: [] });
});

// Placeholder route to trigger recovery mode
router.post('/recovery/trigger', (req, res) => {
  // TODO: Implement logic to trigger recovery mode on SelfHealingManager contract
  res.json({ message: 'Recovery mode triggered (placeholder)' });
});

// Placeholder route to exit recovery mode
router.post('/recovery/exit', (req, res) => {
  // TODO: Implement logic to exit recovery mode on SelfHealingManager contract
  res.json({ message: 'Exited recovery mode (placeholder)' });
});

module.exports = router;
