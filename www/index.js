(async function() {
  var directions = {
    right: {x: 1,  y: 0},
    up:    {x: 0,  y: -1},
    left:  {x: -1, y: 0},
    down:  {x: 0,  y: 1}
  };
  // rows of each character in sprites.png, top to bottom
  var directionOrder = ['down', 'left', 'right', 'up'];
  var directionKeys = {ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down'};

  var app = new PIXI.Application();
  await app.init({width: 400, height: 300, background: 0xdbd1b4});
  document.getElementById('container').replaceChildren(app.canvas);

  var sheet = await PIXI.Assets.load('sprites.png');

  var players = [];
  var playerId = 0;

  setupPlayers();
  setupEvents();
  app.ticker.add(animate);

  function setupPlayers() {
    var numPlayers = 7;
    var playersPerRow = 4;
    var spriteSize = {x: 32, y: 32};
    var spritesPerPlayer = {x: 3, y: 4};

    for (var playerNum = 0; playerNum < numPlayers; playerNum++) {
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
    }

    players.forEach(drawPlayer);
  }

  function loadPlayer(options) {
    var playerNum = options.playerNum;
    var offset = options.offset;
    var spritesPerPlayer = options.spritesPerPlayer;
    var spriteSize = options.spriteSize;

    var textures = [];
    for (var y = 0; y < spritesPerPlayer.y; y++) {
      textures[y] = [];
      for (var x = 0; x < spritesPerPlayer.x; x++) {
        textures[y].push({
          texture: new PIXI.Texture({
            source: sheet.source,
            frame: new PIXI.Rectangle(offset.x + x * spriteSize.x, offset.y + y * spriteSize.y, spriteSize.x, spriteSize.y)
          }),
          time: 150
        });
      }
    }

    // a standing sprite and a walking animation for each direction
    var sprites = {};
    Object.keys(directions).forEach(function(directionName) {
      var row = textures[directionOrder.indexOf(directionName)];
      sprites['face-' + directionName] = setupEventsOnSprite(new PIXI.Sprite(row[1].texture), playerNum);
      sprites['walk-' + directionName] = setupEventsOnSprite(new PIXI.AnimatedSprite([row[0], row[1], row[2], row[1]]), playerNum);
    });

    players.push({
      sprites: sprites,
      sprite: function() {
        return this.sprites[this.state + '-' + this.direction];
      },
      lastSprite: null,
      position: {
        x: 32 + (playerNum % 4) * 64,
        y: 32 + Math.floor(playerNum / 4) * 64
      },
      size: spriteSize,
      movement: {right: false, up: false, left: false, down: false},
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
        if (!this.movementStarted) this.movementStarted = Date.now();
        this.direction = directionName;
      },
      stop: function() {
        this.state = 'face';
        this.animated = false;
        this.movementStarted = null;
      },
      // starts slow and speeds up the longer you hold the key
      speed: function() {
        if (!this.movementStarted) return 0;
        var millis = Date.now() - this.movementStarted;
        return this.speedInfo.initial + (Math.min(millis, this.speedInfo.rampUp) / this.speedInfo.rampUp) * (this.speedInfo.max - this.speedInfo.initial);
      }
    });
  }

  function setupEvents() {
    function onKey(event, isDown) {
      var directionName = directionKeys[event.key];
      if (!directionName) return;
      // stop arrow keys from scrolling the page
      event.preventDefault();
      if (playerId < players.length) {
        players[playerId].movement[directionName] = isDown;
      }
    }
    window.addEventListener('keydown', function(event) { onKey(event, true); });
    window.addEventListener('keyup', function(event) { onKey(event, false); });
  }

  function setupEventsOnSprite(sprite, playerNum) {
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointertap', function() { changePlayer(playerNum); });
    return sprite;
  }

  function drawPlayer(player) {
    var sprite = player.sprite();

    sprite.x = player.position.x;
    sprite.y = player.position.y;

    if (sprite !== player.lastSprite) {
      if (player.lastSprite) app.stage.removeChild(player.lastSprite);

      if (player.animated) {
        sprite.play();
      }

      app.stage.addChild(sprite);
    }

    player.lastSprite = sprite;
  }

  function movePlayer(player, frames) {
    var changeX = 0;
    var changeY = 0;
    Object.keys(directions).forEach(function(directionName) {
      if (player.movement[directionName]) {
        changeX += directions[directionName].x;
        changeY += directions[directionName].y;
      }
    });

    if (changeY != 0) {
      player.walk(changeY > 0 ? 'down' : 'up');
    } else if (changeX != 0) {
      player.walk(changeX > 0 ? 'right' : 'left');
    } else {
      player.stop();
    }

    // frames is 1 at 60fps, so the speed is the same on faster screens
    var speed = player.speed() * frames;
    player.position.x += changeX * speed;
    player.position.y += changeY * speed;

    player.position.x = Math.max(player.position.x, 0);
    player.position.x = Math.min(player.position.x, app.screen.width - player.size.x);
    player.position.y = Math.max(player.position.y, 0);
    player.position.y = Math.min(player.position.y, app.screen.height - player.size.y);
  }

  function changePlayer(newPlayerId) {
    if (playerId < players.length) {
      players[playerId].stop();
      // the old player isn't redrawn anymore, so make it stand still now
      drawPlayer(players[playerId]);
    }

    playerId = newPlayerId;
  }

  function animate(ticker) {
    if (playerId < players.length) {
      var player = players[playerId];
      movePlayer(player, ticker.deltaTime);
      drawPlayer(player);
    }
  }
})();
