//var certLastSeen = 0;

CertPatrol.onFirefoxLoad = function() {
    var appcontent = document.getElementById("appcontent");   // browser
    if(appcontent)
	appcontent.addEventListener("DOMContentLoaded",
				    this.onPageLoad, true);
};

CertPatrol.onSecurePageLoad = function(aEvent,location) {
    var ui = gBrowser.securityUI;
    sp = ui.QueryInterface(Components.interfaces.nsISSLStatusProvider);
    status = sp.SSLStatus;
    status = status.QueryInterface(Components.interfaces.nsISSLStatus);
    var cert = status.serverCert;
    var stmt = this.selectSignature;
    var found=false;
    try {
	stmt.bindUTF8StringParameter(0, location.host);
	if (stmt.executeStep()) {
	    found=true;
	    signature = stmt.getUTF8String(1);
	    // unfortunately we are comparing by fingerprints. would be
	    // more accurate according to X.509 to compare the complete
	    // certificates. TODO
	    if (signature != cert.sha1Fingerprint) {
		this.msg("cpat.msg.change",
		      [ location.host, signature ]);
		stmt.reset();
		stmt = this.updateSignature;
		try {
		    this.msg("cpat.msg.update",
			  [ location.host, cert.sha1Fingerprint ]);
		    stmt.bindUTF8StringParameter(0, location.host);
		    stmt.bindUTF8StringParameter(1, cert.sha1Fingerprint);
		    stmt.execute();
		} catch(err) {
		    this.say("Error trying to update fingerprint: "+ err);
		}
		stmt.reset();
	    } else {
		// debug mode, controlled by a preference value
		if (CertPatrol.debug==true) {
	//	if (certLastSeen != signature) {
	//	    certLastSeen = signature;
//			    this.say("Fingerprint for "+ location.host
//				+" matched. Everything okay apparently."
//				+" Since you are in debug mode, here it is: "
//				+ signature);
// infos on http://developer.mozilla.org/en/docs/XUL_Tutorial:Property_Files
		    this.msg("cpat.msg.verbose",
			  [ location.host, signature ]);
		}
	    }
	}
    } catch(err) {
	this.say("Error trying to check certificate: "+ err);
    } finally {
    	stmt.reset();
    }
    if (!found) {
    	stmt = this.insertSignature;
	try {
	    this.msg("cpat.msg.insert", [ location.host, cert.sha1Fingerprint ]);
	    stmt.bindUTF8StringParameter(0, location.host);
	    stmt.bindUTF8StringParameter(1, cert.sha1Fingerprint);
	    stmt.execute();
	} catch(err) {
	    this.say("Error trying to insert "+ cert.sha1Fingerprint +" for "+ location.host +": "+ err);
	}
	stmt.reset();
    }
};

CertPatrol.onPageLoad = function(aEvent) {
    var doc = aEvent.originalTarget;
    //this.say(doc.location.protocol);
    if (doc.location.protocol=="https:") {
	    CertPatrol.onSecurePageLoad(aEvent,doc.location);
    }
};

//get a boolean preference value from the extension's preference branch
CertPatrol.getBoolPref = function(prefName) {
	return this.prefs.getBoolPref(prefName);
}

CertPatrol.msg = function(template, args) {
//  alert("*** "+ template +" *** "+ args + " ***");
    this.say(this.bun.getFormattedString(template, args));
}

CertPatrol.say = function(text) {
//  alert("*** "+ text + " ***");
    window.openDialog("chrome://certpatrol/content/dialog.xul","cpat-dialog","chrome,dialog,modal", text);
}

window.addEventListener("load", function(e) { CertPatrol.onFirefoxLoad(e); }, false);
