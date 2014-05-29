/* global angular */

'use strict';

angular.module('tabmanager', ['xc.indexedDB'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('corral')
  .upgradeDatabase(2, function(event, db, tx) {
    var objStore = db.createObjectStore('tabwrangler', {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: false});
  });
})
.factory('corral', function() {
  return {
    say: function(msg) {
      console.log(msg);
    }
  };
})
.factory('range', function() {
  return {
    addLock: function(regexp) {
    },
    removeLock: function(index) {
    },
    resetTimer: function(tab) {
    },
    upsert: function(settings) {
      chrome.storage.sync.set(settings, function() {
        if (chrome.runtime.lastError) {
          // TODO: handle error
          // This would most likely be MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE exceeded
          // See chrome API documentation for details
        }
      });
    }
  };
});
