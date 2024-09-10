# Dutch & Dutch 8C - node-red

This package connects to the Dutch & Dutch 8C speakers via an async websocket connection and allows getting and setting of Volume, Mute and Sleep.

It will find the speakers on the local network, determine the master speaker, retreive the targetID of the room and connect. It has not been designed to work with multiple sets of speakers in a single network. 

Developped and tested on Speaker Firmware version 2.4

after checkout:
terminal in the folder:

npm install

to manually install in node red:
got to your home folder eg by:

cd 

into the node-red folder:

cd .node-red

npm install \path\to\this\project

In node-red, make sure also make a speaker control server in a node and connect the other nodes to the same config node. 