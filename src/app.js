/**
 * Name: Pebble-EPL
 * Author: Josh Gerdes
 * Description: This is a pebble.js watchapp for displaying today's Premier League scores.
 **/

var EPL = (function () {
  var VERSION = 'v1.3';
  var REFRESH_DELAY_TIME = 60000;
  var UI = require('ui');
  var ajax = require('ajax');
  var Vector2 = require('vector2');

  var toyyyymmdd = function(currDate) {
    var yyyy = currDate.getFullYear().toString();
    var mm = (currDate.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = currDate.getDate().toString();
    return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]); // padding
  };

  var now = new Date();
  var period = toyyyymmdd(now);
  var matches = [];
  var menuItems = [];
  var data_tz_offset = -5; // Eastern Time GMT offset
  var curr_tz_offset = (new Date().getTimezoneOffset() / 60) * (-1);
  var splashWindow = null;
  var mainMenu = null;
  
  var initSplash = function () {
    // Show splash screen while waiting for data
    splashWindow = new UI.Window({
      fullscreen: true
    });
    
    var splash = new UI.Rect({ 
      position: new Vector2(0, 0), 
      size: new Vector2(144, 168),
      backgroundColor: 'white'
    });
    
    var logo = new UI.Image({ 
      position: new Vector2(7, 10), 
      size: new Vector2(130, 130),
      image: 'images/epl-logo.png'
    });
    
    // Text element to inform user
    var text = new UI.Text({
      position: new Vector2(0, 134),
      size: new Vector2(144, 28),
      text:'Loading data...',
      font:'gothic-24',
      color:'black',
      textOverflow:'wrap',
      textAlign:'center'
    });
    
    var version = new UI.Text({
      position: new Vector2(110, 0),
      size: new Vector2(30, 18),
      text: VERSION,
      font:'gothic-14',
      color:'black',
      textOverflow:'wrap',
      textAlign:'right'
    });
    
    // Add to splashWindow and show
    splashWindow.add(splash);
    splashWindow.add(text);   
    splashWindow.add(logo); 
    splashWindow.add(version);
    splashWindow.show();
  };
  
  var initMain = function() {
    // Create main menu list
    mainMenu = new UI.Menu({
      sections: [{
        title: "Today's Scores",
        items: menuItems
      }]
    });
  
    // Add a click listener for select button click
    mainMenu.on('select', function(evt) {
      var g = matches[evt.itemIndex];
      var detailWindow = new UI.Window({
        fullscreen: true
      });
      
      var bg = new UI.Rect({ 
        position: new Vector2(0, 0), 
        size: new Vector2(144, 168),
        backgroundColor: 'white'
      });
      detailWindow.add(bg);
      
      var status = new UI.Text({
        position: new Vector2(0, 0), 
        size: new Vector2(144, 20),
        text: g.display1 + ' ' + g.display2,
        font:'gothic-18',
        color:'white',
        textOverflow:'wrap',
        textAlign:'right',
        backgroundColor: 'black'
      });
      detailWindow.add(status);
      
      var HTLogo = new UI.Image({ 
        position: new Vector2(0, 20), 
        size: new Vector2(47, 47),
        image: g.HT.logo
      });
      detailWindow.add(HTLogo);
      
      var HTName = new UI.Text({
        position: new Vector2(0, 64), 
        size: new Vector2(144, 24),
        text: g.HT.name,
        font:'gothic-24-bold',
        color:'black',
        textOverflow:'wrap',
        textAlign:'left'
      });
      detailWindow.add(HTName);
      
      var HTScore = new UI.Text({
        position: new Vector2(80, 20), 
        size: new Vector2(42, 84),
        text: g.HT.score,
        font:'bitham-42-bold',
        color:'black',
        textOverflow:'wrap',
        textAlign:'right'
      });
      detailWindow.add(HTScore);
      
      var VTLogo = new UI.Image({ 
        position: new Vector2(0, 91), 
        size: new Vector2(47, 47),
        image: g.VT.logo
      });
      detailWindow.add(VTLogo);
      
      var VTName = new UI.Text({
        position: new Vector2(0, 135), 
        size: new Vector2(144, 24),
        text: g.VT.name,
        font:'gothic-24-bold',
        color:'black',
        textOverflow:'wrap',
        textAlign:'left'
      });
      detailWindow.add(VTName);
      
      var VTScore = new UI.Text({
        position: new Vector2(80, 91), 
        size: new Vector2(42, 84),
        text: g.VT.score,
        font:'bitham-42-bold',
        color:'black',
        textOverflow:'wrap',
        textAlign:'right'
      });
      detailWindow.add(VTScore);
      
      // Show game details
      detailWindow.show();
    });
  };
  
  var loadData = function() {
    // Make call to get score data from nbcsports
    ajax({
      url:'http://scores.nbcsports.msnbc.com/ticker/data/gamesNEW.js.asp?sport=EPL&period=' + period,
      type:'json'
    },
    function(data) {
      matches = [];
      menuItems = [];
    
      // Check for matches today, if not display generic no matches message
      if (data.games.length === 0) {
        var card = new UI.Card({
          title: now.toDateString().substring(4),
          body: 'No Matches Scheduled Today'
        });
        
        card.show();
        splashWindow.hide();
        
        return;
      }
      
      for(var i=0; i < data.games.length; i++) {
        var game = data.games[i];
        
        // Get indexes for parsing xml data. Need to figure out how to use xml2js in cloudpebble
        var iVT = game.indexOf('visiting-team');
        var iVTName = game.indexOf('display_name=', iVT) + 14;
        var iVTAlias = game.indexOf('alias=', iVT) + 7;
        var iVTScore = game.indexOf('score=', iVT) + 7;
        var iVTLogo = game.indexOf('team-logo link=', iVT) + 16;
        
        var iHT = game.indexOf('home-team');
        var iHTName = game.indexOf('display_name=', iHT) + 14;
        var iHTAlias = game.indexOf('alias=', iHT) + 7;
        var iHTScore = game.indexOf('score=', iHT) + 7;
        var iHTLogo = game.indexOf('team-logo link=', iHT) + 16;
        
        var iGS = game.indexOf('gamestate');
        var iGSStatus = game.indexOf('status=', iGS) + 8;
        var iGSDisplay1 = game.indexOf('display_status1=', iGS) + 17;
        var iGSDisplay2 = game.indexOf('display_status2=', iGS) + 17;
    
        // Creat game object and add to array
        var gameObj = {
          status: game.substring(iGSStatus, game.indexOf('\"', iGSStatus)),
          display1: game.substring(iGSDisplay1, game.indexOf('\"', iGSDisplay1)),
          display2: game.substring(iGSDisplay2, game.indexOf('\"', iGSDisplay2)),
          VT: {
            score: game.substring(iVTScore, game.indexOf('\"', iVTScore)),
            name: game.substring(iVTName, game.indexOf('\"', iVTName)),
            alias: game.substring(iVTAlias, game.indexOf('\"', iVTAlias)),
            logo: game.substring(iVTLogo, game.indexOf('"', iVTLogo))
          },
          HT: {
            score: game.substring(iHTScore, game.indexOf('\"', iHTScore)),
            name: game.substring(iHTName, game.indexOf('\"', iHTName)),
            alias: game.substring(iHTAlias, game.indexOf('\"', iHTAlias)),
            logo: game.substring(iHTLogo, game.indexOf('"', iHTLogo))
          }
        };

        // Add adjust for current GMT timezone, all times EST from nbcsports 
        if (gameObj.status.toLowerCase() != 'in-progress' && gameObj.display1.indexOf(':') > -1) {
            // Determine difference from data offset to current offset
            var diff = Math.abs(data_tz_offset - curr_tz_offset);
            var diff_offset = (curr_tz_offset > data_tz_offset) ? diff : -diff;
            
            // Adjust data time based on offset difference
            var parts = gameObj.display1.substring(gameObj.display1, gameObj.display1.indexOf(' ')).split(':');
            parts[0] = (gameObj.display1.indexOf('PM') > -1) ? +parts[0] + 12 : parts[0];
            parts[0] = +parts[0] + diff_offset;
            parts[0] = (parts[0] > 24) ? parts[0] - 24 : parts[0];
            parts[0] = (parts[0] < 0) ? parts[0] + 24 : parts[0];
            
            // Display new time using 12-hr display
            var d = new Date();
            d.setHours(+parts[0], +parts[1], 0, 0);
            var hh = d.getHours().toString();
            var mm = d.getMinutes().toString();  
            var newTime = ((+hh > 12 ) ? +hh - 12 : hh) + ':' + (mm[1] ? mm : '0' + mm[0]);
            newTime += (+hh > 12) ? ' PM' : ' AM';

            gameObj.display1 = newTime;
            gameObj.display2 = '';
        }
        
        // Add game object to matches array
        matches.push(gameObj);
        
        // Add menu item for game
        menuItems.push({
          title: gameObj.HT.alias + ' ' + gameObj.HT.score + ' - ' + gameObj.VT.alias + ' ' + gameObj.VT.score,
          subtitle: gameObj.display1 + ' ' + gameObj.display2
        });
      }
      
      // Update update items on menu
      mainMenu.items(0, menuItems);
    });
  };
  
  var refreshData = function() {
    // Setup refresh data loop
    setTimeout(function () {
        loadData();
        refreshData();
    }, REFRESH_DELAY_TIME);
  };
  
  var init = function() {
    // Initialize windows
    initSplash();
    initMain(); 
    
    var splashDelay = setTimeout(function() { 
      // Load initial data
      loadData();
      
      // Hide splash and show score list
      mainMenu.show();
      splashWindow.hide(); 
      
      // Start refresh data loop
      refreshData();
      
      clearTimeout(splashDelay);
    }, 2000);
  };

  return {
    init: init
  };
}());

EPL.init();