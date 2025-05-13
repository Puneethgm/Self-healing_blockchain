/**
 * Basic simulation of PBFT (Practical Byzantine Fault Tolerance) consensus algorithm.
 * This module provides a simplified PBFT implementation for demonstration purposes.
 */

class PBFT {
    constructor(nodes) {
        this.nodes = nodes; // Array of node identifiers
        this.f = Math.floor((nodes.length - 1) / 3); // Maximum number of faulty nodes tolerated
        this.state = 'idle';
        this.prepared = new Set();
        this.committed = new Set();
        this.view = 0;
        this.sequenceNumber = 0;
    }

    // Start a new consensus round with a request
    startConsensus(request) {
        this.state = 'pre-prepared';
        this.sequenceNumber++;
        this.broadcastPrePrepare(request);
    }

    // Broadcast pre-prepare message to all nodes
    broadcastPrePrepare(request) {
        console.log(`Broadcasting pre-prepare for seq ${this.sequenceNumber} with request:`, request);
        this.nodes.forEach(node => {
            this.receivePrePrepare(node, this.sequenceNumber, request);
        });
    }

    // Receive pre-prepare message
    receivePrePrepare(node, seq, request) {
        if (this.state !== 'pre-prepared' || seq !== this.sequenceNumber) {
            return;
        }
        console.log(`Node ${node} received pre-prepare for seq ${seq}`);
        this.state = 'prepared';
        this.broadcastPrepare(seq, request);
    }

    // Broadcast prepare message
    broadcastPrepare(seq, request) {
        console.log(`Broadcasting prepare for seq ${seq}`);
        this.nodes.forEach(node => {
            this.receivePrepare(node, seq, request);
        });
    }

    // Receive prepare message
    receivePrepare(node, seq, request) {
        this.prepared.add(node);
        console.log(`Node ${node} received prepare for seq ${seq}`);
        if (this.prepared.size >= (2 * this.f)) {
            this.state = 'committed';
            this.broadcastCommit(seq, request);
        }
    }

    // Broadcast commit message
    broadcastCommit(seq, request) {
        console.log(`Broadcasting commit for seq ${seq}`);
        this.nodes.forEach(node => {
            this.receiveCommit(node, seq, request);
        });
    }

    // Receive commit message
    receiveCommit(node, seq, request) {
        this.committed.add(node);
        console.log(`Node ${node} received commit for seq ${seq}`);
        if (this.committed.size >= (2 * this.f + 1)) {
            this.state = 'committed-final';
            this.executeRequest(request);
        }
    }

    // Execute the request after consensus
    executeRequest(request) {
        console.log(`Request executed:`, request);
        this.reset();
    }

    // Reset state for next consensus round
    reset() {
        this.state = 'idle';
        this.prepared.clear();
        this.committed.clear();
    }
}

module.exports = PBFT;
