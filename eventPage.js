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
    //data.init();
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
    try {
      chrome.tabs.remove(parseInt(alarm.name), function() {
        //data.indexedDB.add(alarm.name);
      });
    } catch(err) {
      console.error('failed to remove tab', alarm.name, 'after its alarm expired', err);
      // TODO: query database to try and match the tab id to a tab for more debugging info
    }
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
  //chrome.tabs.onCreated.addListener(tabs.onCreated);
  //chrome.tabs.onUpdated.addListener(log('onUpdated'));
  //chrome.tabs.onMoved.addListener(log('onMoved'));
  //chrome.tabs.onActivated.addListener(log('onActivated'));
  //chrome.tabs.onHighlighted.addListener(log('onHighlighted'));
  //chrome.tabs.onDetached.addListener(log('onDetached'));
  //chrome.tabs.onAttached.addListener(log('onAttached'));
  //chrome.tabs.onRemoved.addListener(log('onRemoved'));
  //chrome.tabs.onReplaced.addListener(log('onReplaced'));

}]);
