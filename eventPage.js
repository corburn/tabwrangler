/* global angular */

'use strict';

// TODO: the ng module may be unnecessary
angular.injector(['ng', 'tabmanager']).invoke(['corral', 'range', function event(corral, range) {
  function onStartup(details) {
    if (details) {
      console.log('eventPage.onStartup received onInstalled event', details);
    } else {
      console.log('eventPage.onStartup received onStartup event');
    }
    // Clear current tabs from previous session
    chrome.storage.local.set({current:{}});
    // TODO: This was added because the alarms from the previous session were not being cleared.
    // The problem may go away when the onStartup() call below that is being used during development
    // is removed
    chrome.alarms.clearAll();
    // Start timers on all open tabs
    range.addAll();
  }
  // Fired when a profile that has this extension installed first starts up
  // Does not fire when an incognito profile is started
  chrome.runtime.onStartup.addListener(onStartup);
  // Fired when the extension or chrome is installed or updated
  chrome.runtime.onInstalled.addListener(onStartup);

  // TODO: This should be removed when the program is ready to rely on the onStartup and onInstalled events
  // It here to make it easier to simulate these events
  //onStartup();

  // onAlarm handles alarms that signal it is time to close a tab
  function onAlarm(alarm) {
    console.log('eventPage.onAlarm received onAlarm event', alarm);
    var tabId;
    var errMsg = 'failed to remove tab' + alarm.name + 'after its alarm expired';
    // Parse tabId from alarm
    try {
      tabId = parseInt(alarm.name);
    } catch (err) {
      console.error(errMsg, err);
      return;
    }
    // Lookup tab with tabId
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        console.error(errMsg, chrome.runtime.lastError);
        return;
      } else {
        // Add tab to the database first to ensure tabs aren't lost on error
        corral.addAll(tab).then(function() {
          // Close the tab
          chrome.tabs.remove(tabId, function() {
            if(chrome.runtime.lastError) {
              console.error(errMsg, chrome.runtime.lastError);
              // Abort transaction on error
              this.abort();
            }
          });
        });
      }
    });
  }
  chrome.alarms.onAlarm.addListener(onAlarm);

  /**
  * Handler for the onCreated/onAttached/onDetached events
  * If the event causes the window to cross the minimum tab threshold,
  * clear or reset the alarms for all the tabs in the window as appropriate.
  *
  * @param {string} The key is one of: onCreated, oldWindowId, newWindowId
  * @param {function} The action either sets or resets the alarm for the given Tab
  * @return {function} A callback that takes either a Tab object when the key is onCreated
  * or a tabId number and attachInfo/detachInfo object
  */
  function minThreshold(key, action) {
    console.error('TODO: fix minThreshold hardcoded min');
    var min = 5;
    return function(tab, info) {
      // The onCreated event doesn't pass an info object like the others
      if (key === 'onCreated') {
        info = {'onCreated': tab.windowId};
      }
      // Get all tabs from the tab's window
      chrome.tabs.query({windowId: info[key], windowType: 'normal'}, function(tabs) {
        // Apply the action to all the tabs
        if ((key === 'oldWindowId' && tabs.length <= min) || tabs.length === min+1) {
          angular.forEach(tabs, action);
        }
        // Clear the alarm from the tab that triggered the event; it is probably active
        console.log('minThreshold triggered by', tab);
        range.clearAlarm(tab);
      });
    };
  }
  chrome.tabs.onDetached.addListener(minThreshold('oldWindowId', range.clearAlarm));
  chrome.tabs.onAttached.addListener(minThreshold('newWindowId', range.resetAlarm));

  chrome.tabs.onCreated.addListener(function(tab) {
    console.log('onCreated');
    if (tab.url !== 'chrome://newtab/') {
      // If this tab is in the corral, remove it
      corral.find('url', tab.url).then(function(tab) {
        if(tab) {
          corral.remove(tab);
        }
      });
    }
    minThreshold('onCreated', range.resetAlarm);
  });

  // Fired just before the event page is unloaded
  // Asynchronous events are not guaranteed to complete
  //chrome.runtime.onSuspend.addListener(function() {});
  // Fired after onSusped to indicate the app won't be unloaded after all
  //chrome.runtime.onSuspendCanceled.addListener(function() {});
  // Fired when an extension update is available
  /*
  *chrome.runtime.onUpdateAvailable.addListener(function(details) {
  *  console.log(details.version);
  *  chrome.runtime.reload();
  *});
  */
  //See chrome.runtime for IPC events

  //navigator.webkitTemporaryStorage.queryUsageAndQuota(function() {console.log(arguments)});
  //navigator.webkitPersistentStorage.queryUsageAndQuota(function() {console.log(arguments)});

  // Register tab event handlers
  //chrome.tabs.onUpdated.addListener(log('onUpdated'));
  //chrome.tabs.onMoved.addListener(log('onMoved'));

  // Clear alarm for the current tab and reset alarm for the previous tab
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    var windowId = activeInfo.windowId.toString();
    var tabId = activeInfo.tabId;
    var query = JSON.parse('{ "current": { "' + windowId + '": ' + tabId + '} }');
    // Use local storage to remember previous tab for each window and avoid sync quota limit
    chrome.storage.local.get(query, function(items) {
      if (chrome.runtime.lastError) {
        console.error('onActivated', chrome.runtime.lastError);
      }
      if (items.current[windowId] !== tabId) {
        console.log('onActivated windowId:', windowId, 'tabId', items.current[windowId], '=>', tabId);
        range.resetAlarm(items.current[windowId]);
      } else {
        console.log('onActivated windowId:', windowId, 'tabId null =>', tabId);
      }
      chrome.storage.local.set(query);
    });
    range.clearAlarm(tabId);
  });

  //chrome.tabs.onHighlighted.addListener(log('onHighlighted'));
  chrome.tabs.onRemoved.addListener(function(tabId/*, removeInfo*/) {
    console.log('chrome.tabs.onRemoved', tabId);
    range.clearAlarm(tabId);
  });
  //chrome.tabs.onReplaced.addListener(log('onReplaced'));

}]);
