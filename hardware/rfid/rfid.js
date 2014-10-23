/**
 * Copyright 2014 MCQN Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var rfid_sl030 = require("rfid-sl030");
    var fs =  require('fs');
    // Create a single RFID instance that all nodes can use
    var ourfid = new rfid_sl030.RFID_SL030();
    ourfid.init();

    if (!fs.existsSync("/dev/ttyAMA0")) { // unlikely if not on a Pi
        throw "Info : Ignoring Raspberry Pi specific node.";
    }

    function RFID(n) {
        RED.nodes.createNode(this,n);
        this.cardPresent = false;
        this.cardID = "";
        this.rfid = ourfid; 
        var node = this;

        node._interval = setInterval( function() {
            var tag = node.rfid.selectTag();
            if (tag) {
                if (!node.cardPresent) {
                    node.cardID = tag.tagIDString;
                    var msg = {topic:"pi/rfid-presented", payload:node.cardID};
                    node.send(msg);
                }
                // else it's still the same card on the reader
                node.cardPresent = true;
            }
            else {
                if (node.cardPresent) {
                    // The card has just been removed
                    var msg = {topic:"pi/rfid-removed", payload:node.cardID};
                    node.send(msg);
                }
                node.cardPresent = false;
            }
        }, 250);

        node.on("close", function() {
            clearInterval(node._interval);
        });
    }

    function RFIDWrite(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.rfid = ourfid; 
        var node = this;

        this.on("input", function(msg) {
            if (msg != null) {
                if (msg.block != null && msg.payload) {
                    // We've got our pre-requisites
                    // Find an RFID tag first
                    var tag = this.rfid.selectTag();
                    if (tag) {
                        // Tag found.  Authenticate with the block first
                        if (this.rfid.authenticate(this.rfid.sectorForBlock(msg.block))) {
                            // Authenticated.  Prepare the data to write
                            // Blocks on the MiFare 1K tags are 16 bytes long
                            var data = new Buffer(16);
                            data.fill(0);
                            data.write(msg.payload);
                            //console.log("About to write '"+msg.payload+"' to "+msg.block);
                            if (this.rfid.writeBlock(msg.block, data)) {
                                this.send(msg);
                            } else {
                                this.error("Failed to write to RFID tag");
                            }
                        } else {
                            // Error, couldn't authenticate tag
                            this.error("Couldn't authenticate RFID tag");
                        }
                    } else {
                        // Failed to find a tag
                        this.error("No RFID tag found");
                    }
                } else {
                    this.error("Missing either a msg.block or a msg.payload");
                }
            }
        });
    }

    RED.nodes.registerType("rpi-rfid in",RFID);
    RED.nodes.registerType("rpi-rfid write",RFIDWrite);
}
