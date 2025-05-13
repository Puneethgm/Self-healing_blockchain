/**
 * Use this file to configure your truffle project.
 *
 * More information about configuration can be found at:
 * https://trufflesuite.com/docs/truffle/reference/configuration
 */

module.exports = {
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.17",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    }
  }
};
