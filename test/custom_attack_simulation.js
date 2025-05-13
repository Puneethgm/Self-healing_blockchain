// Custom attack simulation script to test blockchain monitoring protection

const AttackDetector = artifacts.require("AttackDetector");
const SelfHealingManager = artifacts.require("SelfHealingManager");
const VulnerabilityPatches = artifacts.require("VulnerabilityPatches");
const SecureToken = artifacts.require("SecureToken");

contract("Custom Attack Simulation", async (accounts) => {
  const owner = accounts[0];
  const attacker = accounts[1];

  let attackDetector;
  let selfHealingManager;
  let vulnerabilityPatches;
  let secureToken;

  before(async () => {
    attackDetector = await AttackDetector.deployed();
    selfHealingManager = await SelfHealingManager.deployed();
    vulnerabilityPatches = await VulnerabilityPatches.deployed();
    secureToken = await SecureToken.deployed();
  });

  it("should simulate a high gas usage attack and verify protection", async () => {
    // Simulate a transaction with excessive gas usage
    await attackDetector.recordTransaction(attacker, 6000000, true, 0);

    // Check if attacker got flagged
    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");

    // Check if attacker got blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted");

    console.log("High gas usage attack detected and attacker blacklisted successfully.");
  });

  it("should simulate multiple failed transactions attack and verify detection", async () => {
    // Simulate multiple failed transactions
    for (let i = 0; i < 4; i++) {
      await attackDetector.recordTransaction(attacker, 50000, false, i);
    }

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");

    console.log("Multiple failed transactions attack detected successfully.");
  });

  it("should simulate double spending attack and verify detection", async () => {
    // Simulate transactions with repeated nonce to mimic double spending
    await attackDetector.recordTransaction(attacker, 10000, true, 1);
    await attackDetector.recordTransaction(attacker, 10000, true, 1);

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Double spending attack was not detected");

    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for double spending");

    console.log("Double spending attack detected and attacker blacklisted successfully.");
  });

  it("should simulate data tampering attack and verify detection", async () => {
    // Simulate suspicious activity representing data tampering
    // For example, record a transaction with inconsistent or invalid data
    await attackDetector.recordTransaction(attacker, 0, false, 9999); // Invalid gas and nonce

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Data tampering attack was not detected");

    console.log("Data tampering attack detected successfully.");
  });
});
