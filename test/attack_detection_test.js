// File: test/attack_detection_test.js
const AttackDetector = artifacts.require("AttackDetector");
const SelfHealingManager = artifacts.require("SelfHealingManager");
const VulnerabilityPatches = artifacts.require("VulnerabilityPatches");
const SecureToken = artifacts.require("SecureToken");

contract("Attack Detection Tests", async (accounts) => {
  const owner = accounts[0];
  const attacker = accounts[1];
  const user1 = accounts[2];
  const user2 = accounts[3];
  
  let attackDetector;
  let selfHealingManager;
  let vulnerabilityPatches;
  let secureToken;
  
  beforeEach(async () => {
    // Deploy fresh instances of contracts for each test
    attackDetector = await AttackDetector.new(5, 5000000, 3, 5, 2, 3);
    selfHealingManager = await SelfHealingManager.new();
    vulnerabilityPatches = await VulnerabilityPatches.new();
    secureToken = await SecureToken.new();
    
    // Link contracts
    await attackDetector.setSelfHealingManager(selfHealingManager.address);
    await selfHealingManager.setAttackDetector(attackDetector.address);
    await selfHealingManager.setVulnerabilityPatches(vulnerabilityPatches.address);
    await vulnerabilityPatches.setSelfHealingManager(selfHealingManager.address);
    await secureToken.setSelfHealingManager(selfHealingManager.address);
  });
  
  it("should detect high transaction frequency attack", async () => {
    // Record multiple transactions in quick succession
    for (let i = 0; i < 6; i++) {
      await attackDetector.recordTransaction(attacker, 50000, true, i);
    }
    
    // Check if attacker got flagged
    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");
    
    // Check if attacker got blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted");
  });
  
  it("should detect excessive gas usage attack", async () => {
    // Record a transaction with excessive gas usage
    await attackDetector.recordTransaction(attacker, 6000000, true, 0);
    
    // Check if attacker got flagged
    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");
    
    // Check if attacker got blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted");
  });
  
  it("should detect multiple failed transactions attack", async () => {
    // Record multiple failed transactions
    for (let i = 0; i < 4; i++) {
      await attackDetector.recordTransaction(attacker, 50000, false, i);
    }
    
    // Check if attacker got flagged
    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");
  });
  
  it("should detect reentrancy attack pattern", async () => {
    // Simulate detection of a reentrancy attack
    await attackDetector.detectReentrancyPattern(attacker, "0x12345678");
    
    // Check if attacker got flagged
    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");
    
    // Check if a security patch was applied
    const patchId = 1; // Reentrancy patch ID
    const patchDetails = await vulnerabilityPatches.getPatchDetails(patchId);
    assert.isTrue(patchDetails[1], "Security patch was not applied");
  });
  
  it("should reset suspicious activity for an address", async () => {
    // Record suspicious activity
    await attackDetector.recordTransaction(attacker, 6000000, true, 0);
    
    // Verify activity is recorded
    let suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Attack was not detected");
    
    // Reset suspicious activity
    await selfHealingManager.resetAttackerActivity(attacker);
    
    // Verify activity is reset
    suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.equal(suspiciousCount, 0, "Suspicious activity was not reset");
  });

  it("should detect potential DDoS attack", async () => {
    // Record transactions to exceed DDoS threshold
    for (let i = 0; i < 6; i++) {
      await attackDetector.recordTransaction(attacker, 10000, true, i);
    }

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "DDoS attack was not detected");

    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for DDoS");
  });

  it("should detect potential double spending attack", async () => {
    // Record transactions with repeated nonce to simulate double spending
    await attackDetector.recordTransaction(attacker, 10000, true, 1);
    await attackDetector.recordTransaction(attacker, 10000, true, 1);

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Double spending attack was not detected");

    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for double spending");
  });

  it("should detect potential Sybil attack", async () => {
    // Record multiple suspicious activities to exceed Sybil threshold
    for (let i = 0; i < 5; i++) {
      await attackDetector.recordTransaction(attacker, 10000, true, i);
    }

    const suspiciousCount = await attackDetector.suspiciousActivityCount(attacker);
    assert.isTrue(suspiciousCount > 0, "Sybil attack was not detected");

    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for Sybil attack");
  });
});
