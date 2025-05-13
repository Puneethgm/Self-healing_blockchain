const nodemailer = require('nodemailer');
const axios = require('axios');

class AlertSystem {
    constructor(config) {
        this.config = config || {};
        this.alertHistory = [];
        
        // Initialize email transporter if configured
        if (config && config.email) {
            this.emailTransporter = nodemailer.createTransport(config.email.transport);
        }
    }
    
    async sendAlert(alert) {
        // Add alert to history
        this.alertHistory.push(alert);
        
        // Log alert
        console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
        
        // Send email if configured and severity is high enough
        if (this.emailTransporter && 
            this.config.email && 
            this.shouldSendEmailForSeverity(alert.severity)) {
            await this.sendEmailAlert(alert);
        }
        
        // Send webhook if configured
        if (this.config.webhook && this.config.webhook.url) {
            await this.sendWebhookAlert(alert);
        }
        
        // Add more alert methods as needed (SMS, Slack, etc.)
    }
    
    shouldSendEmailForSeverity(severity) {
        const severityLevels = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };
        
        const configuredLevel = severityLevels[this.config.email.minSeverity || 'high'];
        const alertLevel = severityLevels[severity];
        
        return alertLevel >= configuredLevel;
    }
    
    async sendEmailAlert(alert) {
        try {
            if (!this.emailTransporter) return;
            
            const mailOptions = {
                from: this.config.email.from,
                to: this.config.email.to,
                subject: `[${alert.severity.toUpperCase()}] Blockchain Security Alert: ${alert.type}`,
                text: `Alert Type: ${alert.type}
Severity: ${alert.severity}
Time: ${alert.timestamp}
Message: ${alert.message}

Additional Data:
${JSON.stringify(alert.data, null, 2)}`,
                html: `<h2>Blockchain Security Alert</h2>
<p><strong>Alert Type:</strong> ${alert.type}</p>
<p><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(alert.severity)}">${alert.severity.toUpperCase()}</span></p>
<p><strong>Time:</strong> ${alert.timestamp}</p>
<p><strong>Message:</strong> ${alert.message}</p>
<h3>Additional Data:</h3>
<pre>${JSON.stringify(alert.data, null, 2)}</pre>`
            };
            
            await this.emailTransporter.sendMail(mailOptions);
            console.log(`Email alert sent to ${this.config.email.to}`);
        } catch (error) {
            console.error('Error sending email alert:', error);
        }
    }
    
    async sendWebhookAlert(alert) {
        try {
            if (!this.config.webhook || !this.config.webhook.url) return;
            
            await axios.post(this.config.webhook.url, {
                alert_type: alert.type,
                severity: alert.severity,
                timestamp: alert.timestamp,
                message: alert.message,
                data: alert.data
            }, {
                headers: this.config.webhook.headers || {}
            });
            
            console.log(`Webhook alert sent to ${this.config.webhook.url}`);
        } catch (error) {
            console.error('Error sending webhook alert:', error);
        }
    }
    
    getSeverityColor(severity) {
        const colors = {
            'low': '#2E7D32',       // Green
            'medium': '#FF9800',    // Orange
            'high': '#F44336',      // Red
            'critical': '#B71C1C'   // Dark Red
        };
        
        return colors[severity] || '#757575';
    }
    
    getAlertHistory(limit) {
        if (limit && limit > 0) {
            return this.alertHistory.slice(-limit);
        }
        return this.alertHistory;
    }
    
    clearAlertHistory() {
        this.alertHistory = [];
    }
}

module.exports = AlertSystem;
