const net = require('net');

// Constants for Rcon packet types
const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_RESPONSE_VALUE = 0;

/**
 * Represents an Rcon server.
*/
class RconServer {
    /**
     * Creates a new instance of the Rcon server.
     * @param {number} port - The port on which the server will listen.
     * @param {string} password - The Rcon password for authentication.
    */
    constructor(port, password) {
        this.port = port;
        this.password = password;
        this.clients = [];
        this.server = net.createServer((socket) => {
            // Handle client connections
            const client = {
                socket,
                authenticated: false,
            };
            this.clients.push(client);

            socket.on('data', (fullData) => {
                while (fullData.length >= 4) {
                    const packetSize = fullData.readInt32LE(0);
                    if (fullData.length < packetSize) {
                        break;
                    }
                    const packetType = fullData.readInt32LE(8);
                    if (packetType === SERVERDATA_AUTH) {
                        const requestId = fullData.readInt32LE(4);
                        const passwordBytes = fullData.slice(12, packetSize + 2);
                        const password = passwordBytes.toString('utf8').trim();
                        if (password === this.password) {
                            client.authenticated = true;
                            // Handle authentication response
                            const response = Buffer.alloc(packetSize);
                            response.writeInt32LE(packetSize - 4, 0);
                            response.writeInt32LE(requestId, 4);
                            response.writeInt32LE(SERVERDATA_AUTH_RESPONSE, 8);
                            response.writeUInt16LE(0, 12);
                            socket.write(response);
                        } else {
                            // Handle invalid password response
                            const response = Buffer.alloc(packetSize);
                            response.writeInt32LE(packetSize - 4, 0);
                            response.writeInt32LE(requestId, 4);
                            response.writeInt32LE(SERVERDATA_RESPONSE_VALUE, 8);
                            response.writeUInt16LE(0, 12);
                            response.write('Invalid password', 14, 'utf8');
                            response.writeInt8(0, packetSize - 1);
                            socket.write(response);
                            socket.end();
                            return;
                        }
                    } else if (client.authenticated && packetType === SERVERDATA_EXECCOMMAND) {
                        const requestId = fullData.readInt32LE(4);
                        const commandBuffer = fullData.slice(12);
                        const command = commandBuffer.toString('utf8').replace(/\0+$/, '');
                        // Handle command execution
                        logger.info(`Executing RCON command from <${socket.remoteAddress}:${socket.remotePort}>: '${command}'`);
                        const res = mc.runcmdEx(command);
                        const output = (res.success ? '' : 'Error: ') + (res.output || '[No output]');
                        logger.info(output);
                        const responseLength = 14 + Buffer.byteLength(output, 'utf8') + 1;
                        const response = Buffer.alloc(responseLength);
                        response.writeInt32LE(responseLength - 4, 0);
                        response.writeInt32LE(requestId, 4);
                        response.writeInt32LE(SERVERDATA_RESPONSE_VALUE, 8);
                        response.write(output, 12, 'utf8');
                        response.writeInt8(0, responseLength - 1);
                        socket.write(response);
                    }
                    fullData = fullData.slice(packetSize);
                }
            });

            socket.on('end', () => {
                // Handle client disconnections
                this.clients.splice(this.clients.indexOf(client), 1);
            });

            socket.on('error', (err) => {
                logger.error(`Socket error: ${err}`);
            });
        });

        this.server.on('error', (err) => {
            logger.error(`Server error: ${err}`);
        });

        this.server.listen(this.port, () => {
            // Log server information upon successful start
            logger.info(`RCon server is running on port \x1b[1m\x1b[33m${this.port}\x1b[0m.`);
        });
    }

    /**
     * Stops the Rcon server and disconnects all clients.
    */
    stop() {
        for (const client of this.clients) {
            client.socket.end();
        }
        this.server.close();
        logger.info(`RCon server stopped!`);
    }
}

module.exports = RconServer;
