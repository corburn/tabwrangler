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

console.error('TODO: fix upgradeDatabase object store unconditionally deleted');

angular.module('tabmanager', ['xc.indexedDB'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('corral')
  // TODO: onupgradeneeded the object store is unconditionally deleted
  // This may cause users to lose information
  .upgradeDatabase(3, function(event, db, tx) {
    if (db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      db.deleteObjectStore(OBJECT_STORE_NAME);
    }
    var objStore = db.createObjectStore(OBJECT_STORE_NAME, {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: true});
  });
})
.factory('settings', function($q) {
  var tab = {
    minutesInactive: 10,
    min: 5,
    purgeClosed: false,
    showBadgeCount: true,
    //allowDuplicates: false,
    autolock: ['^chrome.*\/\/', 'localhost']
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
// The add and remove functions have a side-effect of setting the extension badge text
.factory('corral', function($q, $log, $indexedDB) {
  return {
    addAll: function(data) {
      var me = this;
      // Insert tabs into the database
      return $indexedDB.objectStore(OBJECT_STORE_NAME).upsert(data)
      .then(function(tabs) {
        me.setBadge();
        return tabs;
      });
    },
    getAll: function() {
      var me = this;
      return $indexedDB.objectStore(OBJECT_STORE_NAME).getAll()
      .then(function(tabs) {
        me.setBadge();
        return tabs;
      });
    },
    find: function(keyOrIndex, keyIfIndex) {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).find(keyOrIndex, keyIfIndex);
    },
    remove: function(tab) {
      var me = this;
      return $indexedDB.objectStore(OBJECT_STORE_NAME).delete(tab.id)
      .then(function(e) {
        $log.log('corral.remove', e);
        me.setBadge();
        return e;
      });
    },
    reopen: function(tab) {
      return this.remove(tab)
      .then(function(e) {
        var deferred = $q.defer();
        $log.log('corral.reopen', e);
        chrome.tabs.create({url: tab.url}, callback(deferred));
        return deferred.promise;
      });
    },
    setBadge: function() {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).count()
      .then(function(count) {
        $log.log('corral.setBadge', count);
        var text;
        // Use a default count if the result is too big to display
        if(count < 999) {
          text = count.toString();
        } else {
          text = '999+';
        }
        //$log.log('corral.setBadge', count, typeof count);
        chrome.browserAction.setBadgeText({text: text});
      });
    }
  };
})
.factory('range', function($q, filterFilter, $log, settings) {
  var calledOnce = false;
  return {
    addAll: function() {
      var deferTabs = $q.defer();

      // Should only be called once onStartup
      if (calledOnce) {
        $log.error('range.addAll was already called');
        return;
      }
      calledOnce = true;

      chrome.tabs.query({windowType: 'normal', pinned: false, active: false}, callback(deferTabs));
      $q.all([
        // Get all settings
        settings.getAll(),
        // Get all tabs
        deferTabs.promise
      ])
      // Filter tabs matching the autolock patterns
      // TODO: what if a pattern is not a valid regexp?
      // @param results an array contains the settings object and tabs array
      .then(function(results) {
        var regexp = new RegExp(results[0].autolock.join('|'));
        results[1] = filterFilter(results[1], function(tab) {
          return !regexp.test(tab.url);
        });
        return results;
      })
      // Start timers on all tabs
      // TODO: Filter tabs in windows with less than settings.min tabs
      // @param results an array containing the settings object and filtered tabs array
      .then(function(results) {
        $log.log('range.addAll alarms', results[1]);
        angular.forEach(results[1], function(value) {
          chrome.alarms.create(value.id.toString(), {delayInMinutes: results[0].minutesInactive});
        });
      });
    },
    getAll: function() {
      $log.log('range.getAll');
      // Return a promise for an array of tabs that have alarms set
      var deferred = $q.defer();
      chrome.alarms.getAll(callback(deferred));
      return deferred.promise.then(function(alarms) {
        var promises = [];
        angular.forEach(alarms, function(value) {
          var deferred = new $q.defer();
          promises.push(deferred.promise);
          chrome.tabs.get(parseInt(value.name), function(items) {
            if(chrome.runtime.lastError) {
              deferred.reject(chrome.runtime.lastError);
            } else {
              items.scheduledTime = value.scheduledTime;
              deferred.resolve(items);
            }
          });
        });
        return $q.all(promises);
      });
    },
    clearAlarm: function(tab) {
      // tab can be either a Tab object or tabId number
      $log.log('range.clearAlarm', tab);
      chrome.alarms.clear((tab.id || tab).toString());
    },
    resetAlarm: function(tab) {
      var deferTab = $q.defer();
      var deferConfig = settings.getAll();

      if (typeof tab === 'number') {
        // Need the url for autolocking
        chrome.tabs.get(tab, callback(deferTab));
      } else {
        // Already have the url
        deferTab.resolve(tab);
      }

      // Reset the tab alarm if it does not match an autolock pattern
      $q.all([deferConfig, deferTab.promise]).then(function(result) {
        var config = result[0];
        var tab = result[1];
        var regexp = new RegExp(config.autolock.join('|'));
        var tabId = tab.id.toString();
        if (regexp.test(tab.url)) {
          $log.log('range.resetAlarm matched an autolock pattern', tab.url, tab);
        } else {
          $log.log('range.resetAlarm', tab);
          // TODO: When chrome version 35+ is more common, add a callback parameter to chrome.alarms.clear
          // that wraps chrome.alarms.create. Is there a potential race condition here?
          chrome.alarms.clear(tabId);
          chrome.alarms.create(tabId, {delayInMinutes: config.minutesInactive});
        }
      });
    },
  };
});
