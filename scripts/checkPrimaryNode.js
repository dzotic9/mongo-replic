//nosqldbNodeGroup
var sTargetAppid = getParam("TARGET_APPID"),
    oNodes = jelastic.env.control.GetEnvInfo(sTargetAppid, session).nodes,
    bMasterSevice = false,
    nMasterNodeId,
    slaveVote = 1,
    obj,
    oResp,
    i, 
    n;

for (i = 0, n = oNodes.length; i < n; i += 1) {
  if (oNodes[i].nodeGroup == nosqldbNodeGroup) {
      jelastic.marketplace.console.WriteLog(oNodes[i].id);
	  
      if (!nMasterNodeId && oNodes[i].ismaster == true) {
	nMasterNodeId = oNodes[i].id;
      }
      if (isPrimary(oNodes[i].id)) {
      bMasterSevice = true;

      jelastic.marketplace.console.WriteLog("isPrimary ->" + oNodes[i].id);
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

if (!bMasterSevice) {
  jelastic.marketplace.console.WriteLog("isPrimary by master node ->" + nMasterNodeId);
  oResp = {
    result: 0,
    onAfterReturn: []
  };

  obj = {}; obj[initCluster] = {masterNodeId: nMasterNodeId}
  oResp.onAfterReturn.push(obj);

  return oResp;
}


return oResp || {
  result: 0
}

function isPrimary(nodeId) {
    var cmd,
	aCmdResp;
  
    cmd = [
        "curl -fsSL \"${baseUrl}scripts/replicaSet.sh\" -o /tmp/replicaSet.sh", 
        "/bin/bash /tmp/replicaSet.sh --exec=isMaster | grep ismaster | cut -c 15- | rev | cut -c 2- | rev && /bin/bash /tmp/replicaSet.sh --exec=isMaster | grep secondary | cut -c 16- | rev | cut -c 2- | rev"
    ];

    oResp = exec(nodeId, cmd);
    jelastic.marketplace.console.WriteLog("oResp exec ->" + oResp);
    if (!oResp || oResp.result != 0){
        return oResp;
    }

    if (oResp.responses) {
        oResp = oResp.responses[0];
	    
	if (oResp.out) {
	    aCmdResp = oResp.out.replace(/\n/, ",").split(",");
	}
    }

    jelastic.marketplace.console.WriteLog("aCmdResp ->" + aCmdResp);
    if (aCmdResp[0] == "true" && aCmdResp[1] == "false") {
        return true;
    }
}

function exec(nodeid, cmd) {
    return jelastic.env.control.ExecCmdById(sTargetAppid, session, nodeid, toJSON([{
      "command": cmd.join("\n")
    }]));
}
