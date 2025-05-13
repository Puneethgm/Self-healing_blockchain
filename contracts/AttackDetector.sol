
pragma solidity ^0.8.17;

// File: contracts/AttackDetector.sol
contract AttackDetector {
    address public owner;
    address public selfHealingManager;

    // Thresholds for different attack types
    uint256 public transactionFrequencyThreshold;
    uint256 public gasUsageThreshold;
    uint256 public failedTransactionThreshold;
    uint256 public ddosTransactionThreshold;
    uint256 public doubleSpendNonceThreshold;
    uint256 public sybilActivityThreshold;

    // Attack tracking data
    mapping(address => uint256) public suspiciousActivityCount;
    mapping(address => uint256) public lastTransactionTime;
    mapping(address => uint256) public transactionFrequency;
    mapping(address => uint256) public gasUsage;
    mapping(address => uint256) public failedTransactions;

    // Additional mappings for new attack detection
    mapping(address => uint256) public lastNonce;
    mapping(address => uint256) public transactionCountInWindow;
    mapping(address => uint256) public sybilActivityCount;

    // Events for attack detection
    event PotentialAttackDetected(
        address suspiciousActor,
        string attackType,
        uint256 timestamp
    );

    event ThresholdUpdated(
        string thresholdType,
        uint256 oldValue,
        uint256 newValue
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlySelfHealingManager() {
        require(msg.sender == selfHealingManager, "Only self-healing manager can call this function");
        _;
    }

    constructor(
        uint256 _txFreqThreshold,
        uint256 _gasThreshold,
        uint256 _failedTxThreshold,
        uint256 _ddosTxThreshold,
        uint256 _doubleSpendNonceThreshold,
        uint256 _sybilActivityThreshold
    ) {
        owner = msg.sender;
        transactionFrequencyThreshold = _txFreqThreshold;
        gasUsageThreshold = _gasThreshold;
        failedTransactionThreshold = _failedTxThreshold;
        ddosTransactionThreshold = _ddosTxThreshold;
        doubleSpendNonceThreshold = _doubleSpendNonceThreshold;
        sybilActivityThreshold = _sybilActivityThreshold;
    }

    function setSelfHealingManager(address _manager) external onlyOwner {
        selfHealingManager = _manager;
    }

    // Update thresholds for attack detection
    function updateThresholds(
        uint256 _txFreqThreshold,
        uint256 _gasThreshold,
        uint256 _failedTxThreshold,
        uint256 _ddosTxThreshold,
        uint256 _doubleSpendNonceThreshold,
        uint256 _sybilActivityThreshold
    ) external onlyOwner {
        emit ThresholdUpdated("Transaction Frequency", transactionFrequencyThreshold, _txFreqThreshold);
        emit ThresholdUpdated("Gas Usage", gasUsageThreshold, _gasThreshold);
        emit ThresholdUpdated("Failed Transactions", failedTransactionThreshold, _failedTxThreshold);
        emit ThresholdUpdated("DDoS Transaction", ddosTransactionThreshold, _ddosTxThreshold);
        emit ThresholdUpdated("Double Spend Nonce", doubleSpendNonceThreshold, _doubleSpendNonceThreshold);
        emit ThresholdUpdated("Sybil Activity", sybilActivityThreshold, _sybilActivityThreshold);

        transactionFrequencyThreshold = _txFreqThreshold;
        gasUsageThreshold = _gasThreshold;
        failedTransactionThreshold = _failedTxThreshold;
        ddosTransactionThreshold = _ddosTxThreshold;
        doubleSpendNonceThreshold = _doubleSpendNonceThreshold;
        sybilActivityThreshold = _sybilActivityThreshold;
    }

    // Record transaction metrics for an address
    function recordTransaction(address _actor, uint256 _gasUsed, bool _success, uint256 _nonce) external {
        uint256 currentTime = block.timestamp;

        // Calculate transaction frequency
        if (lastTransactionTime[_actor] > 0) {
            uint256 timeDiff = currentTime - lastTransactionTime[_actor];
            if (timeDiff < 10) { // If less than 10 seconds between transactions
                transactionFrequency[_actor]++;
                // Check for frequency-based attacks
                if (transactionFrequency[_actor] > transactionFrequencyThreshold) {
                    emit PotentialAttackDetected(_actor, "High Transaction Frequency", currentTime);
                    suspiciousActivityCount[_actor]++;
                    notifySelfHealingManager(_actor, "High Transaction Frequency");
                }
            } else {
                // Reset if enough time has passed
                transactionFrequency[_actor] = 0;
            }
        }

        // Record gas usage
        gasUsage[_actor] += _gasUsed;
        if (gasUsage[_actor] > gasUsageThreshold) {
            emit PotentialAttackDetected(_actor, "Excessive Gas Usage", currentTime);
            suspiciousActivityCount[_actor]++;
            notifySelfHealingManager(_actor, "Excessive Gas Usage");
            gasUsage[_actor] = 0; // Reset after notification
        }

        // Record failed transactions
        if (!_success) {
            failedTransactions[_actor]++;
            if (failedTransactions[_actor] > failedTransactionThreshold) {
                emit PotentialAttackDetected(_actor, "Multiple Failed Transactions", currentTime);
                suspiciousActivityCount[_actor]++;
                notifySelfHealingManager(_actor, "Multiple Failed Transactions");
                failedTransactions[_actor] = 0; // Reset after notification
            }
        }

        // Detect double spending by checking nonce reuse or out-of-order nonce
        if (lastNonce[_actor] != 0 && _nonce <= lastNonce[_actor]) {
            emit PotentialAttackDetected(_actor, "Potential Double Spending", currentTime);
            suspiciousActivityCount[_actor]++;
            notifySelfHealingManager(_actor, "Potential Double Spending");
        }
        lastNonce[_actor] = _nonce;

        // Detect DDoS by counting transactions in a short window
        transactionCountInWindow[_actor]++;
        if (transactionCountInWindow[_actor] > ddosTransactionThreshold) {
            emit PotentialAttackDetected(_actor, "Potential DDoS Attack", currentTime);
            suspiciousActivityCount[_actor]++;
            notifySelfHealingManager(_actor, "Potential DDoS Attack");
            transactionCountInWindow[_actor] = 0; // Reset after notification
        }

        // Detect Sybil attack by counting suspicious activity
        sybilActivityCount[_actor]++;
        if (sybilActivityCount[_actor] > sybilActivityThreshold) {
            emit PotentialAttackDetected(_actor, "Potential Sybil Attack", currentTime);
            suspiciousActivityCount[_actor]++;
            notifySelfHealingManager(_actor, "Potential Sybil Attack");
            sybilActivityCount[_actor] = 0; // Reset after notification
        }

        lastTransactionTime[_actor] = currentTime;
    }

    // Detect reentrancy attack patterns
    function detectReentrancyPattern(address _actor, bytes4 _functionSelector) external {
        emit PotentialAttackDetected(_actor, "Potential Reentrancy Attack", block.timestamp);
        suspiciousActivityCount[_actor]++;
        notifySelfHealingManager(_actor, "Potential Reentrancy Attack");
    }

    // Detect DoS attack patterns
    function detectDoSPattern(address _actor) external {
        emit PotentialAttackDetected(_actor, "Potential DoS Attack", block.timestamp);
        suspiciousActivityCount[_actor]++;
        notifySelfHealingManager(_actor, "Potential DoS Attack");
    }

    // Notify the self-healing manager of an attack
    function notifySelfHealingManager(address _attacker, string memory _attackType) internal {
        if (selfHealingManager != address(0)) {
            (bool success, ) = selfHealingManager.call(
                abi.encodeWithSignature("handleAttackDetection(address,string)", _attacker, _attackType)
            );
            require(success, "Failed to notify self-healing manager");
        }
    }

    // Reset suspicious activity counter for an address
    function resetSuspiciousActivity(address _actor) external onlySelfHealingManager {
        suspiciousActivityCount[_actor] = 0;
        transactionFrequency[_actor] = 0;
        gasUsage[_actor] = 0;
        failedTransactions[_actor] = 0;
        lastNonce[_actor] = 0;
        transactionCountInWindow[_actor] = 0;
        sybilActivityCount[_actor] = 0;
    }
}
