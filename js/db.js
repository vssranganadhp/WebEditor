/*!
 * JavaScript IndexedDB Library v1.0.0
 * http://hiddenbrains.com/
 * 
 * Author : Ranganadh
 *
 * Copyright 2007, 2015 HiddenBrains Infotech Pvt. Ltd.
 * Released under the MIT license
 * http://hiddenbrains.com/license
 *
 * Date: Wed Mar 18 2015 18:17:54 GMT+0530 (IST)
 */

function Database(opts){
	this.db = null;
	var defaults = {
		name : "HB_WEB_EDITOR",
		initialized : false,
		callback : null
	}
	$.extend(defaults,opts);
	if(!this.initialized){
		this.init(defaults);
	}
}

Database.prototype.init = function(opts){
	var that = this;
	this.options = opts;
	var openRequest = window.indexedDB.open(this.options.name,1)
	openRequest.onerror = function(e){
		console.log("Error opening DB");
		console.log(e);
	}
	openRequest.onupgradeneeded = function(e){
		var objectStore;
		that.db = e.target.result;
		if(!that.db.objectStoreNames.contains("files")){
			console.log("Creating object store");
			objectStore = that.db.createObjectStore("files",{
				keyPath : "id",
				autoIncrement: true
			});
			objectStore.createIndex("name","name",{
				unique : true
			});
			objectStore.createIndex("content","content",{
				unique : false
			});
		}
	}
	openRequest.onsuccess = function(e){
		that.db = e.target.result;
		that.db.onerror = function(event){
			console.log(event.target.errorCode);
		}
		that.initialized = true;
		console.log("Database initialized");
		if(typeof that.options.callback == 'function'){
			that.options.callback(that);
		}
	}
}

Database.prototype.removeDatabase = function(){
	if(this.initialized){
		indexedDB.deleteDatabase(this.name);
		this.initialized = false;
		console.log("Database removed");
	}
}

function getDatabaseHook(){
	var dbHook = new Database({
		callback : function(db){
			console.log("creation / fetching callback called");
			var result = [];
			var handleResult = function(event){
				console.log(event);
				var cursor = event.target.result;
				console.log(cursor);
				if(cursor){
					result.push({
						key : cursor.key,
						title : cursor.value.title,
						updated : cursor.value.updated
					});
					cursor.continue();
				}
			}

			var transaction = db.db.transaction(["files"],"readwrite");
			var objectStore = transaction.objectStore("files");
			objectStore.openCursor().onsuccess = handleResult;

			transaction.oncomplete = function(event){
				console.log(result);
			}
		}
	});
	return dbHook;
}


/*

Files
-------
name
content
cursor


*/


// transaction.objectStore("files").add({name : 'test',content:'dfhgsvkdfgh skfdjgh ksjdf g'});