// This file has been generated using prep.   http://perl.pages.de

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * ''Certificate Patrol'' was conceived by Carlo v. Loesch and
 * implemented by Aiko Barz, Mukunda Modell and Carlo v. Loesch.
 *
 * http://patrol.psyced.org
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *  
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete 
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *                              
 * ***** END LICENSE BLOCK ***** */

var CertPatrol = {

  // Main
  onLoad: function() {
    this.initialized = true;
    this.strings = document.getElementById("CertPatrol-strings");
    this.dbinit();
    this.init();
  },


  // DB init
  dbinit: function() {
    this.dbh = null;
    this.dbselect = null;
    this.dbinsert = null;
    this.dbupdate = null;

    try {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties)
                 .get("ProfD", Components.interfaces.nsIFile);
      var storage = Components.classes["@mozilla.org/storage/service;1"]
                    .getService(Components.interfaces.mozIStorageService);
      file.append("CertPatrol.sqlite");

      // Must be checked before openDatabase()
      var exists = file.exists();

      // Now, CertPatrol.sqlite exists
      this.dbh = storage.openDatabase(file);

      // CertPatrol.sqlite initialization
      if (!exists) {
        this.dbh.executeSimpleSQL(
        "CREATE TABLE version (version INT)");
        this.dbh.executeSimpleSQL(
        "INSERT INTO version (version) VALUES (1)");
        this.dbh.executeSimpleSQL(
        "CREATE TABLE certificates (host VARCHAR, commonName VARCHAR, organization VARCHAR, organizationalUnit VARCHAR, serialNumber VARCHAR, emailAddress VARCHAR, notBeforeGMT VARCHAR, notAfterGMT VARCHAR, issuerCommonName VARCHAR, issuerOrganization VARCHAR, issuerOrganizationUnit VARCHAR, md5Fingerprint VARCHAR, sha1Fingerprint VARCHAR)");
      }

      // Prepared statements
      this.dbselect = this.dbh.createStatement(
      "SELECT * FROM certificates where host=?1");
      this.dbinsert = this.dbh.createStatement(
      "INSERT INTO certificates (host, commonName, organization, organizationalUnit,serialNumber, emailAddress, notBeforeGMT, notAfterGMT, issuerCommonName, issuerOrganization, issuerOrganizationUnit, md5Fingerprint, sha1Fingerprint) values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)");
      this.dbupdate = this.dbh.createStatement(
      "UPDATE certificates set commonName=?2, organization=?3, organizationalUnit=?4, serialNumber=?5, emailAddress=?6, notBeforeGMT=?7, notAfterGMT=?8, issuerCommonName=?9, issuerOrganization=?10, issuerOrganizationUnit=?11, md5Fingerprint=?12, sha1Fingerprint=?13 where host=?1");
    }
    catch(err) {
      this.warn("Error initializing SQLite operations: "+ err);
    }
  },


  // Application trigger
  init: function() {
    this.prefs = Cc["@mozilla.org/preferences-service;1"]
                   .getService(Ci.nsIPrefService)
                   .getBranch("certpatrol.")
                   .QueryInterface(Ci.nsIPrefBranch2);

    // Firefox
    var content = document.getElementById("content");
    if(content) {
      content.addEventListener("load", this.onPageLoad, true);
    }

    // Thunderbird
    var messagepane = document.getElementById("messagepane");
    if(messagepane)
      messagepane.addEventListener("load", this.onPageLoad, true);
  },


  // helper functions for advanced patrol
  isodate: function(tim) {
    if (isNaN(tim)) {
      var iso = tim.replace(/^(\d\d)\/(\d\d)\/(\d+)/, "$3-$1-$2");
      // upcoming Y3K bug, but you must delete this line before 2020
      if (iso != tim) {
	  if (iso[0] != '2') iso = "20"+ iso;
	  return iso;
      }
    }
    var d = new Date(tim / 1000);
    // mozilla has this nice strftime extension to Date called toLocaleFormat()
    return d.toLocaleFormat("%Y-%m-%d %H:%M:%S");
  },
  timedelta: function(tim) {
    if (!isNaN(tim)) tim /= 1000;
    var d = new Date(tim);
    // Y2K bug in Javascript...  :)
    if (d.getFullYear() < 2000) d.setFullYear(100 + d.getFullYear());
    var now = new Date();
    //alert("Now is "+ now.getTime() +" and cert is "+ d.getTime());
    return d.getTime() - now.getTime();
  },
  daysdelta: function(td) {
    td = Math.round(td / 86400000);	// milliseconds per day
    return " ("+ this.strings.getFormattedString(td < 0 ?
	 "daysPast" : "daysFuture", [td < 0 ? -td : td]) +")";
  },


  // Event trigger
  onPageLoad: function(aEvent) {
    var doc = aEvent.originalTarget;

    if (doc && doc.location && doc.location.protocol == "https:")
      CertPatrol.onSecurePageLoad(doc);
  },

  // SSL trigger
  onSecurePageLoad: function(doc) {
    const ci = Components.interfaces;
    var thiscert;
    var validity;

    var browser = gBrowser.getBrowserForDocument(doc);
    if (!browser) {
//	alert("Could not find browser for "+ doc.location);
	return;
    }
//  else alert("CertPatrol.onSecurePageLoad has browser for "+ doc.location);

    var certobj={
      threat:0,
      info:"",
      host:"",
      moz:{
        commonName:"",
        organization:"",
        organizationalUnit:"",
        serialNumber:"",
        emailAddress:"",
        notBeforeGMT:"",
        notAfterGMT:"",
        issuerCommonName:"",
        issuerOrganization:"",
        issuerOrganizationUnit:"",
        md5Fingerprint:"",
        sha1Fingerprint:""
      },
      sql:{
        commonName:"",
        organization:"",
        organizationalUnit:"",
        serialNumber:"",
        emailAddress:"",
        notBeforeGMT:"",
        notAfterGMT:"",
        issuerCommonName:"",
        issuerOrganization:"",
        issuerOrganizationUnit:"",
        md5Fingerprint:"",
        sha1Fingerprint:""
      },
      lang:{
        newEvent:this.strings.getString("newEvent"),
        changeEvent:this.strings.getString("changeEvent"),
        newCert:this.strings.getString("newCert"),
        oldCert:this.strings.getString("oldCert"),
        issuedTo:this.strings.getString("issuedTo"),
        issuedBy:this.strings.getString("issuedBy"),
        validity:this.strings.getString("validity"),
        fingerprints:this.strings.getString("fingerprints"),
        commonName:this.strings.getString("commonName"),
        organization:this.strings.getString("organization"),
        organizationalUnit:this.strings.getString("organizationalUnit"),
        serialNumber:this.strings.getString("serialNumber"),
        emailAddress:this.strings.getString("emailAddress"),
        notBeforeGMT:this.strings.getString("notBeforeGMT"),
        notAfterGMT:this.strings.getString("notAfterGMT"),
        md5Fingerprint:this.strings.getString("md5Fingerprint"),
        sha1Fingerprint:this.strings.getString("sha1Fingerprint"),
        viewDetails:this.strings.getString("viewDetails")  // no comma
      }
    };

    var ui = browser.securityUI;
    if (!ui)
      return;
    
    var sp = ui.QueryInterface(ci.nsISSLStatusProvider);
    if (!sp)
      return;

    var stats = sp.SSLStatus;
    // Domainname not found,
    // Selfsigned and not yet accepted
    if (!stats)
      return;
    
    var stati = stats.QueryInterface(ci.nsISSLStatus);
    if (!stati)
      return;

    thiscert = stati.serverCert;
    if (!thiscert)
      return;

    validity = thiscert.validity.QueryInterface(ci.nsIX509CertValidity);
    if (!validity)
      return;

    // The interesting part
    certobj.host = doc.location.host;

    certobj.moz.commonName = thiscert.commonName;
    certobj.moz.organization = thiscert.organization;
    certobj.moz.organizationalUnit = thiscert.organizationalUnit;
    certobj.moz.serialNumber = thiscert.serialNumber;
    certobj.moz.emailAddress = thiscert.emailAddress;
    certobj.moz.notBeforeGMT = validity.notBefore;
    certobj.moz.notAfterGMT = validity.notAfter;
    certobj.moz.issuerCommonName = thiscert.issuerCommonName;
    certobj.moz.issuerOrganization = thiscert.issuerOrganization;
    certobj.moz.issuerOrganizationUnit = thiscert.issuerOrganizationUnit;
    certobj.moz.md5Fingerprint = thiscert.md5Fingerprint;
    certobj.moz.sha1Fingerprint = thiscert.sha1Fingerprint;

    this.certCheck(browser, certobj);
  },


  // Certificate check
  certCheck: function(browser, certobj) {
    var found = false;

    // Get certificate
    var stmt = this.dbselect;
    try {
      stmt.bindUTF8StringParameter(0, certobj.host);
      if (stmt.executeStep()) {
        found=true;
        certobj.sql.commonName = stmt.getUTF8String(1);
        certobj.sql.organization = stmt.getUTF8String(2);
        certobj.sql.organizationalUnit = stmt.getUTF8String(3);
        certobj.sql.serialNumber = stmt.getUTF8String(4);
        certobj.sql.emailAddress = stmt.getUTF8String(5);
        certobj.sql.notBeforeGMT = stmt.getUTF8String(6);
        certobj.sql.notAfterGMT = stmt.getUTF8String(7);
        certobj.sql.issuerCommonName = stmt.getUTF8String(8);
        certobj.sql.issuerOrganization = stmt.getUTF8String(9);
        certobj.sql.issuerOrganizationUnit = stmt.getUTF8String(10);
        certobj.sql.md5Fingerprint = stmt.getUTF8String(11);
        certobj.sql.sha1Fingerprint = stmt.getUTF8String(12);
      }
    } catch(err) {
      this.warn("Error trying to check certificate: "+ err);
    } finally {
      stmt.reset();
    }


    // The certificate changed 
    if ( found && (
         certobj.sql.sha1Fingerprint != certobj.moz.sha1Fingerprint ||
         certobj.sql.md5Fingerprint  != certobj.moz.md5Fingerprint 
       )) {
      
      // DB update
      stmt = this.dbupdate;
      try {
        stmt.bindUTF8StringParameter( 0, certobj.host);
        stmt.bindUTF8StringParameter( 1, certobj.moz.commonName);
        stmt.bindUTF8StringParameter( 2, certobj.moz.organization);
        stmt.bindUTF8StringParameter( 3, certobj.moz.organizationalUnit);
        stmt.bindUTF8StringParameter( 4, certobj.moz.serialNumber);
        stmt.bindUTF8StringParameter( 5, certobj.moz.emailAddress);
        stmt.bindUTF8StringParameter( 6, certobj.moz.notBeforeGMT);
        stmt.bindUTF8StringParameter( 7, certobj.moz.notAfterGMT);
        stmt.bindUTF8StringParameter( 8, certobj.moz.issuerCommonName);
        stmt.bindUTF8StringParameter( 9, certobj.moz.issuerOrganization);
        stmt.bindUTF8StringParameter(10, certobj.moz.issuerOrganizationUnit);
        stmt.bindUTF8StringParameter(11, certobj.moz.md5Fingerprint);
        stmt.bindUTF8StringParameter(12, certobj.moz.sha1Fingerprint);
        stmt.execute();
      } catch(err) {
        this.warn("Error trying to update certificate: "+ err);
      } finally {
        stmt.reset();
      }

      // Try to make some sense out of the certificate changes
      var natd = this.timedelta(certobj.sql.notAfterGMT);
      if (natd <= 0) certobj.info += this.strings.getString("warn_notAfterGMT_expired") +"\n";
      else if (natd > 10364400000) {
	certobj.threat += 2;
        certobj.info += this.strings.getString("warn_notAfterGMT_notdue") +"\n";
      } else if (natd > 5182200000) {
	certobj.threat ++;
        certobj.info += this.strings.getString("warn_notAfterGMT_due") +"\n";
      }
      else if (natd > 0) certobj.info += this.strings.getString("warn_notAfterGMT_due") +"\n";
      if (certobj.moz.commonName != certobj.sql.commonName) {
        certobj.info += this.strings.getString("warn_commonName") +"\n";
	certobj.threat += 2;
      }
      if (certobj.moz.issuerCommonName != certobj.sql.issuerCommonName) {
        certobj.info += this.strings.getString("warn_issuerCommonName") +"\n";
	certobj.threat ++;
      }
      var td = this.timedelta(certobj.moz.notBeforeGMT);
      if (td > 0) {
        certobj.info += this.strings.getString("warn_notBeforeGMT") +"\n";
	certobj.threat += 2;
      }

      if (certobj.threat > 3) certobj.threat = 3;
      certobj.lang.changeEvent += " "+ this.strings.getString("threatLevel_"+ certobj.threat);

      certobj.sql.notBeforeGMT= this.isodate(certobj.sql.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.sql.notBeforeGMT));
      certobj.sql.notAfterGMT = this.isodate(certobj.sql.notAfterGMT) +
				this.daysdelta(natd);
      certobj.moz.notBeforeGMT= this.isodate(certobj.moz.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notBeforeGMT));
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notAfterGMT));

      // Output
      this.outchange(browser, certobj);

    // New certificate
    } else if (!found) {
      
      // Store data
      stmt = this.dbinsert;
      try {
        stmt.bindUTF8StringParameter( 0, certobj.host);
        stmt.bindUTF8StringParameter( 1, certobj.moz.commonName);
        stmt.bindUTF8StringParameter( 2, certobj.moz.organization);
        stmt.bindUTF8StringParameter( 3, certobj.moz.organizationalUnit);
        stmt.bindUTF8StringParameter( 4, certobj.moz.serialNumber);
        stmt.bindUTF8StringParameter( 5, certobj.moz.emailAddress);
        stmt.bindUTF8StringParameter( 6, certobj.moz.notBeforeGMT);
        stmt.bindUTF8StringParameter( 7, certobj.moz.notAfterGMT);
        stmt.bindUTF8StringParameter( 8, certobj.moz.issuerCommonName);
        stmt.bindUTF8StringParameter( 9, certobj.moz.issuerOrganization);
        stmt.bindUTF8StringParameter(10, certobj.moz.issuerOrganizationUnit);
        stmt.bindUTF8StringParameter(11, certobj.moz.md5Fingerprint);
        stmt.bindUTF8StringParameter(12, certobj.moz.sha1Fingerprint);
        stmt.execute();
      } catch(err) {
        this.warn("Error trying to insert certificate for "+certobj.host+
                  ": "+err);
      } finally {
        stmt.reset();
      }
      certobj.moz.notBeforeGMT = this.isodate(certobj.moz.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notBeforeGMT));
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notAfterGMT));

      // Output
      this.outnew(browser, certobj);
    }
  },

  outnew: function(browser, certobj) {
    var forcePopup = false;
    if (this.prefs) forcePopup = !this.prefs.getBoolPref("popup.new");

    var notifyBox = gBrowser.getNotificationBox();
    if (forcePopup || notifyBox == null) {
	window.openDialog("chrome://certpatrol/content/new.xul", "_blank",
			  "chrome,dialog,modal", certobj);
	return;
    }
    notifyBox.appendNotification(
	"(CertPatrol) "+ certobj.lang.newEvent
	  +" "+ certobj.moz.commonName +". "+
	  certobj.lang.issuedBy +" "+
	    (certobj.moz.issuerOrganization || certobj.moz.issuerCommonName),
	certobj.host, null,
	notifyBox.PRIORITY_INFO_HIGH, [
	    { accessKey: "D", label: certobj.lang.viewDetails,
	      callback: function(msg, btn) {
	window.openDialog("chrome://certpatrol/content/new.xul", "_blank",
			  "chrome,dialog,modal", certobj);
	} },
    ]);
  },
  
  
  outchange: function(browser, certobj) {
    var forcePopup = false;
    if (this.prefs) forcePopup = !this.prefs.getBoolPref("popup.change");

    var notifyBox = gBrowser.getNotificationBox();
    if (forcePopup || certobj.threat > 1 || notifyBox == null) {
	window.openDialog("chrome://certpatrol/content/change.xul", "_blank",
			  "chrome,dialog,modal", certobj);
	return;
    }
    notifyBox.appendNotification(
	"(CertPatrol) "+ certobj.lang.changeEvent
	  +" "+ certobj.moz.commonName +". "+
	  certobj.lang.issuedBy +" "+
	    (certobj.moz.issuerOrganization || certobj.moz.issuerCommonName)
          +" "+ certobj.info,
	certobj.host, null,
	certobj.threat > 0 ? notifyBox.PRIORITY_WARNING_HIGH
			    : notifyBox.PRIORITY_INFO_LOW, [
	    { accessKey: "D", label: certobj.lang.viewDetails,
	      callback: function(msg, btn) {
	window.openDialog("chrome://certpatrol/content/change.xul", "_blank",
			  "chrome,dialog,modal", certobj);
	} },
    ]);
  },
  
  
  warn: function(result) {
    window.openDialog("chrome://certpatrol/content/warning.xul",
		      /* "ssl-warning" */ "_blank",
                      "chrome,dialog,modal", result);
  },
};


window.addEventListener("load", function(e) { CertPatrol.onLoad(e); }, false);
