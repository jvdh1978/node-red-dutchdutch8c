const WebSocket = require('ws');
const EventEmitter = require('events');
const { log } = require('console');
const { type } = require('os');


// before launch via terminal run: export DEBUG=true
const debugIsEnabled = process.env.DEBUG === 'true';

function logDebug(message) {
    if (debugIsEnabled) {
        console.log(message);
    }
}

class DD8C_client extends EventEmitter {
    constructor(masterIP = null) {
        super();
        //this.url = url;
        this.speakerVariables = {};
        this.connectionStatus = 'disconnected';
        this.targetID = null;
        this.id = '999912345678';
        this.masterIP = masterIP;
        if (masterIP) {
            this.connectToMaster();
        } else 
        {
            this.retreiveIPfromPublicAPI().then((IPs) => {
                this.determineMaster(IPs).then((masterIP) => {
                    this.masterIP = masterIP;
                    this.connectToMaster();
                }).catch((err) => {
                    logDebug(`Error determening Master: ${err}`);
                });
            });
        }

        //this will return before conection sequence is done. Any commands to set volume, sleep or mute will be ignored until connection is established

        
    }

    retreiveIPfromPublicAPI() {
        // get the IP from the public API
        return new Promise((resolve, reject) => {
            const wsExternalAPI = new WebSocket('wss://api.ascend.audio');
            wsExternalAPI.on('open', () => {
                wsExternalAPI.send(JSON.stringify(
                    {
                        "meta":
                        {
                            "id":this.id,
                            "method":"read",
                            "endpoint":"discovery:local-ips"
                        },
                        
                    }
                ));
            });
            wsExternalAPI.on('message', (data) => {
                
                data = JSON.parse(data);
                
                if (data.meta.method === 'read' && data.meta.endpoint === 'discovery:local-ips') {
                    logDebug("received local ip's:");
                    logDebug(data.data.local);
                    wsExternalAPI.close();
                    resolve(data.data.local);
                }
            });
            
        
        });
    };

    determineMaster(IPs) {
        // IPS contains two IP addresses, and at both addresses we check if it is a master. When found another check is no longer neccesary
        // if no master is found, we return null

        return new Promise((resolve, reject) => {
            let foundMaster = false;
            let counter = 0;
            
            //get ip from first {speakerName:IP} object
            const key = Object.keys(IPs)[0]; 
            const IP = IPs[key].localIp4;
            
            //connect and setup reaction
            const ws = new WebSocket(`ws://${IP}:8768`);
            ws.on('open', () => {
                ws.send(JSON.stringify(
                    {
                        "meta":
                        {
                            "id":this.id,
                            "method":"read",
                            "endpoint":"master",
                            
                        }                            
                    }
                ));
            });
            ws.on('message', (data) => {
                
                data = JSON.parse(data);
                if (data.meta.method === 'read' && data.meta.endpoint === 'master') {
                    if (data.data.address) {
                        foundMaster = true;
                        let masterIP = data.data.address.ipv4[0];
                        //let url = `ws://${data.data.address.ipv4[0]}:8768`;
                        
                        logDebug(`Determined master: ${masterIP}`);
                        ws.close();
                        resolve(masterIP);

                    }
                }
                if (!foundMaster) {
                    ws.close();
                    reject('No master found...');    
                }
                
            });
            ws.on('close', () => {
                
                
            });
            
        });
    }
    
    connectToMaster() {
        //const options = ClientOptions();
        //const options = {HandshakeTimeout : 1};
        let url = "ws://" + this.masterIP + ":8768";
        this.ws = new WebSocket(url);
        //this.ws = new WebSocket('ws://192.168.1.145:8768',options);
        
        this.ws.on('open', this.OnOpen.bind(this));
        this.ws.on('close', this.OnClose.bind(this));
        this.ws.on('message', this.OnMessage.bind(this));
        this.ws.on('error', (err) => {
            logDebug(`error: ${err}`);
            this.retryConnection();
        });
        this.ws.on('unexpected-response', (req, res) => {
            logDebug(`unexpected-response: ${req}, ${res}`);
            //this.retryConnection();
        });
    }

    retryConnection() {
        this.ws.removeAllListeners();
        this.ws.terminate();
        logDebug('Retrying in 1 second...');
        setTimeout(() => {
            this.connectToMaster();
        }, 1000);
    }   
    OnOpen() {
        logDebug('Connected to master');
        // request targetID's, followup in OnMessage
        this.ws.send(JSON.stringify(
            {
                "meta":
                {
                    "id":this.id,
                    "method":"read",
                    "endpoint":"targets",
                    "targetType":"room",
                    "target":"*"
                },
                "data":{}
            }
        ));
        
    };

    OnClose() {
        logDebug('Disconnected, retrying in 1 second...');
        //try to reconnect
        this.connectionStatus = 'disconnected';
        this.retryConnection();

    };

    //call to properly end all activities and release all resources
    Close() {
        this.connectionStatus = 'disconnected';
        logDebug('Closing connection');
        //if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.terminate();
        //}
        this.removeAllListeners();
    }

    OnMessage(data) {
        
        data = JSON.parse(data);
        
        //On message gets called when the connection is established, and when a message is received.
        //When targetIDS are received, the targetID is stored and the current variables are subscribed to.
        if ((data.meta.method === 'read') && (data.meta.endpoint === 'targets')) {
            // for each data.data, check if it is the target we want: the room
            
            data.data.forEach(element => {
                if (element.targetType === 'room') {
                    this.targetID = element.target;
                    this.connectionStatus = 'connected';
                    this.emit('connected');
                    //break loop if here:
                    this.ws.send(JSON.stringify(
                    {
                        "meta":{
                            "id":this.id,
                            "method":"subscribe",
                            "endpoint":"sleep"
                        },
                        "data":{}
                    } 
                    ));
                    this.ws.send(JSON.stringify(
                        {
                        "meta":{
                            "id":this.id,
                            "method":"subscribe",
                            "endpoint":"gain"
                        },
                        "data":{}
                    }
                    ));
                    this.ws.send(JSON.stringify(
                        {
                        "meta":{
                            "id":this.id,
                            "method":"subscribe",
                            "endpoint":"mute"
                        },
                        "data":{}
                    }
                    ));
                    
                    
                    return;
                }
            });
            logDebug(`targetID: ${this.targetID}`);
        }
        else if ((data.meta.method === 'notify')|| (data.meta.method === 'read')) {
            // get changed variable events and emit them
            const varName = data.meta.endpoint || data.meta.type;
            switch(varName) {
                case 'sleep':
                    logDebug(`sleep: ${data.data}`);
                    this.speakerVariables = {
                        ...this.speakerVariables,
                        sleep: data.data
                    }
                    
                    this.emit('sleepChanged', data.data);
                    break;
                case 'gain':
                    logDebug(`gain: ${data.data.global}`);
                    this.speakerVariables = {
                        ...this.speakerVariables,
                        gain: data.data.global
                    }
                   
                    this.emit('volumeChanged', data.data.global);
                    break;
                case 'mute':
                    logDebug(`mute: ${data.data.global}`);
                    this.speakerVariables = {
                        ...this.speakerVariables,
                        mute: data.data.global
                    }
                    
                    this.emit('muteChanged', data.data.global);
                    break;
                default:
                    logDebug('unknown notify \ read :');
                    logDebug(data);

            }
            
        }
        else if (data.meta.method === 'subscribe') {
            logDebug(`Subscribed to: ${data.meta.endpoint}`);
            //after being subscribed request the current value
            this.ws.send(JSON.stringify(
                {
                    "meta":{
                        "id":this.id,
                        "method":"read",
                        "endpoint":data.meta.endpoint,
                        "target":this.targetID,
                        "targetType":"room"
                    },
                    "data":{}
                }
            ));
        }
        else {
            logDebug('unknown message:');
            logDebug(data);

        }
    };   

    //Set the parameters of the speakers
    setVolume(volume) {
        if (this.connectionStatus === 'disconnected') {
            logDebug('Not connected');
            return;
        };
        if (typeof(volume)!== 'number') {
            logDebug('volume is not a number');
            return;
        };
        if (volume < -60 || volume > 6) {
            logDebug('volume is out of range');
            volume = Math.min(6, Math.max(-60, volume));
        }
        this.ws.send(JSON.stringify(
            {
                "meta":{
                    "id":this.id,
                    "method":"update",
                    "endpoint":"gain2",
                    "target":this.targetID,
                    "targetType":"room"
                },
                "data":{
                    "gain":volume
                }
            }
        ));
    }
    setMute(mute) {
        if (this.connectionStatus === 'disconnected') {
            logDebug('Not connected');
            return;
        };
        if (typeof(mute)!== 'boolean') {
            logDebug(typeof(mute) + ' is not a boolean');
            return;
        };
        this.ws.send(JSON.stringify(
            {
                "meta":{
                    "id":this.id,
                    "method":"update",
                    "endpoint":"mute",
                    "target":this.targetID,
                    "targetType":"room"
                },
                "data":[{
                    "mute":mute,
                    "positionID":"global"
                }]
            }
        ));
    }
    setSleep(sleep) 
    {
        if (this.connectionStatus === 'disconnected') {
            logDebug('Not connected');
            return;
        };
        if (typeof(sleep)!== 'boolean') {
            logDebug('sleep is not a boolean');
            return;
        };
        this.ws.send(JSON.stringify(
            {
                "meta":{
                    "id":this.id,
                    "method":"update",
                    "endpoint":"sleep",
                    "target":this.targetID,
                    "targetType":"room"
                },
                "data":[{
                    "enable":sleep
                }]
            }
        ));
    }
}

module.exports = DD8C_client;

