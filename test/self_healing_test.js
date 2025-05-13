// File: test/self_healing_test.js
const AttackDetector = artifacts.require("AttackDetector");
const SelfHealingManager = artifacts.require("SelfHealingManager");
const VulnerabilityPatches = artifacts.require("VulnerabilityPatches");
const SecureToken = artifacts.require("SecureToken");

contract("Self-Healing Functionality Tests", async (accounts) => {
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
    
    // Transfer some tokens to users for testing
    await secureToken.transfer(user1, web3.utils.toWei("100", "ether"));
    await secureToken.transfer(user2, web3.utils.toWei("100", "ether"));
  });
  
  it("should block transactions from blacklisted addresses", async () => {
    // Record excessive gas usage to trigger blacklisting
    await attackDetector.recordTransaction(attacker, 6000000, true, 0);
    
    // Verify attacker is blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted");
    
    // Transfer some tokens to attacker for testing
    await secureToken.transfer(attacker, web3.utils.toWei("10", "ether"), { from: owner });
    
    // Try to transfer tokens from blacklisted address
    const initialBalance = await secureToken.balanceOf(user1);
    await secureToken.transfer(user1, web3.utils.toWei("1", "ether"), { from: attacker });
    const finalBalance = await secureToken.balanceOf(user1);
    
    // Verify transfer did not go through
    assert.equal(initialBalance.toString(), finalBalance.toString(), "Transfer from blacklisted address succeeded");
  });
  
  it("should apply security patches", async () => {
    // Check initial patch status
    let patchDetails = await vulnerabilityPatches.getPatchDetails(1);
    assert.isFalse(patchDetails[1], "Patch should not be active initially");
    
    // Trigger reentrancy attack detection
    await attackDetector.detectReentrancyPattern(attacker, "0x12345678");
    
    // Verify patch is now active
    patchDetails = await vulnerabilityPatches.getPatchDetails(1);
    assert.isTrue(patchDetails[1], "Patch should be active after attack detection");
  });
  
  it("should allow manual security patch control", async () => {
    // Manually apply a patch
    await vulnerabilityPatches.applyPatch(3, { from: owner });
    
    // Verify patch is active
    let patchDetails = await vulnerabilityPatches.getPatchDetails(3);
    assert.isTrue(patchDetails[1], "Patch should be active after manual application");
    
    // Manually revert a patch
    await vulnerabilityPatches.revertPatch(3, { from: owner });
    
    // Verify patch is inactive
    patchDetails = await vulnerabilityPatches.getPatchDetails(3);
    assert.isFalse(patchDetails[1], "Patch should be inactive after manual reversion");
  });
  
  it("should remove address from blacklist after duration expires", async () => {
    // Set a very short blacklist duration for testing (1 second)
    await selfHealingManager.setBlacklistDuration(1);
    
    // Record excessive gas usage to trigger blacklisting
    await attackDetector.recordTransaction(attacker, 6000000, true, 0);
    
    // Verify attacker is blacklisted
    let isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted");
    
    // Increase blockchain time by 2 seconds and mine a new block
    await new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [2], // seconds to increase
          id: new Date().getTime(),
        },
        (err1) => {
          if (err1) return reject(err1);
          web3.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "evm_mine",
              id: new Date().getTime() + 1,
            },
            (err2, res) => {
              return err2 ? reject(err2) : resolve(res);
            }
          );
        }
      );
    });
    
    // Verify attacker is no longer blacklisted
    isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isFalse(isBlacklisted, "Attacker should no longer be blacklisted");
  });
  
  it("should handle recovery mode correctly", async () => {
    // Check initial state
    let state = await selfHealingManager.currentState();
    assert.equal(state, 1, "Initial state should be Monitoring (1)");
    
    // Trigger recovery mode
    await selfHealingManager.triggerRecoveryMode({ from: owner });
    
    // Verify state changed
    state = await selfHealingManager.currentState();
    assert.equal(state, 3, "State should be Recovering (3)");
    
    // Exit recovery mode
    await selfHealingManager.exitRecoveryMode({ from: owner });
    
    // Verify state changed back
    state = await selfHealingManager.currentState();
    assert.equal(state, 1, "State should be back to Monitoring (1)");
  });

  it("should apply patches and blacklist for DDoS attack", async () => {
    // Record transactions to trigger DDoS detection
    for (let i = 0; i < 6; i++) {
      await attackDetector.recordTransaction(attacker, 10000, true, i);
    }

    // Verify attacker is blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for DDoS");

    // Verify patch applied
    const patchDetails = await vulnerabilityPatches.getPatchDetails(4); // DDoS patch ID
    assert.isTrue(patchDetails[1], "DDoS patch was not applied");
  });

  it("should apply patches and blacklist for double spending attack", async () => {
    // Record transactions with repeated nonce to simulate double spending
    await attackDetector.recordTransaction(attacker, 10000, true, 1);
    await attackDetector.recordTransaction(attacker, 10000, true, 1);

    // Verify attacker is blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for double spending");

    // Verify patch applied
    const patchDetails = await vulnerabilityPatches.getPatchDetails(5); // Double spending patch ID
    assert.isTrue(patchDetails[1], "Double spending patch was not applied");
  });

  it("should apply patches and blacklist for Sybil attack", async () => {
    // Record multiple suspicious activities to trigger Sybil detection
    for (let i = 0; i < 5; i++) {
      await attackDetector.recordTransaction(attacker, 10000, true, i);
    }

    // Verify attacker is blacklisted
    const isBlacklisted = await selfHealingManager.isBlacklisted(attacker);
    assert.isTrue(isBlacklisted, "Attacker was not blacklisted for Sybil attack");

    // Verify patch applied
    const patchDetails = await vulnerabilityPatches.getPatchDetails(6); // Sybil patch ID
    assert.isTrue(patchDetails[1], "Sybil patch was not applied");
  });
});
