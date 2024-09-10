const DD8C_client = require("./DD8C_client");



module.exports = function (RED) {
    // Gain behaviour:
    
    function connectionNotice(node, dd8c) {
        if (dd8c.connectionStatus === 'disconnected') {
            node.status({fill:"red",shape:"ring",text:"disconnected"});
        } else {
            node.status({fill:"green",shape:"dot",text:"connected"});
        }
        dd8c.on('connected', () => {
            node.status({fill:"green",shape:"dot",text:"connected"});
        });
        dd8c.on('disconnected', () => {
            node.status({fill:"red",shape:"ring",text:"disconnected"});
        });
    }
    
    function GainAESNode(config) {
        
        RED.nodes.createNode(this, config);

        this.server = RED.nodes.getNode(config.server);
        var node = this;
        node.on('input', function (msg) {
            const volume = msg.payload;
            this.server.dd8c.setVolume(volume);
            //node.send(msg);
        });
        connectionNotice(node, this.server.dd8c);
        
        this.server.dd8c.on('volumeChanged', (data) => {
            node.send({ payload: data } )
        });
        node.on('close', function(done) {
            node.server.dd8c.removeListener('volumeChanged', node.onVolumeChanged);
            done();
        });
    }
    RED.nodes.registerType("gain", GainAESNode);

    // Mute behaviour:
    function MuteNode(config) {
        
        RED.nodes.createNode(this, config);
        this.server = RED.nodes.getNode(config.server);
        var node = this;
        connectionNotice(node, this.server.dd8c);
        node.on('input', function (msg) {
            const mute = msg.payload;
            this.server.dd8c.setMute(mute);
            //node.send(msg);
        });
        this.server.dd8c.on('muteChanged', (data) => {
            node.send({ payload: data } )
        });
        node.on('close', function(done) {
            node.server.dd8c.removeListener('muteChanged', node.onMuteChanged);
            done();
        });
    }
    RED.nodes.registerType("mute", MuteNode);

    // Sleep behaviour:
    function SleepNode(config) {
        RED.nodes.createNode(this, config);
        this.server = RED.nodes.getNode(config.server);
        
        connectionNotice(this, this.server.dd8c);

        var node = this;
        node.on('input', function (msg) {
            const sleep = msg.payload;
            this.server.dd8c.setSleep(sleep);
            //node.send(msg);
        });
        
        this.server.dd8c.on('sleepChanged', (data) => {
            node.send({ payload: data } )
        });
        node.on('close', function(done) {
            node.server.dd8c.removeListener('sleepChanged', node.onSleepChanged);
            done();
        });
    }
    RED.nodes.registerType("sleep", SleepNode);

    // Source behaviour:
    function RemoteServerNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        var node = this;
        
        node.dd8c = new DD8C_client();
        
        node.on('close', function(done) {
            console.log("Closing connection to DD8C");
            node.dd8c.Close();
            done();
        });
    }
    RED.nodes.registerType("speaker-server",RemoteServerNode);
    
}