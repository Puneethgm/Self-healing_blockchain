const EventEmitter = require('events');
const tf = require('@tensorflow/tfjs');

class MLDetector extends EventEmitter {
    constructor() {
        super();
        this.detections = [];

        // Initialize Autoencoder model
        this.autoencoder = this.createAutoencoderModel();
        this.autoencoder.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        // Placeholder for training data
        this.trainingData = [];
        this.isTrained = false;

        // K-means parameters
        this.k = 2;
        this.centroids = null;
        this.maxIterations = 100;
        this.tolerance = 1e-4;
    }

    createAutoencoderModel() {
        const inputDim = 3; // Example input dimension: gasUsed, value, success
        const encodingDim = 2;

        const input = tf.input({ shape: [inputDim] });
        const encoded = tf.layers.dense({ units: encodingDim, activation: 'relu' }).apply(input);
        const decoded = tf.layers.dense({ units: inputDim, activation: 'sigmoid' }).apply(encoded);

        const autoencoder = tf.model({ inputs: input, outputs: decoded });
        return autoencoder;
    }

    async trainAutoencoder(data) {
        const tensorData = tf.tensor2d(data);
        await this.autoencoder.fit(tensorData, tensorData, {
            epochs: 50,
            batchSize: 16,
            shuffle: true
        });
        this.isTrained = true;
    }

    // Simple K-means clustering implementation
    kmeansFit(data) {
        // Initialize centroids randomly
        this.centroids = data.slice(0, this.k);

        for (let iter = 0; iter < this.maxIterations; iter++) {
            // Assign clusters
            const clusters = Array(this.k).fill().map(() => []);

            for (const point of data) {
                let minDist = Infinity;
                let clusterIndex = 0;
                for (let i = 0; i < this.k; i++) {
                    const dist = this.euclideanDistance(point, this.centroids[i]);
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIndex = i;
                    }
                }
                clusters[clusterIndex].push(point);
            }

            // Update centroids
            let maxShift = 0;
            for (let i = 0; i < this.k; i++) {
                if (clusters[i].length === 0) continue;
                const newCentroid = this.meanPoint(clusters[i]);
                const shift = this.euclideanDistance(this.centroids[i], newCentroid);
                maxShift = Math.max(maxShift, shift);
                this.centroids[i] = newCentroid;
            }

            if (maxShift < this.tolerance) break;
        }
    }

    kmeansPredict(point) {
        let minDist = Infinity;
        let clusterIndex = 0;
        for (let i = 0; i < this.k; i++) {
            const dist = this.euclideanDistance(point, this.centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                clusterIndex = i;
            }
        }
        return clusterIndex;
    }

    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    }

    meanPoint(points) {
        const n = points.length;
        const dim = points[0].length;
        const mean = Array(dim).fill(0);
        for (const p of points) {
            for (let i = 0; i < dim; i++) {
                mean[i] += p[i];
            }
        }
        for (let i = 0; i < dim; i++) {
            mean[i] /= n;
        }
        return mean;
    }

    async analyzeTransaction(transaction) {
        // Extract features for ML models
        const features = [transaction.gasUsed || 0, transaction.value || 0, transaction.success ? 1 : 0];

        // Add to training data
        this.trainingData.push(features);

        // Train autoencoder if enough data
        if (!this.isTrained && this.trainingData.length >= 100) {
            await this.trainAutoencoder(this.trainingData);
            // Train K-means
            this.kmeansFit(this.trainingData);
        }

        // K-means clustering prediction
        const cluster = this.kmeansPredict(features);

        // Autoencoder reconstruction error
        let reconstructionError = 0;
        if (this.isTrained) {
            const inputTensor = tf.tensor2d([features]);
            const outputTensor = this.autoencoder.predict(inputTensor);
            const inputArray = inputTensor.arraySync()[0];
            const outputArray = outputTensor.arraySync()[0];
            reconstructionError = inputArray.reduce((sum, val, i) => sum + Math.pow(val - outputArray[i], 2), 0);
        }

        // Simple threshold-based anomaly detection
        const isAnomaly = (cluster === 1) || (reconstructionError > 0.1);

        if (isAnomaly) {
            const detection = {
                attackType: 'Anomaly Detected',
                confidence: reconstructionError,
                transactionHash: transaction.hash,
                timestamp: new Date().toISOString()
            };
            this.detections.push(detection);
            this.emit('attackDetected', detection);
            return detection;
        }

        return null;
    }

    getRecentDetections(limit = 10) {
        return this.detections.slice(-limit);
    }
}

module.exports = MLDetector;
