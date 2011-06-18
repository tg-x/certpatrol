// Add CertPatrol checkbox to the 'Clear Recent History' dialog.
// Based on similar functionality from Tab Mix Plus (http://tmp.garyr.net).

var CP_Sanitizer = {
    locale: {},

    onLoad: function (event) {
	if (typeof Sanitizer != 'function') return;

	Sanitizer.prototype.items['extensions-certpatrol'] = {
            clear: function() {
		CertPatrol.delCertsSince(this.range);
            },
            get canClear() {
		return true;
            }
	}
	this.addMenuItem();
    },

    addMenuItem: function () {
	var prefs = document.getElementsByTagName("preferences")[0];
	var _item;
	var itemList = document.getElementById("itemList");
	if (itemList)
          _item = itemList.lastChild;
	else {
            _item = document.getElementsByTagName("checkbox");
            _item = _item[_item.length - 1];
	}
	if (prefs && _item) {// if this isn't true we are lost :)
            let prefName;
            let cpd = _item.getAttribute("preference").indexOf("privacy.cpd.") != -1;
            if (cpd)
	      prefName = "privacy.cpd.extensions-certpatrol";
            else
	      prefName = "privacy.clearOnShutdown.extensions-certpatrol";

            let pref = document.createElement("preference");
            pref.setAttribute("id", prefName);
            pref.setAttribute("name", prefName);
            pref.setAttribute("type", "bool");
            prefs.appendChild(pref);

            let check = document.createElement(itemList ? "listitem" : "checkbox");
            check.setAttribute("label", this.locale.itemLabel);
            //check.setAttribute("accesskey", this.locale.itemKey);
            check.setAttribute("preference", prefName);
            //check.setAttribute("oncommand", "CP_Sanitizer.confirm(this);");

	    var prefsService = Components.classes["@mozilla.org/preferences-service;1"]
	      .getService(Components.interfaces.nsIPrefBranch);
            if (prefsService.prefHasUserValue(prefName))
	      check.setAttribute("checked", prefsService.getBoolPref(prefName));

            if (itemList) {
		check.setAttribute("type", "checkbox");
		check.setAttribute("noduration", "true");
		itemList.setAttribute("rows", itemList.getNumberOfVisibleRows() + 1);
            }
            _item.parentNode.insertBefore(check, null);

            if (typeof gSanitizePromptDialog == "object") {
		pref.setAttribute("readonly", "true");
		check.addEventListener("syncfrompreference", function() { return gSanitizePromptDialog.onReadGeneric(); }, false);
            }
	}
    },
};

