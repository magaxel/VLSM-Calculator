/*jshint esversion: 6 */

function Network(parameters) {
    this.netmask = parameters.netmask;
    this.network = calc.networkID(parameters.network, this.netmask);
    this.broadcast = calc.broadcast(this.network, this.netmask);
    this.firstHost = calc.firstHost(this.network);
    this.lastHost = calc.lastHost(this.broadcast);
}

Network.prototype.networkToString = function () {
    return convert.ipToDecimal(this.network);
};
Network.prototype.netmaskToString = function () {
    return convert.ipToDecimal(this.netmask);
};
Network.prototype.broadcastToString = function () {
    return convert.ipToDecimal(this.broadcast);
};
Network.prototype.firstHostToString = function () {
    return convert.ipToDecimal(this.firstHost);
};
Network.prototype.lastHostToString = function () {
    return convert.ipToDecimal(this.lastHost);
};
Network.prototype.numberOfHostsToString = function () {
    return calc.numberOfHosts(this.netmask);
};

Network.prototype.prefixToString = function () {
    return convert.maskToPrefix(this.netmask);
};

// Create a master network class that can contain other networks
function MajorNetwork(parameters) {
    Network.call(this, parameters);
    this.minorNetworks = [];
}
MajorNetwork.prototype = Object.create(Network.prototype);
MajorNetwork.prototype.constructor = MajorNetwork; // "Reinsert" the constructor

MajorNetwork.prototype.setMinorNetworks = function (minorNetworks) {
    this.minorNetworks = minorNetworks;
};

// functions related to gui manipulation
var gui = (function () {

    // This method reads form data and returns it as an object
    // Input - Reads form data
    // Output - Form data as an object 
    var readNetwork = function () {
        var network = [2];
        network[0] = convert.ipToBinary($("#network").val());
        network[1] = convert.prefixToBinary($("#netmask").val());
        return network;
    };

    var readHosts = function () {
        var biggestFirst = (a, b) => b - a;
        var subnets = $("#hosts").val().split(",").map(x => parseInt(x)).sort(biggestFirst);
        return subnets;
    };

    var addOutputPriv = function (input) {
        $("#output").append(input);
    };

    var setOutputPriv = function (input) {
        $("#output").html(input);
    };

    var printNetwork = function (network) {
        gui.addOutput("<tr>");
        gui.addOutput("<th>" + network.networkToString() + "</th>");
        gui.addOutput("<th>" + network.netmaskToString() + "</th>");
        gui.addOutput("<th>/" + network.prefixToString() + "</th>");
        gui.addOutput("<th>" + network.firstHostToString() + "</th>");
        gui.addOutput("<th>" + network.lastHostToString() + "</th>");
        gui.addOutput("<th>" + network.broadcastToString() + "</th>");
        gui.addOutput("<th>" + network.numberOfHostsToString() + "</th>");
        gui.addOutput("</tr>");
    };

    var printAllNetworks = function (majorNetwork) {
        gui.setOutput("<tr>");
        gui.addOutput("<th>Network ID</th>");
        gui.addOutput("<th>Netmask</th>");
        gui.addOutput("<th>Prefix</th>");
        gui.addOutput("<th>First host</th>");
        gui.addOutput("<th>Last host</th>");
        gui.addOutput("<th>Broadcast</th>");
        gui.addOutput("<th>Hosts available</th>");
        gui.addOutput("</tr>");
        gui.addOutput("<tr>");
        gui.addOutput("<th>Major network</th>");
        gui.addOutput("</tr>");
        gui.printNetwork(majorNetwork);
        gui.addOutput("<tr>");
        gui.addOutput("<th>Minor networks</th>");
        gui.addOutput("</tr>");
        majorNetwork.minorNetworks.forEach(function (network) {
            gui.printNetwork(network);
        });

    };

    return {
        readNetwork: readNetwork,
        readHosts: readHosts,
        addOutput: addOutputPriv,
        setOutput: setOutputPriv,
        printNetwork: printNetwork,
        printAllNetworks: printAllNetworks
    };
})();

// Conversion between binary and decimal
var convert = (function () {

    // Convert mask prefix to binary
    // Input - An number that represents the network prefix (/24)
    // Output - an array where every element is a binary number
    var prefixToBinaryPriv = function (input) {
        var binaryMask = new Array(32);
        binaryMask.fill(0);
        binaryMask.fill(1, 0, input);
        return binaryMask;
    };

    // Converts a IPv4 address string to an 32-bit binary array
    // Input - A string containing a IPv4 address
    // Output - An array with 32 elements. Each element is a binary number
    var ipToBinaryPriv = function (input) {
        var ipAddress = input.split(".");
        // Convert number to 8-bit binary
        ipAddress = ipAddress.map(x => parseInt(x, 10).toString(2));
        ipAddress = ipAddress.map(x => "00000000" + x);
        ipAddress = ipAddress.map(x => x.slice(-8));
        // flatten array
        ipAddress = ipAddress.reduce((accumulator, currentValue) => accumulator + currentValue);
        ipAddress = ipAddress.split("");
        // Convert String to Number
        ipAddress = ipAddress.map(Number);
        return ipAddress;
    };

    var EMPTY_IP_ARR = new Array(4).fill(0);
    // Convert a 32 element array with integers to a string fomrated IP address
    // Input - a 32 element array, where every element contains a binary number
    // Output - a IP address in string format
    var ipToDecimalPriv = function (input) {
        var sum = (a, b) => a + b;

        input = input.map(x => x.toString());
        return EMPTY_IP_ARR.map((x, i) => input.slice(i * 8, (i + 1) * 8).reduce(sum)) //split input to blocks of size 8
            .map(x => parseInt(x, 2).toString(10))
            .join(".");
    };

    var maskToPrefix = function (netmask) {
        return netmask.filter(mask => mask === 1).length;
    };

    return {
        prefixToBinary: prefixToBinaryPriv,
        ipToBinary: ipToBinaryPriv,
        ipToDecimal: ipToDecimalPriv,
        maskToPrefix: maskToPrefix
    };
})();

// Calculate network sizes
var calc = (function () {

    var firstHostPriv = function (network) {
        var firstHost = network.slice(); //Create copy of the network array
        firstHost[firstHost.length - 1] = 1;
        return firstHost;
    };

    var networkIDPriv = function (network, mask) {
        var hostBits = mask.filter(mask => mask === 0).length;
        var networkID = network.slice(0, network.length - hostBits);
        hostBits = new Array(hostBits).fill(0);
        networkID = networkID.concat(hostBits);
        return networkID;
    };

    // Calculates the broadcast IP address
    // Input - A 32 element array that represents the IP address of the network. 
    // Input - A 32 element array that represents the network mask.
    // Output - A 32 element array that represents the broadcast IP
    var broadcastPriv = function (network, mask) {
        // Count the number of host bits
        var hostBits = mask.filter(mask => mask === 0);
        hostBits = hostBits.length;
        // Count the number of network bits
        var networkBits = mask.filter(mask => mask === 1);
        networkBits = networkBits.length;
        // Create a new array from the network part of the address
        var broadcast = network.slice(0, networkBits);
        // Create the broadcast part of the address
        hostBits = new Array(hostBits).fill(1);
        // Merge both arrays
        broadcast = broadcast.concat(hostBits);
        return broadcast;
    };

    // Calculates number of possible hosts in a network based on a network maks
    // Input - Recives a array of 32 elements. Each element represents a binary in a IPv4 network mask
    // Output - The number of hosts possible in the subnetmask
    var numberOfHostsPriv = function (netmask) {
        var hosts = netmask.filter(x => (x === 0)).length; // create function is zero
        hosts = (Math.pow(2, hosts) - 2);
        return hosts;
    };

    // Calculates the last usable host in the network by setting the broadcast address to '0'
    // Input - A broadcast address in a binary (array) format
    // Output - The last host address (binary array)
    var lastHostPriv = function (broadcast) {
        var lastHost = broadcast.slice();
        lastHost[lastHost.length - 1] = 0;
        return lastHost;
    };

    // Calculates how many hosts that are needed for a certain network
    // Input - The number of hosts that the network should contain
    // Output - A array, where the elements represent a binary network mask
    var subnetRequiredPriv = function (hosts) {
        var hostBits = Math.ceil(Math.log2(parseInt(hosts) + 2));
        var requiredNetmask = new Array(32).fill(0);
        requiredNetmask = requiredNetmask.fill(1, 0, requiredNetmask.length - hostBits);
        return requiredNetmask;
    };

    // Recives a binary number that gets incremented by 1
    // Input - An array where each element represents an binary digit
    // Output - An incremented array of binary digits
    var incrementBinaryPriv = function (bits) {
        bits = bits.join(""); // Create a string out of the elements in the array
        var incremented = Number(parseInt(bits, 2)) + Number(parseInt(1, 2)); // Use addition on 'bits' and number 1 (base 10)
        incremented = parseInt(incremented, 10).toString(2); // Convert back to binary
        incremented = incremented.split(""); // Create an array of the string
        incremented = incremented.map(Number); // Convert the array elements to Number
        var prefix = new Array(bits.length - incremented.length).fill(0); // Re-add any prepending 0's
        incremented = prefix.concat(incremented); // Join the 'prefix' and the incremented value
        return incremented;
    };

    // Creates a minor network in a bigger network
    // Input - Three arrays representing the major network, major network mask, and the subnetmask of the minor network
    // Output - An object that represents a minor network
    var createNextNetwork = function (previousNetwork, previousNetmask, requiredMask) {
        previousNetmask = previousNetmask.filter(mask => mask === 1).length;
        var incrementedBits = previousNetwork.slice(0, previousNetmask); // get the bits that are used for the minor network ID
        var newNetwork = calc.incrementBinary(incrementedBits); // Increment the network id
        newNetwork = newNetwork.concat(new Array(32 - previousNetmask).fill(0)); // Append the host bits
        var network = new Network({
            network: newNetwork,
            netmask: requiredMask
        });
        return network;
    };

    var createMajorNetwork = function (network, netmask) {
        var majorNetwork = new MajorNetwork({
            network: network,
            netmask: netmask
        });
        return majorNetwork;
    };

    // Creates a number of networks based on a major network. The created networks are based on the previously created network in the array
    // Input - A major network (object) and an array conatiaining a number of hosts that the new networks should contain.
    // Output - An array containing the subnettet network objects
    var createMinorNetworks = function (majorNetwork, subnets) {
        // Add the first network to the array
        var minorNetworks = [];
        var minornetwork = calc.subnetRequired(subnets.splice(0, 1));
        var firstMinorNetwork = majorNetwork.network;
        firstMinorNetwork = new Network({
            network: majorNetwork.network,
            netmask: minornetwork
        });

        minorNetworks.push(firstMinorNetwork);

        // Add a new network to the array based on the previous network
        var pusher = function (element) {
            var minorNetwork = calc.createNextNetwork(
                minorNetworks.slice().pop().network,
                minorNetworks.slice().pop().netmask,
                calc.subnetRequired(element));
            minorNetworks.push(minorNetwork);
        };
        subnets.forEach(pusher);
        return minorNetworks;
    };

    return {
        networkID: networkIDPriv,
        firstHost: firstHostPriv,
        broadcast: broadcastPriv,
        lastHost: lastHostPriv,
        numberOfHosts: numberOfHostsPriv,
        subnetRequired: subnetRequiredPriv,
        incrementBinary: incrementBinaryPriv,
        createMajorNetwork: createMajorNetwork,
        createNextNetwork: createNextNetwork,
        createMinorNetworks: createMinorNetworks
    };
})();

var validate = (function () {
    var hosts = function (majorNetwork, hosts) {
        hosts = hosts.map(x => calc.numberOfHosts(calc.subnetRequired(x)));
        var sum = (a, b) => a + b;
        hosts = hosts.reduce(sum);
        var maxHostsPossible = Number.parseInt(majorNetwork.numberOfHostsToString());
        if (hosts <= maxHostsPossible) {
            return true;
        }
        return false;
    };

    var prefix = function (prefix) {
        var regex = /^\d$|^[1,2]\d$|^3[0,2]$/;
        if (regex.test(prefix)) {
            return true;
        }
        return false;
    };
    var ip = function (ip) {
        var regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (regex.test(ip)) {
            return true;
        }
        return false;
    };

    var hostsString = function (hosts) {
        var regex = /^[0-9]+(,[0-9]+)*$/;
        if (regex.test(hosts)) {
            return true;
        }
        return false;
    };

    var inputFields = function () {
        var network = $("#network").val();
        var netmask = $("#netmask").val();
        var hosts = $("#hosts").val();
        var validations = true;

        if (!validate.ip(network)) {
            validations = false;
        }
        if (!validate.prefix(netmask)) {
            validations = false;
        }
        if (!validate.hostsString(hosts)) {
            validations = false;
        }
        return validations;
    };

    return {
        hosts: hosts,
        prefix: prefix,
        ip: ip,
        hostsString: hostsString,
        inputFields: inputFields
    };
})();

$("#form").submit(function (event) {
    // Stop page from reloading
    event.preventDefault();
    var majorNetwork = gui.readNetwork();
    if (validate.inputFields()) {
        majorNetwork = calc.createMajorNetwork(majorNetwork[0], majorNetwork[1]);
        if (validate.hosts(majorNetwork, gui.readHosts())) {
            majorNetwork.setMinorNetworks(calc.createMinorNetworks(majorNetwork, gui.readHosts()));
            gui.printAllNetworks(majorNetwork);
        }
        else {
            gui.setOutput("<p #error>Network too small</p>");
        }
    }
    else {
        gui.setOutput("<p #error>Input field error</p>");
    }
});