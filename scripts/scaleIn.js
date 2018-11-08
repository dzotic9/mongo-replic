//masterNodeId, nodeGroup

import org.json.JSONObject;

var ARBITER_GROUP = "arb",
    sTargetAppid = getParam("TARGET_APPID"),
    aNodes = jelastic.env.control.GetEnvInfo(sTargetAppid, session).nodes,
    aNoSQLAddresses = [],
    aReplicaNodes = [],
    sArbiterIp = "";

for (var i = 0, n = aNodes.length; i < n; i += 1) {
    if (aNodes[i].nodeGroup == nodeGroup) {
        aNoSQLAddresses.push(String(aNodes[i].address));
    }
    
    if (!sArbiterIp && aNodes[i].nodeGroup == ARBITER_GROUP) {
        sArbiterIp = aNodes[i].address;
    }
}

aReplicaNodes = getReplicaAddresses();
jelastic.marketplace.console.WriteLog("aReplicaNodes ->" + aReplicaNodes);

for (var i = 0, n = aReplicaNodes.length; i < n; i += 1) {

    if (aReplicaNodes[i] == sArbiterIp) {
        delete aReplicaNodes[i];
    }

    if (aNoSQLAddresses.indexOf(aReplicaNodes[i]) != -1) {
        delete aReplicaNodes[i];
    }
}

aReplicaNodes = aReplicaNodes.filter(function(n){ 
    return n != undefined 
}); 

for (var i = 0, n = aReplicaNodes.length; i < n; i += 1) {
    var oResp;

    oResp = removeSlave(masterNodeId, aReplicaNodes[i]);
    jelastic.marketplace.console.WriteLog("removeSlave oResp ->" + aReplicaNodes[i] + "-" + oResp);
	
    if (oResp.reconfigured) {
    	return oResp;
    }

    if (!oResp || oResp.result != 0){
        return oResp;
    }
}

function removeSlave(masterId, ip) {
    var cmd = [
            "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh",
            "/bin/bash /tmp/replicaSet.sh --exec=removeSlave --remove=" + ip + ":27017"
        ];
    
    if (!isPrimary(masterId)) {
	oResp = reconfigureRespSet();
	jelastic.marketplace.console.WriteLog("reconfigureRespSet oResp ->" + oResp);
        return {
	    result : 0,
	    reconfigured: true,
	    response: oResp
	}
    }
    
    return exec(masterId, cmd);
}

function reconfigureRespSet() {
    var oConfig = getRsConfig(),
        aAvailableMembers = [],
        oConfigMembers,
        sMemberHost,
	oMember,
	sTmpStr,
	oResp,
        i,
        n;
    
    oConfig = oConfig.responses[0].out;
    oConfig = oConfig.replace(/NumberLong\(.*\)/g, "\"$&\"");
    oConfig = oConfig.replace(/(ObjectId\()(\")([A-Za-z0-9]+)(\")(\))/, '\"$1\\\$23$3\\\$4$5"');
    oConfig = oConfig.match(/{[\s\tA-Za-z\n\w:,.()\[\]{}\\"]+}/g);
    oConfig = (oConfig.length > 0) ? oConfig[0] : oConfig;
    oConfig = toNative(new JSONObject((oConfig)));
    oConfigMembers = oConfig.members;

    for (i = 0, n = oConfigMembers.length; i < n; i += 1) {
        oMember = oConfigMembers[i];
        sMemberHost = oMember.host.replace(':27017', '');

        if (aReplicaNodes.indexOf(sMemberHost) == -1) {
            aAvailableMembers.push(oMember);
        }
    }
	
    if (aAvailableMembers.length > 0) {
        return setNewConfig(aAvailableMembers);
    }
	
    return false;
}

function setNewConfig(oConfig) {
    var sConfig,
	cmd;
	
    sConfig = String(oConfig).replace(/\"/g, "\\\"").replace(/(\\\")(NumberLong\(.\))(\\\")/g, '$2');

    cmd = [
        "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh",
        "/bin/bash /tmp/replicaSet.sh --exec=setConfig --config=\"" + sConfig + "\""
    ];

    return exec(masterNodeId, cmd);
}

function getRsConfig() {
    var cmd = [
        "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh",
        "/bin/bash /tmp/replicaSet.sh --exec=getConfig"
    ];
    
    return exec(masterNodeId, cmd);
}

function isPrimary(nodeId) {
    var cmd,
	aCmdResp;
  
    cmd = [
        "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh", 
        "/bin/bash /tmp/replicaSet.sh --exec=isMaster | grep ismaster | cut -c 15- | rev | cut -c 2- | rev && /bin/bash /tmp/replicaSet.sh --exec=isMaster | grep secondary | cut -c 16- | rev | cut -c 2- | rev"
    ];

    oResp = exec(nodeId, cmd);

    if (!oResp || oResp.result != 0){
        return oResp;
    }

    if (oResp.responses) {
        oResp = oResp.responses[0];
	    
	if (oResp.out) {
	    aCmdResp = oResp.out.replace(/\n/, ",").split(",");
	}
    }

    if (aCmdResp[0] == "true" && aCmdResp[1] == "false") {
        return true;
    }
    
    return false;
}

function getReplicaAddresses() {
    var cmd,
        oResp,
        aIps = [];
    
    cmd = [
        "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh",
        "/bin/bash -x /tmp/replicaSet.sh --exec=getStatus | grep name"
    ];

    oResp = exec(${nodes.nosqldb[0].id}, cmd);
    if (!oResp || oResp.result != 0) {
        return oResp;
    }
    
    aIps = oResp.responses[0].out.replace(/.*\"name\" : \"/g, "");
    aIps = aIps.replace(/:27017/g, "");
    aIps = aIps.replace(/\",\n/g, ",").slice(0, -2);
    return aIps.split(",");
}

function exec(nodeid, cmd) {
    return jelastic.env.control.ExecCmdById(sTargetAppid, session, nodeid, toJSON([{
      "command": cmd.join("\n")
    }]));
}

return {
    result: 0
};
