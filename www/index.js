// from https://github.com/kittykatattack/learningPixi#keyboard
function keyboard(keyCode) {
  var key = {};
  key.code = keyCode;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;
  //The `downHandler`
  key.downHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isUp && key.press) key.press();
      key.isDown = true;
      key.isUp = false;
    }
    event.preventDefault();
  };

  //The `upHandler`
  key.upHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isDown && key.release) key.release();
      key.isDown = false;
      key.isUp = true;
    }
    event.preventDefault();
  };

  //Attach event listeners
  window.addEventListener(
    'keydown', key.downHandler.bind(key), false
  );
  window.addEventListener(
    'keyup', key.upHandler.bind(key), false
  );
  return key;
}

$(function() {
  var TextureCache = PIXI.utils.TextureCache;
  var Rectangle = PIXI.Rectangle;
  var Sprite = PIXI.Sprite;
  var MovieClip = PIXI.extras.MovieClip;
  var Container = PIXI.Container;
  var Texture = PIXI.Texture;

  var renderer = PIXI.autoDetectRenderer(400, 300, {backgroundColor: 0xdbd1b4, interactive: true});
  $('#container').empty().append(renderer.view);

  // create the root of the scene graph
  var stage = new Container();

  var spriteUrl = 'sprites.png';
  PIXI.loader
      .add(spriteUrl)
      .load(setup);
  
  var directions = {
    'right': {x: 1,  y: 0},
    'up':    {x: 0,  y: -1},
    'left':  {x: -1, y: 0},
    'down':  {x: 0,  y: 1}
  };
  var directionOrder = ['down', 'left', 'right', 'up'];
  var directionKeys = {'left': 37, 'up': 38, 'right': 39, 'down': 40};

  var players = [];
  var playerId = 0;

  var allSprites = [];
  //Create the `tileset` sprite from the texture
  
  function setup() {
    setupPlayers();
    
    setupEvents();
  }

  function setupPlayers() {
    var numPlayers = 7;
    var playersPerRow = 4;
    var spriteSize = {x: 32, y: 32};
    var spritesPerPlayer = {x: 3, y: 4};

    for (var playerNum = 0; playerNum < numPlayers; playerNum++) {
      (function() {
        var offset = {
          x: (playerNum % playersPerRow) * spriteSize.x * spritesPerPlayer.x,
          y: Math.floor(playerNum / playersPerRow) * spriteSize.y * spritesPerPlayer.y
        };
        loadPlayer({
          spriteSize: spriteSize,
          spritesPerPlayer: spritesPerPlayer,
          offset: offset,
          playerNum: playerNum
        });
      })(); 
    }

    $.each(players, function(playerNum, player) {
      drawPlayer(player);
    });
  }

  function loadPlayer(options) {
    var textureTile = TextureCache[spriteUrl];
    var playerNum = options.playerNum;
    var offset = options.offset;
    var spritesPerPlayer = options.spritesPerPlayer;
    var spriteSize = options.spriteSize;

    var textures = [];
    for (var y=0; y<spritesPerPlayer.y; y++) {
      textures[y] = [];
      for (var x=0; x<spritesPerPlayer.x; x++) {
        var rectangle = new Rectangle(offset.x + x * spriteSize.x, offset.y + y * spriteSize.y, spriteSize.x, spriteSize.y);
        var texture = new Texture(textureTile);
        texture.frame = rectangle;
        textures[y].push({
          texture: texture,
          time: 150
        });
      }
    }

    var sprites = {};
    $.each(directions, function(directionName, coordinates) {
      var y = directionOrder.indexOf(directionName);
      sprites['face-' + directionName] = setupEventsOnSprite(new Sprite(textures[y][1].texture), playerNum);
      sprites['walk-' + directionName] = setupEventsOnSprite(new MovieClip([ textures[y][0], textures[y][1], textures[y][2], textures[y][1] ]), playerNum);
    });
    var spritesId = allSprites.length;
    allSprites.push(sprites);

    var player = {
      spritesId: spritesId,
      sprite: function() {
        return allSprites.length > this.spritesId ? allSprites[this.spritesId][this.state + '-' + this.direction] : null;
      },
      lastSprite: null,
      position: {
        x: 32 + (playerNum % 4) * 64,
        y: 32 + Math.floor(playerNum / 4) * 64
      },
      size: spriteSize,
      movement: {'right': false, 'up': false, 'left': false, 'down': false},
      movementStarted: null,
      direction: 'down',
      state: 'face',
      animated: false,
      speedInfo: {
        initial: 0.5,
        max: 2.5,
        rampUp: 500.0
      },
      walk: function(directionName) {
        this.state = 'walk';
        this.animated = true;
        if (!this.movementStarted) this.movementStarted = new Date();
        this.direction = directionName;
      },
      stop: function() {
        this.state = 'face';
        this.animated = false;
        this.movementStarted = null;
      },
      speed: function() {
        if (!this.movementStarted) return 0;
        var millis = new Date() - this.movementStarted;
        return this.speedInfo.initial + (Math.min(millis, this.speedInfo.rampUp) / this.speedInfo.rampUp) * (this.speedInfo.max - this.speedInfo.initial);
      }
    }

    players.push(player);
  }

  function setupEvents() {
    $.each(directionKeys, function(directionName, keyCode) {
      var key = keyboard(keyCode);
      key.press = function() {
        if (playerId < players.length) {
          var player = players[playerId];
          player.movement[directionName] = true;
        }
      };
      key.release = function() {
        if (playerId < players.length) {
          var player = players[playerId];
          player.movement[directionName] = false;
        }
      };
    });
  }

  function setupEventsOnSprite(sprite, playerNum) {
      sprite.interactive = true;
      sprite.buttonMode = true;
      sprite.defaultCursor = 'pointer';
      sprite.click = function() { changePlayer(playerNum); };
      return sprite;
  }

  function drawPlayer(player) {
    var sprite = player.sprite();
    if (!sprite) return;

    sprite.x = player.position.x;
    sprite.y = player.position.y;
    
    if (sprite !== player.lastSprite) {
      stage.removeChild(player.lastSprite);

      if (player.animated) {
        sprite.play();
      }

      stage.addChild(sprite);
    }

    player.lastSprite = sprite;
  }


  function movePlayer(player) {
    var changeX = 0;
    var changeY = 0;
    $.each(directions, function(directionName, coordinates) {
      if (player.movement[directionName]) {
        changeX += coordinates.x;
        changeY += coordinates.y;
      }
    });

    if (changeY != 0) {
      player.walk(changeY > 0 ? 'down' : 'up');
    } else if (changeX != 0) {
      player.walk(changeX > 0 ? 'right' : 'left');
    } else {
      player.stop();
    }
    
    var speed = player.speed();
    player.position.x += changeX * speed;
    player.position.y += changeY * speed;

    player.position.x = Math.max(player.position.x, 0);
    player.position.x = Math.min(player.position.x, renderer.width - player.size.x);
    player.position.y = Math.max(player.position.y, 0);
    player.position.y = Math.min(player.position.y, renderer.height - player.size.y);
  }

  function changePlayer(newPlayerId) {
    if (playerId < players.length) {
      var player = players[playerId];

      player.stop();
    }

    playerId = newPlayerId;
  }

  // start animating
  animate();
  function animate() {
    requestAnimationFrame(animate);
    
    if (playerId < players.length) {
      var player = players[playerId];
      movePlayer(player);
      drawPlayer(player);
    }

    // render the container
    renderer.render(stage);
  }

});
