const MLDetector = require('../monitoring/MLDetector');

async function testMLDetector() {
    const mlDetector = new MLDetector();

    mlDetector.on('attackDetected', (detection) => {
        console.log('Attack detected event:', detection);
    });

    // Simulate normal transactions
    const normalTxs = [
        { hash: '0x1', gasUsed: 21000, value: 10, success: true },
        { hash: '0x2', gasUsed: 30000, value: 5, success: true },
        { hash: '0x3', gasUsed: 25000, value: 0, success: true }
    ];

    // Simulate anomalous transactions
    const anomalousTxs = [
        { hash: '0x4', gasUsed: 600000, value: 1000, success: false },
        { hash: '0x5', gasUsed: 700000, value: 500, success: false }
    ];

    for (const tx of normalTxs) {
        const detection = await mlDetector.analyzeTransaction(tx);
        if (detection) {
            console.log('Unexpected detection for normal tx:', tx.hash);
        } else {
            console.log('No detection for normal tx:', tx.hash);
        }
    }

    for (const tx of anomalousTxs) {
        const detection = await mlDetector.analyzeTransaction(tx);
        if (detection) {
            console.log('Detection for anomalous tx:', tx.hash, detection);
        } else {
            console.log('No detection for anomalous tx:', tx.hash);
        }
    }
}

testMLDetector().then(() => {
    console.log('MLDetector test completed');
}).catch((err) => {
    console.error('MLDetector test error:', err);
});
