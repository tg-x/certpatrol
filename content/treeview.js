/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is mail tree code.
 *
 * The Initial Developer of the Original Code is
 *   Joey Minta <jminta@gmail.com>
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

/**
 * This file contains a prototype object designed to make the implementation of
 * nsITreeViews in javascript simpler.  This object requires that consumers
 * override the _rebuild function.  This function must set the _rowMap object to
 * an array of objects fitting the following interface:
 *
 * readonly attribute string id - a unique identifier for the row/object
 * readonly attribute integer level - the hierarchy level of the row
 * attribute boolean open - whether or not this item's children are exposed
 * string getText(aColName) - return the text to display for this row in the
 *                            specified column
 * void getProperties(aProps) - set the css-selectors on aProps when this is
 *                              called
 * attribute array children - return an array of child-objects also meeting this
 *                            interface
 */

//EXPORTED_SYMBOLS = ["PROTO_TREE_VIEW"];

function PROTO_TREE_VIEW() {
    this._tree = null;
    this._rowMap = null;
    this._persistOpenMap = {};
}

PROTO_TREE_VIEW.prototype = {
    get rowCount() {
	return this._rowMap.length;
    },

    /**
     * CSS files will cue off of these.  Note that we reach into the rowMap's
     * items so that custom data-displays can define their own properties
     */
    getCellProperties: function ftv_getCellProperties(aRow, aCol, aProps) {
	var atomSvc = Components.classes["@mozilla.org/atom-service;1"]
				.getService(Components.interfaces.nsIAtomService);
	this._rowMap[aRow].getProperties(aProps, aCol);
    },

    /**
     * The actual text to display in the tree
     */
    getCellText: function ftv_getCellText(aRow, aCol) {
	return this._rowMap[aRow].getText(aCol);
    },

    getCellValue: function ftv_getCellValue(aRow, aCol) {
	return this._rowMap[aRow].getValue(aCol);
    },

    /**
     * The ftvItems take care of assigning this when building children lists
     */
    getLevel: function ftv_getLevel(aIndex) {
	return this._rowMap[aIndex].level;
    },

    /**
     * This is easy since the ftv items assigned the _parent property when making
     * the child lists
     */
    getParentIndex: function ftv_getParentIndex(aIndex) {
	for (let i = 0; i < this._rowMap.length; i++) {
	    if (this._rowMap[i] == this._rowMap[aIndex]._parent)
	      return i;
	}
	return -1;
    },

    /**
     * This is duplicative for our normal ftv views, but custom data-displays may
     * want to do something special here
     */
    getRowProperties: function ftv_getRowProperties(aIndex, aProps) {
	this._rowMap[aIndex].getProperties(aProps);
    },

    /**
     * If the next item in our list has the same level as us, it's a sibling
     */
    hasNextSibling: function ftv_hasNextSibling(aIndex, aNextIndex) {
	return this._rowMap[aIndex].level == this._rowMap[aNextIndex].level;
    },

    /**
     * If we have a child-list with at least one element, we are a containe.  This
     * means that we don't display empty containers as containers.
     */
    isContainer: function ftv_isContainer(aIndex) {
	return !!this._rowMap[aIndex].children.length;
    },

    isContainerEmpty: function ftv_isContainerEmpty(aIndex) {
	// We don't count you as a container if you don't have children
	return false;
    },

    /**
     * Just look at the ftvItem here
     */
    isContainerOpen: function ftv_isContainerOpen(aIndex) {
	return this._rowMap[aIndex].open;
    },
    isEditable: function ftv_isEditable(aRow, aCol) {
	// We don't support editing rows in the tree yet.  We may want to later as
	// an easier way to rename folders.
	return false;
    },
    isSeparator: function ftv_isSeparator(aIndex) {
	// There are no separators in our trees
	return false;
    },
    isSorted: function ftv_isSorted() {
	// We do our own customized sorting
	return false;
    },
    setTree: function ftv_setTree(aTree) {
	this._tree = aTree;
    },

    /**
     * Opens or closes a folder with children.  The logic here is a bit hairy, so
     * be very careful about changing anything.
     */
    toggleOpenState: function ftv_toggleOpenState(aIndex) {
	// Ok, this is a bit tricky.
	this._rowMap[aIndex].open = !this._rowMap[aIndex].open;
	if (!this._rowMap[aIndex].open) {
	    // We're closing the current container.  Remove the children

	    // Note that we can't simply splice out children.length, because some of
	    // them might have children too.  Find out how many items we're actually
	    // going to splice
	    let count = 0;
	    let i = 2;
	    let row = this._rowMap[aIndex + 1];
	    while (row && row.level > this._rowMap[aIndex].level) {
		count++;
		row = this._rowMap[aIndex + i++];
	    }
	    this._rowMap.splice(aIndex + 1, count);

	    // Remove us from the persist map
	    try {
	        var index = this._persistOpenMap[this.mode].indexOf(this._rowMap[aIndex].id);
	        if (index != -1)
		  this._persistOpenMap[this.mode].splice(index, 1);
	    } catch (e){}
	    // Notify the tree of changes
	    if (this._tree) {
		this._tree.rowCountChanged(aIndex + 1, (-1) * count);
		this._tree.invalidateRow(aIndex);
	    }
	} else {
	    // We're opening the container.  Add the children to our map

	    // Note that these children may have been open when we were last closed,
	    // and if they are, we also have to add those grandchildren to the map
	    let tree = this;
	    let oldCount = this._rowMap.length;
	    function recursivelyAddToMap(aChild, aNewIndex) {
		// When we add sub-children, we're going to need to increase our index
		// for the next add item at our own level
		let count = 0;
		if (aChild.children.length && aChild.open) {
		    for (let [i, child] in Iterator(tree._rowMap[aNewIndex].children)) {
			count++;
			let index = Number(aNewIndex) + Number(i) + 1;
			tree._rowMap.splice(index, 0, child);
			aNewIndex += recursivelyAddToMap(child, index);
		    }
	        }
		return count;
	    }
	    recursivelyAddToMap(this._rowMap[aIndex], aIndex);

	    // Add this folder to the persist map
	    if (!this._persistOpenMap[this.mode])
	      this._persistOpenMap[this.mode] = [];
	    let id = this._rowMap[aIndex].id;
	    if (this._persistOpenMap[this.mode].indexOf(id) == -1)
	      this._persistOpenMap[this.mode].push(id);

	    // Notify the tree of changes
	    if (this._tree)
	      this._tree.rowCountChanged(aIndex, this._rowMap.length - oldCount);
	}
    },

    // We don't implement any of these at the moment
    canDrop: function ftv_canDrop(aIndex, aOrientation) {},
    drop: function ftv_drop(aRow, aOrientation) {},
    performAction: function ftv_performAction(aAction) {},
    performActionOnCell: function ftv_performActionOnCell(aAction, aRow, aCol) {},
    performActionOnRow: function ftv_performActionOnRow(aAction, aRow) {},
    selectionChanged: function ftv_selectionChanged() {},
    setCellText: function ftv_setCellText(aRow, aCol, aValue) {},
    setCellValue: function ftv_setCellValue(aRow, aCol, aValue) {},
    getColumnProperties: function ftv_getColumnProperties(aCol, aProps) {},
    getImageSrc: function ftv_getImageSrc(aRow, aCol) {},
    getProgressMode: function ftv_getProgressMode(aRow, aCol) {},
    cycleCell: function ftv_cycleCell(aRow, aCol) {},
    cycleHeader: function ftv_cycleHeader(aCol) {},

    _tree: null,

    /**
     * An array of ftvItems, where each item corresponds to a row in the tree
     */
    _rowMap: null,

    /**
     * This is a javaascript map of which folders we had open, so that we can
     * persist their state over-time.  It is designed to be used as a JSON object.
     */
    _persistOpenMap: {},

    _restoreOpenStates: function ftv__persistOpenStates() {
	if (!(this.mode in this._persistOpenMap)) return;

	let curLevel = 0;
	let tree = this;

	function openLevel() {
	    var goOn = false;
	    for (let [i, row] in Iterator(tree._rowMap)) {
		if (!row || row.level != curLevel)
		  continue;

		let map = tree._persistOpenMap[tree.mode];
		if (map && map.indexOf(row.id) != -1) {
		    tree.toggleOpenState(i);
		    goOn = true;
		}
	    }

	    // If we opened up any new kids, we need to check their level as well.
	    curLevel++;
	    if (goOn) openLevel();
	}

	openLevel();
    },

    _rebuild: function ftw__rebuild() {
	throw "You must override the _rebuild method of a PROTO_TREE_VIEW!";
    }
};
