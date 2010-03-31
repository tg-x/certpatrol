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

    // Firefox
    var content = document.getElementById("content");
    if(content) {
      content.addEventListener("DOMContentLoaded", this.onPageLoad, true);
      content.addEventListener("DOMFrameContentLoaded", this.onPageLoad, true);
    }

    // Thunderbird
    var messagepane = document.getElementById("messagepane");
    if(messagepane)
      messagepane.addEventListener("load", this.onPageLoad, true);
  },


  // helper functions for advanced patrol
  isodate: function(tim) {
    tim = tim.replace(/^(\d\d)\/(\d\d)\/(\d+) /, "$3-$1-$2 ");
    if (tim.length == 8) tim = "20"+ tim;
    return tim;
  },
  timedelta: function(x509time) {
    var d = new Date(x509time);
    // Y2K bug in X.509 and javascript...
    if (d.getFullYear() < 2000) d.setFullYear(100 + d.getFullYear());
    var now = new Date();
    return d.getTime() - now.getTime();
  },


  // Event trigger
  onPageLoad: function(aEvent) {
    var doc = aEvent.originalTarget;

    if (doc.location.protocol == "https:")
      CertPatrol.onSecurePageLoad(doc);
  },


  // SSL trigger
  onSecurePageLoad: function(doc) {
    const ci = Components.interfaces;
    var thiscert;
    var validity;
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
        newEvent:this.strings.getFormattedString("newEvent",[]),
        changeEvent:this.strings.getFormattedString("changeEvent",[]),
        newCert:this.strings.getFormattedString("newCert",[]),
        oldCert:this.strings.getFormattedString("oldCert",[]),
        issuedTo:this.strings.getFormattedString("issuedTo",[]),
        issuedBy:this.strings.getFormattedString("issuedBy",[]),
        validity:this.strings.getFormattedString("validity",[]),
        fingerprints:this.strings.getFormattedString("fingerprints",[]),
        commonName:this.strings.getFormattedString("commonName",[]),
        organization:this.strings.getFormattedString("organization",[]),
        organizationalUnit:this.strings.getFormattedString("organizationalUnit",[]),
        serialNumber:this.strings.getFormattedString("serialNumber",[]),
        emailAddress:this.strings.getFormattedString("emailAddress",[]),
        notBeforeGMT:this.strings.getFormattedString("notBeforeGMT",[]),
        notAfterGMT:this.strings.getFormattedString("notAfterGMT",[]),
        md5Fingerprint:this.strings.getFormattedString("md5Fingerprint",[]),
        sha1Fingerprint:this.strings.getFormattedString("sha1Fingerprint",[])
      }
    };

    // Find the right tab, that issued the event.
    // Load the corresponding securityUI for this event.
    var browser = gBrowser.getBrowserForDocument(doc);
    if (!browser)
      return;

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
    if (thiscert && validity)
    {
      certobj.host = doc.location.host;

      certobj.moz.commonName = thiscert.commonName;
      certobj.moz.organization = thiscert.organization;
      certobj.moz.organizationalUnit = thiscert.organizationalUnit;
      certobj.moz.serialNumber = thiscert.serialNumber;
      certobj.moz.emailAddress = thiscert.emailAddress;
      certobj.moz.notBeforeGMT = validity.notBeforeGMT;
      certobj.moz.notAfterGMT = validity.notAfterGMT;
      certobj.moz.issuerCommonName = thiscert.issuerCommonName;
      certobj.moz.issuerOrganization = thiscert.issuerOrganization;
      certobj.moz.issuerOrganizationUnit = thiscert.issuerOrganizationUnit;
      certobj.moz.md5Fingerprint = thiscert.md5Fingerprint;
      certobj.moz.sha1Fingerprint = thiscert.sha1Fingerprint;

      this.certCheck(certobj);
    }
  },


  // Certificate check
  certCheck: function(certobj) {
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

      if (certobj.moz.commonName != certobj.sql.commonName) {
	certobj.info += "Alert: Hostname has changed. Take a look if that's okay.\n";
	certobj.threat += 2;
      }

      if (certobj.moz.issuerCommonName != certobj.sql.issuerCommonName) {
	certobj.info += "Caution: Certification Authority has changed.\n";
	certobj.threat ++;
      }

      var td = this.timedelta(certobj.sql.notBeforeGMT);
      if (td > 0) {
	certobj.info += "Alert: This certificate isn't valid yet!?\n";
	certobj.threat += 2;
      }

      var td = this.timedelta(certobj.sql.notAfterGMT);
      if (td <= 0) certobj.info += "Info: Old certificate had expired. It needed to be replaced.\n";
      else if (td > 10364400000) {
	certobj.threat += 2;
	certobj.info += "Warning: This certificate wasn't due yet. Maybe there are other reasons why it needed to be exchanged, though.\n";
      } else if (td > 5182200000) {
	certobj.threat ++;
	certobj.info += "Info: This certificate still had over 2 months before it expires, but it's okay to replace it now.\n";
      }
      else if (td > 0) certobj.info = "Info: This certificate will expire in the next 2 months. Normal to replace it.\n";

      if (certobj.threat > 2)
	 certobj.lang.changeEvent = "Reason to worry";
      else if (certobj.threat > 1)
	 certobj.lang.changeEvent = "Suspicious change?";
      else if (certobj.threat > 0)
	 certobj.lang.changeEvent = "A word of warning";
      else
	 certobj.lang.changeEvent = "Mostly harmless";

      certobj.sql.notBeforeGMT = this.isodate(certobj.sql.notBeforeGMT);
      certobj.sql.notAfterGMT = this.isodate(certobj.sql.notAfterGMT);
      certobj.moz.notBeforeGMT = this.isodate(certobj.moz.notBeforeGMT);
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT);

      // Output
      this.outchange(certobj);

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
      certobj.moz.notBeforeGMT = this.isodate(certobj.moz.notBeforeGMT);
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT);

      // Output
      this.outnew(certobj);
    }
  },

  outnew: function(certobj) {
    window.openDialog("chrome://certpatrol/content/new.xul",
		      /* "ssl-new" */ "_blank",
                      "chrome,dialog,modal", certobj);
  },
  
  
  outchange: function(certobj) {
    window.openDialog("chrome://certpatrol/content/change.xul",
		      /* "ssl-change" */ "_blank",
                      "chrome,dialog,modal", certobj);
  },
  
  
  warn: function(result) {
    window.openDialog("chrome://certpatrol/content/warning.xul",
		      /* "ssl-warning" */ "_blank",
                      "chrome,dialog,modal", result);
  },
};


window.addEventListener("load", function(e) { CertPatrol.onLoad(e); }, false);
