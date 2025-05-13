// File: migrations/2_deploy_contracts.js
const AttackDetector = artifacts.require("AttackDetector");
const SelfHealingManager = artifacts.require("SelfHealingManager");
const VulnerabilityPatches = artifacts.require("VulnerabilityPatches");
const SecureToken = artifacts.require("SecureToken");

module.exports = async function (deployer) {
  // Define attack detection thresholds
  const txFreqThreshold = 5;  // More than 5 transactions in quick succession is suspicious
  const gasThreshold = 5000000;  // More than 5M gas used in a short period is suspicious
  const failedTxThreshold = 3;  // More than 3 failed transactions is suspicious
  const ddosTxThreshold = 10; // Threshold for DDoS detection
  const doubleSpendNonceThreshold = 1; // Threshold for double spending detection
  const sybilActivityThreshold = 5; // Threshold for Sybil attack detection

  // Step 1: Deploy AttackDetector with all required thresholds
  await deployer.deploy(
    AttackDetector, 
    txFreqThreshold, 
    gasThreshold, 
    failedTxThreshold,
    ddosTxThreshold,
    doubleSpendNonceThreshold,
    sybilActivityThreshold
  );
  const attackDetector = await AttackDetector.deployed();
  console.log("AttackDetector deployed at:", attackDetector.address);

  // Step 2: Deploy SelfHealingManager
  await deployer.deploy(SelfHealingManager);
  const selfHealingManager = await SelfHealingManager.deployed();
  console.log("SelfHealingManager deployed at:", selfHealingManager.address);

  // Step 3: Deploy VulnerabilityPatches
  await deployer.deploy(VulnerabilityPatches);
  const vulnerabilityPatches = await VulnerabilityPatches.deployed();
  console.log("VulnerabilityPatches deployed at:", vulnerabilityPatches.address);

  // Step 4: Deploy SecureToken
  await deployer.deploy(SecureToken);
  const secureToken = await SecureToken.deployed();
  console.log("SecureToken deployed at:", secureToken.address);

  // Step 5: Link contracts together
  console.log("Linking contracts together...");
  
  // Link AttackDetector with SelfHealingManager
  await attackDetector.setSelfHealingManager(selfHealingManager.address);
  console.log("AttackDetector linked to SelfHealingManager");
  
  // Link SelfHealingManager with AttackDetector and VulnerabilityPatches
  await selfHealingManager.setAttackDetector(attackDetector.address);
  await selfHealingManager.setVulnerabilityPatches(vulnerabilityPatches.address);
  console.log("SelfHealingManager linked to AttackDetector and VulnerabilityPatches");
  
  // Link VulnerabilityPatches with SelfHealingManager
  await vulnerabilityPatches.setSelfHealingManager(selfHealingManager.address);
  console.log("VulnerabilityPatches linked to SelfHealingManager");
  
  // Link SecureToken with SelfHealingManager
  await secureToken.setSelfHealingManager(selfHealingManager.address);
  console.log("SecureToken linked to SelfHealingManager");
  
  console.log("All contracts deployed and linked successfully!");
};
