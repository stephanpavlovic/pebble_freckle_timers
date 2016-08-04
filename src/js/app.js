var Settings = require('settings');
var Clay = require('./clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig);

var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');
var Feature = require('platform/feature');

var timers = null;
var entries = null;

var initialMenu = new UI.Menu({
  highlightBackgroundColor: Feature.color('#550055', 'black'),
  sections: [
    {
      title: 'Freckle Pebble App',
      items: [
        { title: 'Todays time' },
        { title: 'New timer' },
        { title: 'Active timers' }
      ]
    }
  ]
});

var resultsMenu = new UI.Menu({
  highlightBackgroundColor: Feature.color('#550055', 'black'),
  sections: [
    {
      title: 'Active Timers',
      items: []
    }
  ]
});

initialMenu.on('select', optionSelected);

function optionSelected(e){
  var option = e.itemIndex;
  if(option == 0){
    fetchEntries();
  }
  if(option == 2){
    fetchTimers();
  }
}

initialMenu.show();

// Construct URL

var myAPIKey = "9d8hem5gr9vqc6qe0pszbz5nmzd24x2-fvihbyq97nsmmmi2s85qdjrwaddd5vu";

function menuEntry(entry){
  var title = entry.project.name;
  var subtitle = entry.state.charAt(0).toUpperCase() + ' - ' + entry.formatted_time;
  return {title: title, subtitle: subtitle};
}

function parseTimers(data) {
    var menuItems = [];
    data.forEach(function(entry) {
      menuItems.push(menuEntry(entry));
    });
    return menuItems;
}

function calculateHours(data){
  var billable = 0;
  var unbillable = 0;
  entries = data;
  data.forEach(function(entry) {
    if(entry.billable == true){
      billable = billable + entry.minutes;
    }else{
      unbillable = unbillable + entry.minutes;
    }
  });

  return {'billable': billable, 'unbillable': unbillable};
}

function toggleTimer(e){
  var timer = timers[e.itemIndex];
  var projectId = timer.project.id;
  var newURL = 'https://api.letsfreckle.com/v2/projects/' + projectId +'/timer/start?freckle_token=' + myAPIKey;
  if(timer.state == 'running'){
    newURL = 'https://api.letsfreckle.com/v2/projects/' + projectId +'/timer/pause?freckle_token=' + myAPIKey;
  }
  ajax(
  {
    url: newURL,
    method: 'PUT',
    type: 'json'
  },
  function(data) {
    timers[e.itemIndex].state = data.state;
    timers[e.itemIndex].formatted_time = data.formatted_time;
    resultsMenu.items(0, parseTimers(timers));
  },
  function(error) {
    // Failure!
    console.log('Failed modifying timer: ' + error);
  });
}

// Make the request
function fetchTimers(){
  var baseURL = 'https://api.letsfreckle.com/v2/timers?freckle_token=' + myAPIKey;
  ajax(
    {
      url: baseURL,
      type: 'json'
    },
    function(data) {
      // Success!
      var items = [{title: "No active Timers"}];
      if(data.length > 0){
        timers = data;
        items = parseTimers(data);
      }

      //Hier brauchen wir das result Menu
      resultsMenu.items(0, items);

      resultsMenu.show();
      Vibe.vibrate('short');
      // Add an action for SELECT
      resultsMenu.on('select', toggleTimer);
    },
    function(error) {
      // Failure!
      console.log('Failed fetching timer data: ' + error);
      Vibe.vibrate('long');
    }
  );
}

function fetchEntries(){
  var today = new Date().toISOString().slice(0, 10);
  var entryURL = 'https://api.letsfreckle.com/v2/current_user/entries?' + 'from=' + today + '&freckle_token=' + myAPIKey;
  console.log("EntryURL:", entryURL);
  ajax(
    {
      url: entryURL,
      type: 'json'
    },
    function(data) {
      // Success!
      content = 'No entries for today!'
      if(data.length > 0){
        amounts = calculateHours(data);
        // Add temperature, pressure etc
        content = 'Billable: ' + (amounts.billable / 60) + 'h' +
          '\n Unbillable: ' + (amounts.unbillable / 60) + 'h'
      }
      var detailCard = new UI.Card({
        title:'Todays hours',
        body: content
      });
      detailCard.show();
      Vibe.vibrate('short');
    },
    function(error) {
      // Failure!
      console.log('Failed fetching entry data: ' + error);
      Vibe.vibrate('long');
    }
  );
}
