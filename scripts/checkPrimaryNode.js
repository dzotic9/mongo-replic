//nosqldbNodeGroup
var sTargetAppid = getParam("TARGET_APPID"),
    oNodes = jelastic.env.control.GetEnvInfo(sTargetAppid, session).nodes,
//     nodesCount = Number("${nodes.length}"),
    slaveVote = 1,
    obj,
    oResp,
    i, 
    n;
jelastic.marketplace.console.WriteLog("oNodes.length -> " + oNodes.length);
for (i = 0, n = oNodes.length; i < n; i += 1) {
    jelastic.marketplace.console.WriteLog("DEBUG oNodes[i].nodeGroup -> " + oNodes[i].nodeGroup);
    jelastic.marketplace.console.WriteLog("DEBUG oNodes[i] -> " + oNodes[i]);
  if (oNodes[i].nodeGroup == nosqldbNodeGroup) {
      
      jelastic.marketplace.console.WriteLog("checkPrimaryNode - oNodes[i].id -> " + oNodes[i].id);
    if (isPrimary(oNodes[i].id)) {
	    jelastic.marketplace.console.WriteLog("is Primary == true");
jelastic.marketplace.console.WriteLog("in if -> ");
      oResp = {
          result: 0,
          onAfterReturn: []
      };
      obj = {}; obj[next] = {masterNodeId: oNodes[i].id}
      oResp.onAfterReturn.push(obj);
      
      return oResp;
    }
  }
}


return oResp || {
  result: 0
}

function isPrimary(nodeId) {
    var cmd,
	aCmdResp;
  
    cmd = [
        "curl -fsSL \"https://raw.githubusercontent.com/dzotic9/mongo-replic/master/scripts/isMaster.sh\" -o /tmp/checkMaster.sh", 
        "/bin/bash /tmp/checkMaster.sh | grep ismaster | cut -c 15- | rev | cut -c 2- | rev && /bin/bash /tmp/checkMaster.sh | grep secondary | cut -c 16- | rev | cut -c 2- | rev"
    ];
	
	 
    jelastic.marketplace.console.WriteLog("DEBUG checkPrimaryNode isPrimary nodeId -> " + nodeId);
	jelastic.marketplace.console.WriteLog("DEBUG cmd -> " + cmd);
    oResp = exec(nodeId, cmd);
      jelastic.marketplace.console.WriteLog("DEBUG oResp - exec -> " + oResp);
	
	//jelastic.marketplace.console.WriteLog("DEBUG oResp - exec split -> " + oResp.split(','));
	//jelastic.marketplace.console.WriteLog("Custom oResp - exec2 -> " + exec(nodeId, cmd2));
    if (!oResp || oResp.result != 0){
        return oResp;
    }
	
//     if (oResp.responses[1]) {
//         if (oResp.responses[1].out == "") {
// 	    return false;
// 	}
//     }
  
    if (oResp.responses) {
        oResp = oResp.responses[0];
	    
	if (oResp.out) {
		jelastic.marketplace.console.WriteLog("DEBUG oResp.out -> " + oResp.out);
		jelastic.marketplace.console.WriteLog("DEBUG split -> " + oResp.out.split("\n"));
	    aCmdResp = oResp.out.replace(/\n/, ",").split("\n");
		jelastic.marketplace.console.WriteLog("DEBUG aCmdResp -> " + aCmdResp);
	}
    }
	
	jelastic.marketplace.console.WriteLog("DEBUG oResp - aCmdResp[0] -> " + aCmdResp[0]);
	jelastic.marketplace.console.WriteLog("DEBUG oResp - aCmdResp[1] -> " + aCmdResp[1]);
    if (aCmdResp[0] == "true" && aCmdResp[1] == "false") {
        return true;
    }
}

function exec(nodeid, cmd) {
    return jelastic.env.control.ExecCmdById(sTargetAppid, session, nodeid, toJSON([{
      "command": cmd.join("\n")
    }]));
}
