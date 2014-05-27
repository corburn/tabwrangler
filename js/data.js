/* global indexedDB, IDBKeyRange */
define(['js/settings'], function(Settings) {
  'use strict';

  console.log('load data module');

  var Data = {
    // Database name
    name: 'default',
    // Database version -- must be incremented to change schema
    version: 1,
    db: {},
    sync: {},
    cache: {}
  };

  Data.open = function(name, cb) {
    var openReq = indexedDB.open(this.name, this.version);

    // If some other tab is open with an older version of the database
    // it must be closed before we can proceed
    openReq.onblocked = function(e) {
      // TODO
    };

    // Object stores can only be created in a versionchange transaction
    openReq.onupgradeneeded = function(e) {
      var db = e.target.result;

      // A versionchange transaction is started automatically
      e.target.transaction.onerror = Data.onerror;

      if(db.objectStoreNames.contains(name)) {
        db.deleteObjectStore(name);
      }

      // Create an Object Store
      var objectStore = db.createObjectStore(name, {keyPath: 'url'});

      // Create an optional index for searching
      //objectStore.createIndex('aIndex', 'aIndex', {unique: false});

      // Make sure the Object Store is created before adding data into it
      objectStore.transaction.oncomplete = function(e) {
        // Store values in the newly created Object Store
        console.log('Data.open.onupgradeneeded');
        cb();
      };
    };

    openReq.onsuccess = function(e) {
      Data.db = e.target.result;
      // The database is being updated by another process
      Data.db.onversionchange= function(e) {
        // TODO notify the user
        Data.db.close();
      };
      cb();
    };

    openReq.onerror = Data.onerror;
  };

  Data.close = function() {
    Data.db.close();
  };

  Data.onerror = function(e) {
    // TODO handle database errors
    console.error(e);
  };

  Data.deleteDatabase = function() {
    indexedDB.deleteDatabase(name)
    .onsuccess = function(e) {
      // TODO
    }
    .onerror = function(e) {
      // TODO
    };
  };

  Data.deleteObjectStore = function(name) {
    Data.db.deleteObjectStore(name)
    .onsuccess = function(e) {
      // TODO
    }
    .onerror = function(e) {
      // TODO
    };
  };

/*
 *  Data.getAlltabular = function() {
 *    var trans = Data.db.transaction([name], 'readwrite');
 *    var store = trans.objectStore(name);
 *
 *    // Get everything in the store
 *    var keyRange = IDBKeyRange.lowerbound(0);
 *    var cursorRequest = store.openCursor(keyRange);
 *
 *    cursorRequest.onsuccess = function(e) {
 *      var result = e.target.result;
 *      if(!!result === false) {
 *        return;
 *      }
 *    };
 *
 *    cursorRequest.onerror = Data.onerror;
 *  };
 */

  Data.resetTimer = function resetTimer(tabId) {
    // Ensure id is a string
    var id = tabId.toString();
    // TODO: the alarms API has recently changed to include an optional callback argument
    // When chrome v35 is more common, the create call should be wrapped by the callback
    // to avoid a potential race-condition between the clean and create
    chrome.alarms.clear(id);
    chrome.alarms.create(id, {delayInMinutes: Settings.delay});
  };

  Data.addAll = function addAll(element, cb) {
    console.log('Data.addAll', element);

    // Make sure it is an array that we can iterate over
    var elements = (element instanceof Array) ? element : [element];

    var transaction = Data.db.transaction([Data.name], 'readwrite')
    .oncomplete = cb
    .onerror = cb;
    
    var objectStore = transaction.objectStore(Data.name);

    for (var i = 0; i < elements.length; ++i) {
      objectStore.put(elements[i])
      .onsuccess = cb
      .onerror = cb;
    }
  };

  Data.onCreated = function(Dataular) {
    console.log('Data.onCreated', Dataular);
    Data.db.transaction([Data.name], 'readwrite').objectStore(Data.name).put(Dataular)
    .onsuccess = function(e) {
      console.log('successfully inserted', Dataular, e);
      //chrome.alarms.create(Dataular.url, {delayInMinutes: settings.delay});
    }
    .onerror = function(e) {
      console.log('failed to insert', Dataular, e);
    };
  };

  Data.init = function(tabular) {
    console.log('Data.init');

    Data.open(Data.name);

    chrome.Data.query({windowType: 'normal'}, Data.addAll);

  };

  return Data;
});
