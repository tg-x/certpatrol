var CertPatrol = {
    dbConnection: null,
    selectSignature: null,
    insertSignature: null,
    storageService: Components.classes["@mozilla.org/storage/service;1"]
		    .getService(Components.interfaces.mozIStorageService),
    onLoad: function() {
	// initialization code
	this.initialized = true;
	this.bun = document.getElementById("CertPatrolStrings");
	this.initDB();
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefService);
	this.prefs = prefs.getBranch("extensions.extensions.CertPatrol@PSYC.EU.");
	//boolean switch: debug on/off
	this.debug = this.getBoolPref("debug");
    },

    initDB: function() {
	try {
	    var file = Components.classes[
			    "@mozilla.org/file/directory_service;1"]
		     .getService(Components.interfaces.nsIProperties)
		     .get("ProfD", Components.interfaces.nsIFile);
	    file.append("CertificateSignatures.sqlite");
	    var exists = file.exists();
	    this.dbConnection = this.storageService.openDatabase(file);
	    if (!exists) this.dbConnection.executeSimpleSQL(
		"CREATE TABLE signatures (url VARCHAR, signature VARCHAR)");
	    CertPatrol.selectSignature =
		this.dbConnection.createStatement(
		"SELECT * FROM signatures where url=?1");
	    CertPatrol.insertSignature =
		this.dbConnection.createStatement(
		"INSERT INTO signatures (url,signature) values (?1,?2)");
	    CertPatrol.updateSignature =
		this.dbConnection.createStatement(
		"UPDATE signatures set signature=?2 where url=?1");
	} catch(err) {
	    this.say("Error initializing SQLite operations: "+ err);
	}
    }
};

window.addEventListener("load", function(e) { CertPatrol.onLoad(e); }, false);
