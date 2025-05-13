
// File: contracts/SelfHealingManager.sol
pragma solidity ^0.8.17;

interface IAttackDetector {
    function resetSuspiciousActivity(address _actor) external;
}

interface IVulnerabilityPatches {
    function applyPatch(uint256 patchId) external returns (bool);
    function revertPatch(uint256 patchId) external returns (bool);
}

contract SelfHealingManager {
    address public owner;
    address public attackDetector;
    address public vulnerabilityPatches;
    
    // Address blacklisting
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => uint256) public blacklistTimestamp;
    uint256 public blacklistDuration = 1 days;
    
    // Healing states
    enum HealingState { Inactive, Monitoring, Responding, Recovering }
    HealingState public currentState = HealingState.Monitoring;
    
    // Attack response mapping
    mapping(string => uint8) public attackResponseLevel;
    mapping(string => uint256) public attackPatchId;
    
    // Events
    event AttackHandled(address attacker, string attackType, uint8 responseLevel);
    event BlacklistUpdated(address target, bool isBlacklisted);
    event StateChanged(HealingState previousState, HealingState newState);
    event PatchApplied(uint256 patchId, string attackType);
    event PatchReverted(uint256 patchId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize default attack response levels
        attackResponseLevel["High Transaction Frequency"] = 1;
        attackResponseLevel["Excessive Gas Usage"] = 2;
        attackResponseLevel["Multiple Failed Transactions"] = 1;
        attackResponseLevel["Potential Reentrancy Attack"] = 3;
        attackResponseLevel["Potential DoS Attack"] = 3;
        attackResponseLevel["Potential DDoS Attack"] = 3;
        attackResponseLevel["Potential Double Spending"] = 3;
        attackResponseLevel["Potential Sybil Attack"] = 3;
        
        // Initialize patch mapping
        attackPatchId["Potential Reentrancy Attack"] = 1; // Patch ID for reentrancy
        attackPatchId["Potential DoS Attack"] = 2; // Patch ID for DoS protection
        attackPatchId["Potential DDoS Attack"] = 4; // Patch ID for DDoS protection
        attackPatchId["Potential Double Spending"] = 5; // Patch ID for double spending protection
        attackPatchId["Potential Sybil Attack"] = 6; // Patch ID for Sybil protection
    }
    
    function setAttackDetector(address _detector) external onlyOwner {
        attackDetector = _detector;
    }
    
    function setVulnerabilityPatches(address _patches) external onlyOwner {
        vulnerabilityPatches = _patches;
    }
    
    function updateAttackResponseLevel(string calldata _attackType, uint8 _level) external onlyOwner {
        attackResponseLevel[_attackType] = _level;
    }
    
    function updateAttackPatchMapping(string calldata _attackType, uint256 _patchId) external onlyOwner {
        attackPatchId[_attackType] = _patchId;
    }
    
    function setBlacklistDuration(uint256 _duration) external onlyOwner {
        blacklistDuration = _duration;
    }
    
    // Handle attack detection and trigger appropriate response
    function handleAttackDetection(address _attacker, string memory _attackType) external {
        require(msg.sender == attackDetector, "Only attack detector can call this function");
        
        changeState(HealingState.Responding);
        
        uint8 responseLevel = attackResponseLevel[_attackType];
        emit AttackHandled(_attacker, _attackType, responseLevel);
        
        // Apply response based on level
        if (responseLevel >= 1) {
            // Level 1: Temporary blacklist
            blacklistAddress(_attacker);
        }
        
        if (responseLevel >= 2) {
            // Level 2: Apply security patch
            uint256 patchId = attackPatchId[_attackType];
            if (patchId > 0 && vulnerabilityPatches != address(0)) {
                applySecurityPatch(patchId, _attackType);
            }
        }
        
        if (responseLevel >= 3) {
            // Level 3: Network alert and extended blacklist
            blacklistAddress(_attacker);
            blacklistTimestamp[_attacker] = block.timestamp + (blacklistDuration * 3); // Triple duration
        }
        
        // Return to monitoring state
        changeState(HealingState.Monitoring);
    }
    
    // Blacklist an address temporarily
    function blacklistAddress(address _target) internal {
        blacklistedAddresses[_target] = true;
        blacklistTimestamp[_target] = block.timestamp + blacklistDuration;
        emit BlacklistUpdated(_target, true);
    }
    
    // Check if an address is currently blacklisted
    function isBlacklisted(address _target) public view returns (bool) {
        if (!blacklistedAddresses[_target]) return false;
        if (block.timestamp > blacklistTimestamp[_target]) return false;
        return true;
    }
    
    // Remove address from blacklist
    function removeFromBlacklist(address _target) external onlyOwner {
        blacklistedAddresses[_target] = false;
        emit BlacklistUpdated(_target, false);
    }
    
    // Apply security patch
    function applySecurityPatch(uint256 _patchId, string memory _attackType) internal {
        if (vulnerabilityPatches != address(0)) {
            bool success = IVulnerabilityPatches(vulnerabilityPatches).applyPatch(_patchId);
            if (success) {
                emit PatchApplied(_patchId, _attackType);
            }
        }
    }
    
    // Revert security patch
    function revertSecurityPatch(uint256 _patchId) external onlyOwner {
        if (vulnerabilityPatches != address(0)) {
            bool success = IVulnerabilityPatches(vulnerabilityPatches).revertPatch(_patchId);
            if (success) {
                emit PatchReverted(_patchId);
            }
        }
    }
    
    // Change the healing state
    function changeState(HealingState _newState) internal {
        if (currentState != _newState) {
            emit StateChanged(currentState, _newState);
            currentState = _newState;
        }
    }
    
    // Reset an attacker's suspicious activity counter
    function resetAttackerActivity(address _attacker) external onlyOwner {
        if (attackDetector != address(0)) {
            IAttackDetector(attackDetector).resetSuspiciousActivity(_attacker);
        }
    }
    
    // Emergency function to manually trigger recovery mode
    function triggerRecoveryMode() external onlyOwner {
        changeState(HealingState.Recovering);
        // Additional recovery logic can be implemented here
    }
    
    // Exit recovery mode
    function exitRecoveryMode() external onlyOwner {
        changeState(HealingState.Monitoring);
    }
}