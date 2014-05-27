/* global indexedDB, IDBKeyRange */
define(function() {
  'use strict';

  console.log('load data module');

  var Data = {
    // Database name
    name: 'default',
    // Database version -- must be incremented to change schema
    version: 2,
    indexedDB: {},
    sync: {},
  };

  Data.indexedDB.open = function(name, cb) {
    console.log('opening indexedDB:', name);
    var openReq = indexedDB.open(Data.name, Data.version);

    // If some other tab is open with an older version of the database
    // it must be closed before we can proceed
    openReq.onblocked = function(e) {
      // TODO
      console.error('open blocked: an older version of the database is open', e);
    };

    // Object stores can only be created in a versionchange transaction
    openReq.onupgradeneeded = function(e) {
      console.log('upgrading indexedDB to version ', this.version);
      var db = e.target.result;

      // A versionchange transaction is started automatically
      e.target.transaction.onerror = Data.onerror;

      if(db.objectStoreNames.contains(name)) {
        db.deleteObjectStore(name);
      }

      // Create an Object Store
      var objectStore = db.createObjectStore(name, {keyPath: 'id'});

      // Create an optional index for searching
      objectStore.createIndex('url', 'url', {unique: true});

      // Make sure the Object Store is created before adding data into it
      objectStore.transaction.oncomplete = function(e) {
        // Store values in the newly created Object Store
        console.log('Data.open.onupgradeneeded', e);
      };
    };

    openReq.onsuccess = function(e) {
      console.log('open indexedDB successful');
      Data.db = e.target.result;
      console.log(cb);
      cb(e);
      // The database is being updated by another process
      Data.db.onversionchange= function(e) {
        // TODO notify the user
        Data.db.close();
      };
    };

    openReq.onerror = Data.onerror;
  };

  Data.onerror = function(e) {
    // TODO handle database errors
    console.error(e);
  };

  /*
   *Data.indexedDB.deleteDatabase = function() {
   *  indexedDB.deleteDatabase(name)
   *  .onsuccess = function(e) {
   *    // TODO
   *  }
   *  .onerror = function(e) {
   *    // TODO
   *  };
   *};
   */

  /*
   *Data.deleteObjectStore = function(name) {
   *  Data.db.deleteObjectStore(name)
   *  .onsuccess = function(e) {
   *    // TODO
   *  }
   *  .onerror = function(e) {
   *    // TODO
   *  };
   *};
   */

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

  function resetTimer(tabId) {
    // Ensure id is a string
    var id = tabId.toString();
    return function() {
      // TODO: the alarms API has recently changed to include an optional callback argument
      // When chrome v35 is more common, the create call should be wrapped by the callback
      // to avoid a potential race-condition between the clean and create
      chrome.alarms.clear(id);
      chrome.alarms.create(id, {delayInMinutes: Data.sync.delay});
    };
  }

  Data.indexedDB.addAll = function addAll(element) {
    console.log('Data.addAll', element);
    // Make sure it is an array that we can iterate over
    var elements = (element instanceof Array) ? element : [element];
    var transaction = Data.db.transaction([Data.name], 'readwrite');
    transaction.oncomplete = function(e) { console.log(e); };
    transaction.onerror = Data.onerror;

    var objectStore = transaction.objectStore(Data.name);

    for (var i = 0; i < elements.length; ++i) {
      var request = objectStore.put(elements[i]);
      request.onsuccess = resetTimer(elements[i].id);
      request.onerror = Data.onerror;
    }
  };

  Data.indexedDB.remove = function remove(key) {
    console.log('Data.remove', key);
    var request = Data.db.transaction([Data.name], 'readwrite').delete(key);
    request.onerror = Data.onerror;
    request.onsuccess = function(e) {
      console.log('successfully removed from the database tab id:', key, e);
    };
  };

  /*
  *Data.onCreated = function(tab) {
  *  console.log('Data.onCreated', tab);
  *  Data.db.transaction([Data.name], 'readwrite').objectStore(Data.name).put(tab)
  *  .onsuccess = function(e) {
  *    console.log('successfully inserted', tab, e);
  *    //chrome.alarms.create(tab.id, {delayInMinutes: settings.delay});
  *  }
  *  .onerror = function(e) {
  *    console.log('failed to insert', tab, e);
  *  };
  *};
  */

  /*
  *Data.sync.lock = function(url) {
  *  chrome.storage.sync.get({'lock': []}, function(items) {
  *    // TODO: set lock icon?
  *    chrome.storage.sync.set({'lock': items.lock.push(url)});
  *  });
  *};
  */

  /*
  *Data.sync.unlock = function(url) {
  *  chrome.storage.sync.get({'lock': []}, function(items) {
  *    // Locate url in the array of locks
  *    var index = items.lock.indexOf(url);
  *    if(index === -1) {
  *      // The url does not exist
  *      // TODO: This should not happen, log the error and/or notify the user
  *      console.error(url, 'was not found among the locked tabs', items);
  *    }
  *    // Remove url from the array of locks
  *    items.lock.splice(index, 1);
  *    chrome.storage.sync.set({'lock': items});
  *  });
  *};
  */

  // Get the tab auto-close delay either from cache or sync storage
  Data.sync.getDelay = function getDelay() {
    if (Data.sync.delay) {
      return Data.sync.delay;
    }
    chrome.storage.sync.get({'delay': 1}, function(items) {
      return (Data.sync.delay = items.delay);
    });
  };

  // Set the tab auto-close delay in both the cache and sync storage
  Data.sync.setDelay = function setDelay(delay) {
    chrome.storage.sync.set({'delay': delay}, function() {
      Data.sync.delay = delay;
    });
  };

  Data.init = function() {
    console.log('Data.init initializing data module');

    Data.indexedDB.open(Data.name, function(e) {
      // TODO
    });


    // Start the timer for all open tabs
    // TODO: timer should only start for a given window if there are more than the max
    // number of tabs
    chrome.tabs.query({windowType: 'normal'}, function(tabs) {
      for(var i=0; i<tabs.length; ++i) {
        resetTimer(tabs[i].id);
      }
    });
  };

  return Data;
});
