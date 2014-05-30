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
      chrome.storage.sync.get({minutesInactive: tab.minutesInactive}, callback(deferred));
      return deferred.promise;
    },
    getMin: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({min: tab.min}, callback(deferred));
      return deferred.promise;
    },
    getPurgeClosed: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({purgeClosed: tab.purgeClosed}, callback(deferred));
      return deferred.promise;
    },
    getShowBadgeCount: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({showBadgeCount: tab.showBadgeCount}, callback(deferred));
      return deferred.promise;
    },
    /*
    *getAllowDuplicates: function() {
    *  var deferred = $q.defer();
    *  chrome.storage.sync.get({allowDuplicates: tab.allowDuplicates}, callback(deferred));
    *  return deferred.promise;
    *}
    */
    getAutolock: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({autolock: tab.autolock}, callback(deferred));
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
.factory('range', function($q, filterFilter, $log, settings) {
  return {
    addAll: function() {
      $log.log('range.addAll');
      var deferTabs = $q.defer();
      var _settings = {};
      chrome.tabs.query({windowType: 'normal', pinned: false, active: false}, callback(deferTabs));
      $q.all([
        // Get all settings
        settings.getAll(),
        // Get all tabs
        deferTabs.promise
      ])
      // Filter tabs matching the autolock patterns
      // TODO: what if a pattern is not a valid regexp?
      .then(function(results) {
        _settings = results[0];
        var regexp = new RegExp(_settings.autolock.join('|'));
        var filteredTabs = [];
        filteredTabs = filterFilter(results[1], function(tab) {
          return !regexp.test(tab.url);
        });
        return filteredTabs;
      })
      // Start timers on all tabs
      // TODO: Filter tabs in windows with less than settings.min tabs
      .then(function(tabs) {
        angular.forEach(tabs, function(value) {
          chrome.alarms.create(value.id.toString(), {delayInMinutes: _settings.minutesInactive});
        });
      });
    },
    getAll: function() {
      $log.log('range.getAll');
      // Return a promise with an array of tabs that have alarms set
      var deferred = $q.defer();
      chrome.alarms.getAll(callback(deferred));
      return deferred.promise.then(function(alarms) {
        var promises = [];
        angular.forEach(alarms, function(value) {
          var deferred = new $q.defer();
          promises.push(deferred.promise);
          chrome.tabs.get(parseInt(value.name), callback(deferred));
        });
        return $q.all(promises);
      });
    },
    resetAlarm: function(tab) {
      $log.log('range.resetAlarm', tab);
      settings.getAll().then(function(items) {
        var regexp = new RegExp(items.autolock.join('|'));
        var tabId = tab.id.toString();
        if (regexp.test(tab.url)) {
          $log.log('range.resetAlarm', tab, 'matches an autolock pattern');
        } else {
          // TODO: When chrome version 35+ is more common, add a callback parameter to chrome.alarms.clear
          // that wraps chrome.alarms.create. Is there a potential race condition here?
          chrome.alarms.clear(tabId);
          chrome.alarms.create(tabId, {delayInMinutes: items.minutesInactive});
        }
      });
    },
    upsert: function(settings) {
      $log.log('range.upsert', settings);
      var deferred = $q.defer();
      // If an error occures, it would most likely be MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE exceeded
      // See chrome API documentation for details
      chrome.storage.sync.set(settings, callback(deferred));
      return deferred.promise;
    }
  };
});
