# Dutch & Dutch 8C - Node-RED Integration

This package for node-red connects to Dutch & Dutch 8C speakers via an asynchronous WebSocket connection, allowing you to get and set Volume, Mute, and Sleep settings.

It will discover the speakers on the local network, identify the master speaker, retrieve the targetID of the room, and connect. Note that this package is not designed to work with multiple sets of speakers on a single network.

Developed and tested on Speaker Firmware version 2.4.

If you are using something other then node-red, the DD8C_client.js file can be used independently from node-red in your own javascript project.

## Installation

After checking out the repository, open a terminal in the project folder and run:

```sh
npm install
```

### Manual Installation in Node-RED

To manually install the package in Node-RED, navigate to your home directory:

```sh
cd
```

Then, go to the Node-RED folder:

```sh
cd .node-red
```

Install the package:

```sh
npm install /path/to/this/project
```

In Node-RED, ensure you create a speaker control server node and connect the other nodes to the same configuration node.

