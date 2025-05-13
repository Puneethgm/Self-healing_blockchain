const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const AlertSystem = require('./AlertSystem');
const MLDetector = require('./MLDetector');
const PBFT = require('./PBFT');

// Contract ABIs
const AttackDetectorABI = require('../build/contracts/AttackDetector.json').abi;
const SelfHealingManagerABI = require('../build/contracts/SelfHealingManager.json').abi;
const VulnerabilityPatchesABI = require('../build/contracts/VulnerabilityPatches.json').abi;
const SecureTokenABI = require('../build/contracts/SecureToken.json').abi;

class BlockchainMonitor {
    constructor(config) {
        // Initialize Web3 connection with WebSocket provider and setup reconnection logic
        const Web3WsProvider = require('web3-providers-ws');
        this.providerUrl = config.providerUrl;
        this.web3Provider = new Web3WsProvider(this.providerUrl, {
            clientConfig: {
                maxReceivedFrameSize: 100000000,   // bytes - adjust as needed
                maxReceivedMessageSize: 100000000, // bytes - adjust as needed
                keepalive: true,
                keepaliveInterval: 60000 // ms
            },
            reconnect: {
                auto: true,
                delay: 5000, // ms
                maxAttempts: 0,  // unlimited attempts
                onTimeout: true
            }
        });

        // Add event listeners for connection status
        this.web3Provider.on('connect', () => {
            console.log('WebSocket connected');
            this.log('WebSocket connected');
            // Resubscribe to events on reconnect
            if (this.isMonitoring) {
                this.subscribeToEvents();
            }
        });

        this.web3Provider.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.log(`WebSocket error: ${error.message || error}`);
        });

        this.web3Provider.on('end', (error) => {
            console.error('WebSocket connection ended:', error);
            this.log(`WebSocket connection ended: ${error ? error.message : 'No error info'}`);
        });

        this.web3Provider.on('close', (error) => {
            console.error('WebSocket connection closed:', error);
            this.log(`WebSocket connection closed: ${error ? error.message : 'No error info'}`);
        });

        this.web3 = new Web3(this.web3Provider);
        
        // Load contract addresses from config
        this.attackDetectorAddress = config.attackDetectorAddress;
        this.selfHealingManagerAddress = config.selfHealingManagerAddress;
        this.vulnerabilityPatchesAddress = config.vulnerabilityPatchesAddress;
        this.secureTokenAddress = config.secureTokenAddress;
        
        // Initialize contract instances
        this.attackDetector = new this.web3.eth.Contract(
            AttackDetectorABI,
            this.attackDetectorAddress
        );
        
        this.selfHealingManager = new this.web3.eth.Contract(
            SelfHealingManagerABI,
            this.selfHealingManagerAddress
        );
        
        this.vulnerabilityPatches = new this.web3.eth.Contract(
            VulnerabilityPatchesABI,
            this.vulnerabilityPatchesAddress
        );
        
        this.secureToken = new this.web3.eth.Contract(
            SecureTokenABI,
            this.secureTokenAddress
        );
        
        // Initialize alert system
        this.alertSystem = new AlertSystem(config.alertConfig);

        // Initialize ML Detector
        this.mlDetector = new MLDetector();
        this.mlDetector.on('attackDetected', (detection) => this.handleMLDetection(detection));

        // Initialize PBFT consensus simulation
        this.pbft = new PBFT(['Node1', 'Node2', 'Node3', 'Node4']);

        // Initialize state
        this.isMonitoring = false;
        this.attackHistory = [];
        this.blacklistedAddresses = new Set();
        this.activePatches = new Set();
        
        // Statistics
        this.stats = {
            totalAttacksDetected: 0,
            attacksByType: {},
            addressesBlacklisted: 0,
            patchesApplied: 0
        };
        
        // Log directory
        this.logDir = config.logDir || path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    async start() {
        if (this.isMonitoring) {
            console.log('Monitoring is already active');
            return;
        }
        
        console.log('Starting blockchain monitoring...');
        this.isMonitoring = true;

        // Start PBFT consensus simulation with a sample request
        this.pbft.startConsensus({ action: 'Start Monitoring', timestamp: new Date().toISOString() });
        
        // Subscribe to events
        await this.subscribeToEvents();
        
        // Start transaction monitoring
        this.startTransactionMonitoring();
        
        // Log monitoring started
        this.log('Blockchain monitoring started');
        console.log('Blockchain monitoring active');
    }
    
    async stop() {
        if (!this.isMonitoring) {
            console.log('Monitoring is not active');
            return;
        }
        
        console.log('Stopping blockchain monitoring...');
        this.isMonitoring = false;
        
        // Unsubscribe from events
        if (this.attackEventSubscription) {
            this.attackEventSubscription.unsubscribe();
        }
        
        if (this.blacklistEventSubscription) {
            this.blacklistEventSubscription.unsubscribe();
        }
        
        if (this.patchEventSubscription) {
            this.patchEventSubscription.unsubscribe();
        }
        
        // Removed clearing of transactionMonitoringInterval since interval is removed
        /*
        if (this.transactionMonitoringInterval) {
            clearInterval(this.transactionMonitoringInterval);
        }
        */
        
        // Log monitoring stopped
        this.log('Blockchain monitoring stopped');
        console.log('Blockchain monitoring stopped');
    }
    
    async subscribeToEvents() {
        try {
            // Unsubscribe existing subscriptions if any before resubscribing
            if (this.attackEventSubscription) {
                await this.attackEventSubscription.unsubscribe();
            }
            if (this.blacklistEventSubscription) {
                await this.blacklistEventSubscription.unsubscribe();
            }
            if (this.patchEventSubscription) {
                await this.patchEventSubscription.unsubscribe();
            }

            // Subscribe to PotentialAttackDetected events
            this.attackEventSubscription = this.attackDetector.events.PotentialAttackDetected({})
                .on('data', (event) => this.handleAttackEvent(event))
                .on('error', (error) => {
                    console.error('Error in attack event subscription:', error);
                    this.log(`Attack event subscription error: ${error.message || error}`);
                });
            
            // Subscribe to BlacklistUpdated events
            this.blacklistEventSubscription = this.selfHealingManager.events.BlacklistUpdated({})
                .on('data', (event) => this.handleBlacklistEvent(event))
                .on('error', (error) => {
                    console.error('Error in blacklist event subscription:', error);
                    this.log(`Blacklist event subscription error: ${error.message || error}`);
                });
            
            // Subscribe to PatchApplied events
            this.patchEventSubscription = this.vulnerabilityPatches.events.PatchApplied({})
                .on('data', (event) => this.handlePatchEvent(event))
                .on('error', (error) => {
                    console.error('Error in patch event subscription:', error);
                    this.log(`Patch event subscription error: ${error.message || error}`);
                });
            
            console.log('Successfully subscribed to blockchain events');
            this.log('Successfully subscribed to blockchain events');
        } catch (error) {
            console.error('Failed to subscribe to events:', error);
            this.log(`Error subscribing to events: ${error.message}`);
        }
    }
    
    startTransactionMonitoring() {
        // Removed periodic transaction monitoring interval to disable timeout
        // Monitoring can be implemented differently if needed
    }
    
    async processTransaction(transaction) {
        // Skip if already processed
        if (this.processedTxs && this.processedTxs.has(transaction.hash)) {
            return;
        }
        
        // Initialize processedTxs set if not exists
        if (!this.processedTxs) {
            this.processedTxs = new Set();
        }
        this.processedTxs.add(transaction.hash);
        
        try {
            // Get transaction receipt for status and gas used
            const receipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
            if (!receipt) return;
            
            // Check if the transaction was successful
            const success = receipt.status;
            
            // Record transaction metrics
            await this.recordTransactionMetrics(
                transaction.from,
                receipt.gasUsed,
                success
            );
            
            // Send transaction data to MLDetector for analysis
            const detection = this.mlDetector.analyzeTransaction({
                hash: transaction.hash,
                from: transaction.from,
                gasUsed: receipt.gasUsed,
                success: success
            });
            
            if (detection) {
                this.log(`MLDetector detected attack: ${detection.attackType} on tx ${detection.transactionHash}`);
            }
            
            // Check if this is a contract creation transaction
            if (!transaction.to) {
                this.log(`Contract creation detected: ${receipt.contractAddress} from ${transaction.from}`);
            }
            
            // Check for interactions with monitored contracts
            if (transaction.to === this.secureTokenAddress) {
                this.log(`SecureToken interaction: ${transaction.hash} from ${transaction.from}`);
                
                // Check if this might be a potential attack
                if (parseInt(receipt.gasUsed) > 500000) {
                    this.log(`High gas usage in SecureToken interaction: ${receipt.gasUsed} from ${transaction.from}`);
                }
            }
        } catch (error) {
            console.error(`Error processing transaction ${transaction.hash}:`, error);
            this.log(`Error processing transaction ${transaction.hash}: ${error.message}`);
        }
    }
    
    async recordTransactionMetrics(address, gasUsed, success) {
        try {
            // Call the AttackDetector contract to record the transaction
            // The contract expects 4 parameters, so add a placeholder or correct parameter
            await this.attackDetector.methods.recordTransaction(
                address,
                gasUsed,
                success,
                0 // Add a fourth parameter as placeholder, adjust as needed
            ).send({ from: (await this.web3.eth.getAccounts())[0], gas: 200000 });
        } catch (error) {
            console.error('Error recording transaction metrics:', error);
            this.log(`Error recording metrics for ${address}: ${error.message}`);
        }
    }
    
    handleAttackEvent(event) {
        const { suspiciousActor, attackType, timestamp } = event.returnValues;
        
        // Update statistics
        this.stats.totalAttacksDetected++;
        if (!this.stats.attacksByType[attackType]) {
            this.stats.attacksByType[attackType] = 0;
        }
        this.stats.attacksByType[attackType]++;
        
        // Store in attack history
        this.attackHistory.push({
            attacker: suspiciousActor,
            type: attackType,
            timestamp: new Date(timestamp * 1000).toISOString(),
            blockNumber: event.blockNumber
        });
        
        // Log the attack
        this.log(`Attack detected: ${attackType} from ${suspiciousActor}`);
        
        // Send alert
        this.alertSystem.sendAlert({
            type: 'attack',
            severity: this.getSeverityForAttackType(attackType),
            message: `Potential ${attackType} attack detected from ${suspiciousActor}`,
            timestamp: new Date().toISOString(),
            data: {
                attacker: suspiciousActor,
                attackType,
                blockNumber: event.blockNumber
            }
        });
    }
    
    handleBlacklistEvent(event) {
        const { target, isBlacklisted } = event.returnValues;
        
        if (isBlacklisted) {
            this.blacklistedAddresses.add(target);
            this.stats.addressesBlacklisted++;
            this.log(`Address blacklisted: ${target}`);
            
            // Send alert
            this.alertSystem.sendAlert({
                type: 'blacklist',
                severity: 'high',
                message: `Address ${target} has been blacklisted`,
                timestamp: new Date().toISOString(),
                data: { address: target }
            });
        } else {
            this.blacklistedAddresses.delete(target);
            this.log(`Address removed from blacklist: ${target}`);
        }
    }
    
    handlePatchEvent(event) {
        const { patchId, attackType } = event.returnValues;
        
        this.activePatches.add(parseInt(patchId));
        this.stats.patchesApplied++;
        
        this.log(`Security patch applied: ID ${patchId} for ${attackType}`);
        
        // Send alert
        this.alertSystem.sendAlert({
            type: 'patch',
            severity: 'medium',
            message: `Security patch ID ${patchId} applied for ${attackType}`,
            timestamp: new Date().toISOString(),
            data: { patchId, attackType }
        });
    }
    
    getSeverityForAttackType(attackType) {
        // Define severity levels for different attack types
        const severityMap = {
            'High Transaction Frequency': 'medium',
            'Excessive Gas Usage': 'medium',
            'Multiple Failed Transactions': 'low',
            'Potential Reentrancy Attack': 'critical',
            'Potential DoS Attack': 'high'
        };
        
        return severityMap[attackType] || 'medium';
    }
    
    getStatistics() {
        return {
            ...this.stats,
            currentBlacklistedAddresses: Array.from(this.blacklistedAddresses),
            activePatches: Array.from(this.activePatches),
            recentAttacks: this.attackHistory.slice(-10) // Get 10 most recent attacks
        };
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Write to log file
        const logFile = path.join(this.logDir, `monitor-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logMessage + '\n');
    }
    /**
     * Handle attack detection from MLDetector
     * @param {Object} detection - Detection object from MLDetector
     */
    handleMLDetection(detection) {
        this.stats.totalAttacksDetected++;
        if (!this.stats.attacksByType[detection.attackType]) {
            this.stats.attacksByType[detection.attackType] = 0;
        }
        this.stats.attacksByType[detection.attackType]++;
        
        this.attackHistory.push({
            attacker: 'Unknown (MLDetector)',
            type: detection.attackType,
            timestamp: detection.timestamp,
            transactionHash: detection.transactionHash
        });
        
        this.log(`MLDetector attack detected: ${detection.attackType} on transaction ${detection.transactionHash}`);
        
        // Send alert
        this.alertSystem.sendAlert({
            type: 'attack',
            severity: 'high',
            message: `MLDetector detected potential ${detection.attackType} attack on transaction ${detection.transactionHash}`,
            timestamp: detection.timestamp,
            data: detection
        });
    }
}

module.exports = BlockchainMonitor;
