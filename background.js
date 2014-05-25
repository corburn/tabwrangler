/* global _ */

'use strict';

// Declare this global namespace so it can be used from popup.js
// @see startup();
var TW = {};

require(['require-config'], function() {
  require([
    'settings',
    'tabmanager',
    'util',
    'updater',
    'menus',
    'underscore'
  ],
  function(settings, tabmanager, util, updater, menus) {

    /**
    * @todo: refactor into "get the ones to close" and "close 'em"
    * So it can be tested.
    */
    var checkToClose = function(cutOff) {
      var i;
      cutOff = cutOff || new Date().getTime() - settings.get('stayOpen');
      var minTabs = settings.get('minTabs');
      // Tabs which have been locked via the checkbox.
      var lockedIds = settings.get('lockedIds');
      var toCut = tabmanager.getOlderThen(cutOff);
      // TODO(jt) unused
      var tabsToSave = [];

      if (settings.get('paused') === true) {
        return;
      }

      // Update the selected one to make sure it doesn't get closed.
      chrome.tabs.getSelected(null, tabmanager.updateLastAccessed);

      chrome.windows.getAll({populate: true}, function(windows) {
        var tabs = []; // Array of tabs, populated for each window.
        _.each(windows, function(myWindow) {
          tabs = myWindow.tabs;
          // Filter out the pinned tabs
          tabs = _.filter(tabs, function(tab) {return tab.pinned === false;});
          var tabsToCut = _.filter(tabs, function(t) {return toCut.indexOf(t.id) !== -1;});
          if ((tabs.length - minTabs) <= 0) {
            // We have less than minTab tabs, abort.
            // Also, let's reset the last accessed time of our current tabs so they
            // don't get closed when we add a new one.
            for (i = 0; i < tabs.length; i++) {
              tabmanager.updateLastAccessed(tabs[i].id);
            }
            return;
          }

          // If cutting will reduce us below 5 tabs, only remove the first N to get to 5.
          tabsToCut = tabsToCut.splice(0, tabs.length - minTabs);

          if (tabsToCut.length === 0) {
            return;
          }

          for (i = 0; i < tabsToCut.length; i++) {
            if (lockedIds.indexOf(tabsToCut[i].id) !== -1) {
              // Update its time so it gets checked less frequently.
              // Would also be smart to just never add it.
              // @todo: fix that.
              tabmanager.updateLastAccessed(tabsToCut[i].id);
              continue;
            }
            closeTab(tabsToCut[i]);
          }
        });
      });
    };

    var closeTab = function(tab) {
      if (true === tab.pinned) {
        return;
      }
      if (tabmanager.isWhitelisted(tab.url)) {
        return;
      }

      tabmanager.closedTabs.saveTabs([tab]);
      // Close it in Chrome.
      chrome.tabs.remove(tab.id);
    };

    var onNewTab = function(tab) {
      // Check if it exists in corral already
      // The 2nd argument is an array of filters, we add one filter
      // which checks for an exact URL match.  If we match throw the old
      // entry away.
      tabmanager.searchTabs(function(tabs) {
        if (tabs.length) {
          _.each(tabs, function(t) {
            tabmanager.closedTabs.removeTab(t.id);
          });
        }
      }, [tabmanager.filters.exactUrl(tab.url)]);

      // Add the new one;
      tabmanager.updateLastAccessed(tab.id);
    };

    var startup = function() {
      settings.init();
      updater.run();
      tabmanager.closedTabs.init();

      TW.settings = settings;
      TW.updater = updater;
      TW.tabmanager = tabmanager;

      if (settings.get('purgeClosedTabs') !== false) {
        tabmanager.closedTabs.clear();
      }
      settings.set('lockedIds', []);

      // Move this to a function somehwere so we can restart the process.
      chrome.tabs.query({
        windowType: 'normal'
      }, tabmanager.initTabs);
      chrome.tabs.onCreated.addListener(onNewTab);
      chrome.tabs.onUpdated.addListener(tabmanager.updateLastAccessed);
      chrome.tabs.onRemoved.addListener(tabmanager.removeTab);
      chrome.tabs.onActivated.addListener(function(tabInfo) {
        menus.updateContextMenus(tabInfo.tabId);
        tabmanager.updateLastAccessed(tabInfo.tabId);
      });
      window.setInterval(checkToClose, settings.get('checkInterval'));
      window.setInterval(tabmanager.updateClosedCount, settings.get('badgeCounterInterval'));

      // Create the "lock tab" context menu:
      menus.createContextMenus();
    };

    startup();
  });
});
