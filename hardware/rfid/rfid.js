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
    var util = require("util");
    var exec = require('child_process').exec;
    var fs =  require('fs');

    if (!fs.existsSync("/dev/ttyAMA0")) { // unlikely if not on a Pi
        throw "Info : Ignoring Raspberry Pi specific node.";
    }

// FIXME Change this to check for rcapp?
    if (!fs.existsSync("/usr/local/bin/gpio")) { // gpio command not installed
        throw "Info : Can't find Raspberry Pi wiringPi gpio command.";
    }

    function RFID(n) {
        RED.nodes.createNode(this,n);
        this.cardPresent = false;
        this.cardID = "";
        var node = this;

        node._interval = setInterval( function() {
            exec("sudo /home/pi/node-red/nodes/node-red-nodes/hardware/rfid/rcapp", function(err,stdout,stderr) {
                if (err) {
                    if (node.cardPresent) {
                        // The card has just been removed
                        var msg = {topic:"pi/rfid-removed", payload:node.cardID};
                        node.send(msg);
                    }
                    node.cardPresent = false;
                }
                else {
                    if (!node.cardPresent) {
                        node.cardID = stdout;
                        var msg = {topic:"pi/rfid-presented", payload:node.cardID};
                        node.send(msg);
                    }
                    // else it's still the same card on the reader
                    node.cardPresent = true;
                }
            });
        }, 150);

        node.on("close", function() {
            clearInterval(node._interval);
        });
    }


    //exec("gpio mode 0 in",function(err,stdout,stderr) {
    //    if (err) {
    //        util.log('[36-rpi-gpio.js] Error: "gpio" command failed for some reason.');
    //    }
    //    exec("gpio mode 1 in");
    //    exec("gpio mode 2 in");
    //    exec("gpio mode 3 in");
    //    exec("gpio mode 4 in");
    //    exec("gpio mode 5 in");
    //    exec("gpio mode 6 in");
    //    exec("gpio mode 7 in");
    //});

    RED.nodes.registerType("rpi-rfid in",RFID);
}
