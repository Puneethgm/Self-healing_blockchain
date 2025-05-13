module.exports = {
  development: {
    host: "127.0.0.1",
    port: 8545,
    network_id: "*", // Match any network id
    attackDetectorAddress: "REPLACE_WITH_DEPLOYED_ATTACKDETECTOR_ADDRESS",
    selfHealingManagerAddress: "REPLACE_WITH_DEPLOYED_SELFHEALINGMANAGER_ADDRESS",
    vulnerabilityPatchesAddress: "REPLACE_WITH_DEPLOYED_VULNERABILITYPATCHES_ADDRESS",
    secureTokenAddress: "REPLACE_WITH_DEPLOYED_SECURETOKEN_ADDRESS"
  }
};
