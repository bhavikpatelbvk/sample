const newman = require('newman');
const path = require('path');

async function run() {
    let options = {
        collection: this.collection,
        bail: true,
        timeout: 180000,
        timeoutRequest: 45000,
        verbose: true
    };

    try {
        // Process environment variables
        if (this.config.envVars) {
            let envVars = this.config.envVars.map((element) => {
                let [key, value] = element.split('=');
                return { key, value };
            });
            options.envVar = envVars;
            this.logger.debug("env variables=%s", this.config.envVars);
        }

        // Process environment file
        if (this.config.environment) {
            let env_path = this.config.environment;
            options.environment = await this.getDataFile(env_path);
        }

        // Process SSL configuration
        if (this.config.sslConfig.cert && this.config.sslConfig.key) {
            let ssl_cert_path = this.config.dataDir ? path.resolve(this.config.dataDir, this.config.sslConfig.cert) : this.config.sslConfig.cert;
            let ssl_key_path = this.config.dataDir ? path.resolve(this.config.dataDir, this.config.sslConfig.key) : this.config.sslConfig.key;

            options.sslClientCert = await this.getDataFile(ssl_cert_path);
            options.sslClientKey = await this.getDataFile(ssl_key_path);
            options.sslClientPassphrase = this.config.sslConfig.passPhrase;
        }

        // Run newman with the configured options
        await new Promise((resolve, reject) => {
            newman.run(options, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            })
            .on('beforeItem', (err, args) => this.handleEvent('beforeItem', err, args))
            .on('request', (err, args) => this.handleEvent('request', err, args))
            .on('test', (err, args) => this.handleEvent('test', err, args))
            .on('exception', (err, args) => this.handleEvent('exception', err, args))
            .on('assertion', (err, args) => this.handleEvent('assertion', err, args))
            .on('beforeDone', (err, args) => this.handleEvent('beforeDone', err, args))
            .on('done', (err, summary) => {
                if (err || summary.error) {
                    this.logger.error('Collection run encountered an error.');
                    reject(err || summary.error);
                } else {
                    this.logger.info('Collection run completed successfully.');
                    resolve(summary);
                }
            });
        });
    } catch (err) {
        this.logger.error(err.message || err);
        throw err;
    } finally {
        this.cleanUpTempFiles();
    }
    this.log("Result: ", this.result.success, this.result.message);
}

function handleEvent(event, err, args) {

    this.logger.info(`------------------------`);


    if (err) {
        this.logger.error(`${event} event encountered an error:`, err);
    } else {
        this.logger.info(`${event} event:`, args);
    }
}

function cleanUpTempFiles() {
    // Implement your cleanup logic here
    this.logger.info('Cleaning up temporary files.');
}

// Example usage
const context = {
    collection: 'ASM_postman_get.json',
    config: {
        envVars: ['returnCheckType=informationalchecks','authTicket=3BC2E419-5BC3-42B3-BB17-DD434A1CF000','apiAddress=api-asm1'],
        environment: '',
        sslConfig: {
            cert: '',
            key: '',
            passPhrase: ''
        },
        dataDir: ''
    },
    logger: console,
    getDataFile: async (filePath) => {
        // Replace with your actual implementation
        const fs = require('fs').promises;
        return await fs.readFile(filePath);
    },
    cleanUpTempFiles: cleanUpTempFiles,
    handleEvent: handleEvent,
    log: console.log,
    result: { success: true, message: 'All tests passed.' }
};

run.call(context).catch(err => console.error('Error during run:', err));
