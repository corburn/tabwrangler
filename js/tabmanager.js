/* global angular */

'use strict';

var OBJECT_STORE_NAME='tabwrangler';

// An adapter to replace the chrome api callback with a promise
function callback(deferred) {
  return function(items) {
    if(chrome.runtime.lastError) {
      deferred.reject(chrome.runtime.lastError);
    } else {
      deferred.resolve(items);
    }
  };
}


angular.module('tabmanager', ['xc.indexedDB'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('corral')
  .upgradeDatabase(2, function(event, db, tx) {
    var objStore = db.createObjectStore(OBJECT_STORE_NAME, {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: false});
  });
})
.factory('settings', function($q) {
  var tab = {
    minutesInactive: 10,
    min: 5,
    purgeClosed: false,
    showBadgeCount: true,
    //allowDuplicates: false,
    autolock: []
  };

  return {
    getAll: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab, callback(deferred));
      return deferred.promise;
    },
    getMinutesInactive: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab.minutesInactive, callback(deferred));
      return deferred.promise;
    },
    getMin: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab.min, callback(deferred));
      return deferred.promise;
    },
    getPurgeClosed: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab.purgeClosed, callback(deferred));
      return deferred.promise;
    },
    getShowBadgeCount: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab.showBadgeCount, callback(deferred));
      return deferred.promise;
    },
    /*
    *getAllowDuplicates: function() {
    *  var deferred = $q.defer();
    *  chrome.storage.sync.get(tab.allowDuplicates, callback(deferred));
    *  return deferred.promise;
    *}
    */
    getAutolock: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab.autolock, callback(deferred));
      return deferred.promise;
    },
    upsert: function(items) {
      var deferred = $q.defer();
      chrome.storage.sync.set(items, callback(deferred));
      return deferred.promise;
    }
  };
})
.factory('corral', function($indexedDB) {
  return {
    addAll: function(data) {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).upsert(data);
    },
    getAll: function() {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).getAll();
    },
    count: function() {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).count();
    },
    remove: function(key) {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).delete(key);
    }
  };
})
.factory('range', function($q, settings) {
  return {
    resetTimer: function(tabId) {
      var deferred = [$q.defer()];
      settings.getMinutesInactive().then(function(minutesInactive) {
        // TODO: When chrome version 35+ is more common, add callback(deferred[1])
        // as the second parameter to chrome.alarms.clear()
        chrome.alarms.clear(tabId);
        chrome.alarms.create(tabId, {delayInMinutes: minutesInactive}, callback(deferred[0]));
      });
      return $q.all(deferred);
    },
    upsert: function(settings) {
      var deferred = $q.defer();
      // If an error occures, it would most likely be MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE exceeded
      // See chrome API documentation for details
      chrome.storage.sync.set(settings, callback(deferred));
      return deferred.promise;
    }
  };
});
