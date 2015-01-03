/**
 * Name: Pebble-EPL
 * Author: Josh Gerdes
 * Description: This is a pebble.js watchapp for displaying today's Premier League scores.
 **/

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
var games = [];
var menuItems = [];

// For testing
//period = '20150110';

// Show splash screen while waiting for data
var splashWindow = new UI.Window({
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

// Add to splashWindow and show
splashWindow.add(splash);
splashWindow.add(text);
splashWindow.add(logo);
splashWindow.show();

// Make call to get score data from nbcsports
ajax({
  url:'http://scores.nbcsports.msnbc.com/ticker/data/gamesNEW.js.asp?sport=EPL&period=' + period,
  type:'json'
},
function(data) {
  games = [];
  menuItems = [];

  // Check for games today, if not display generic no games message
  if (data.games.length === 0) {
    var card = new UI.Card({
      title: now.toDateString().substring(4),
      body: 'No Games Scheduled Today'
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
    
    // Add ET for scheduled game times, all times ET from nbcsports 
    if (gameObj.status.toLowerCase() != 'in-progress' && gameObj.display1.indexOf(':') > -1) {
      gameObj.display1 += ' ET';  
      gameObj.display2 = '';
    }
    
    // Add game object to games array
    games.push(gameObj);
    
    // Add menu item for game
    menuItems.push({
      title: gameObj.VT.alias + ' ' + gameObj.VT.score + ' - ' + gameObj.HT.alias + ' ' + gameObj.HT.score,
      subtitle: gameObj.display1 + ' ' + gameObj.display2
    });
  }
  
  // Create main menu list
  var mainMenu = new UI.Menu({
    sections: [{
      title: "Today's Scores",
      items: menuItems
    }]
  });
  
  // Add a click listener for select button click
  mainMenu.on('select', function(evt) {
    var g = games[evt.itemIndex];
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
    
    var VTLogo = new UI.Image({ 
      position: new Vector2(0, 20), 
      size: new Vector2(47, 47),
      image: g.VT.logo
    });
    detailWindow.add(VTLogo);
    
    var VTName = new UI.Text({
      position: new Vector2(0, 64), 
      size: new Vector2(144, 24),
      text: g.VT.name,
      font:'gothic-24-bold',
      color:'black',
      textOverflow:'wrap',
      textAlign:'left'
    });
    detailWindow.add(VTName);
    
    var VTScore = new UI.Text({
      position: new Vector2(80, 20), 
      size: new Vector2(42, 84),
      text: g.VT.score,
      font:'bitham-42-bold',
      color:'black',
      textOverflow:'wrap',
      textAlign:'right'
    });
    detailWindow.add(VTScore);
    
    var HTLogo = new UI.Image({ 
      position: new Vector2(0, 91), 
      size: new Vector2(47, 47),
      image: g.HT.logo
    });
    detailWindow.add(HTLogo);
    
    var HTName = new UI.Text({
      position: new Vector2(0, 135), 
      size: new Vector2(144, 24),
      text: g.HT.name,
      font:'gothic-24-bold',
      color:'black',
      textOverflow:'wrap',
      textAlign:'left'
    });
    detailWindow.add(HTName);
    
    var HTScore = new UI.Text({
      position: new Vector2(80, 91), 
      size: new Vector2(42, 84),
      text: g.HT.score,
      font:'bitham-42-bold',
      color:'black',
      textOverflow:'wrap',
      textAlign:'right'
    });
    detailWindow.add(HTScore);
    
    // Show game details
    detailWindow.show();
  });
  
  // Hide splash and show score list
  mainMenu.show();
  splashWindow.hide();
});