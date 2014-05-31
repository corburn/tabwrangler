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
  onStartup();

  // TODO: onAlarm handles alarms that signal it is time to close a tab
  function onAlarm(alarm) {
    console.log('eventPage.onAlarm received onAlarm event', alarm);
    var tabId;
    var errMsg = 'failed to remove tab' + alarm.name + 'after its alarm expired';
    try {
      tabId = parseInt(alarm.name);
    } catch (err) {
      console.error(errMsg, err);
      return;
    }
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        console.error(errMsg, chrome.runtime.lastError);
        return;
      } else {
        corral.addAll(tab).then(function() {
          chrome.tabs.remove(tabId, function() {
            if(chrome.runtime.lastError) {
              console.error(errMsg, chrome.runtime.lastError);
              this.abort();
            }
          });
        });
      }
    });
  }
  chrome.alarms.onAlarm.addListener(onAlarm);

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
  //new Notification("Hello World!");

  // Register tab event handlers
  chrome.tabs.onCreated.addListener(range.resetAlarm);
  //chrome.tabs.onUpdated.addListener(log('onUpdated'));
  //chrome.tabs.onMoved.addListener(log('onMoved'));
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, range.resetAlarm);
  });
  //chrome.tabs.onHighlighted.addListener(log('onHighlighted'));
  //chrome.tabs.onDetached.addListener(log('onDetached'));
  //chrome.tabs.onAttached.addListener(log('onAttached'));
  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    // TODO: A wasCleared callback was added in Chrome verion 35+
      console.log('chrome.tabs.onRemoved', tabId);
    chrome.alarms.clear(tabId.toString());
  });
  //chrome.tabs.onReplaced.addListener(log('onReplaced'));

}]);