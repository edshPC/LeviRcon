const RconServer = require('./classes/RCon');

// Create a configuration file object for RCon settings.
const config_path = './plugins/LeviRcon/config/config.json';
const config_file = new JsonConfigFile(config_path);

// Check if the RConServer configuration exists; if not, create it.
if (!config_file.get('RConServer')) {
    logger.warn(`Config file not found, creating!`);

    // Initialize the RConServer configuration with default values.
    config_file.init('RConServer', {
        port: 25575,
        password: (Math.random() * 0xFFFFFFFFFF | 0).toString(16),
    });

    logger.warn(`Config file created in \x1b[1m\x1b[32m"${config_path}"\x1b[0m!`);
}

// Retrieve the RConServer configuration.
const config = config_file.get('RConServer');

// Create an instance of the RConServer class with the specified configuration.
const rconServer = new RconServer(config.port, config.password);
logger.info(`You can change the port and password in \x1b[1m\x1b[33m"${config_path}"\x1b[0m!`);

// Listen for the "onConsoleCmd" event in Minecraft.
mc.listen("onConsoleCmd", (cmd) => {
    // If the console command is 'll reload' or 'll reload RConLLSE', stop the RCon server.
    if (cmd === 'll reload LeviRcon') {
        rconServer.stop();
    }
});
