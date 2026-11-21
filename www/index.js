(async function() {
  var directions = {
    right: {x: 1,  y: 0},
    up:    {x: 0,  y: -1},
    left:  {x: -1, y: 0},
    down:  {x: 0,  y: 1}
  };
  var opposite = {right: 'left', up: 'down', left: 'right', down: 'up'};
  // rows of each character in sprites.png, top to bottom
  var directionOrder = ['down', 'left', 'right', 'up'];
  // turning clockwise, for dancing
  var spinOrder = ['down', 'left', 'up', 'right'];
  var directionKeys = {ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down'};

  var lines = {
    hello: ['Hi!', 'Hello!', 'Pick me!'],
    picked: ['Me?', "Let's go!", 'Finally!', 'Ready!', 'Who, me?', 'Yay!', 'My turn!'],
    jump: ['Wheee!', 'Boing!', 'Hup!', 'Yahoo!', 'Up!'],
    bumped: ['Hey!', 'Oof!', 'Excuse me!', 'Watch it!', 'Rude.', 'Ow!', 'Personal space!', 'Beep beep!', 'Sorry!'],
    wander: ['Freedom!', 'Bye!', 'Adventure!', 'Stretch time'],
    conga: ['Conga!', 'Woo!', 'Choo choo!'],
    dance: ['Party!', 'Woo!', '\u266a', '\u266b \u266a', 'Groovy!', 'Yeah!']
  };

  var width = 400;
  var height = 300;
  var tileSize = 25;
  var floorColor = 0xdbd1b4;
  var discoColors = [0xf5c2d0, 0xc2dcf5, 0xcdf0c2, 0xf5e6b8, 0xdcc6f5];
  // how far apart characters are in the conga line
  var congaSpacing = 30;

  // what is holding each direction down right now: the keyboard and/or a finger on a pad button
  var held = {right: new Set(), up: new Set(), left: new Set(), down: new Set()};
  // null, 'wander' or 'conga'
  var mode = null;
  var danceUntil = 0;
  var discoBeat = -1;
  var bumps = 0;
  // where the conga leader has walked, so followers can step in the same spots
  var trail = [];
  var leaderDistance = 0;
  var followers = [];

  var app = new PIXI.Application();
  // drawn 4x bigger than the play area so it stays sharp when CSS stretches the canvas
  await app.init({width: width, height: height, resolution: 4, background: floorColor});
  document.getElementById('container').replaceChildren(app.canvas);

  var sheet = await PIXI.Assets.load('sprites.png');
  // keep the pixel art blocky instead of blurry
  sheet.source.scaleMode = 'nearest';

  var shadowLayer = new PIXI.Container();
  var characterLayer = new PIXI.Container();
  // characters lower on the screen are drawn in front
  characterLayer.sortableChildren = true;
  var bubbleLayer = new PIXI.Container();
  var selectionRing = new PIXI.Graphics()
    .ellipse(0, 0, 14, 6)
    .fill({color: 0x1a7f37, alpha: 0.3})
    .stroke({width: 1.5, color: 0x1a7f37});

  app.stage.addChild(drawFloor(), selectionRing, shadowLayer, characterLayer, bubbleLayer);

  var players = [];
  var playerId = 0;

  setupPlayers();
  setupEvents();
  say(players[0], pick(lines.hello), performance.now(), true);
  app.ticker.add(animate);

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function drawFloor() {
    var floor = new PIXI.Graphics();
    for (var y = 0; y < height; y += tileSize) {
      for (var x = 0; x < width; x += tileSize) {
        if ((x + y) / tileSize % 2) floor.rect(x, y, tileSize, tileSize);
      }
    }
    return floor.fill({color: 0xcfc3a1, alpha: 0.45});
  }

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

    var shadow = new PIXI.Graphics().ellipse(0, 0, 10, 4).fill({color: 0x3c2d14, alpha: 0.25});
    shadowLayer.addChild(shadow);

    players.push({
      num: playerNum,
      sprites: sprites,
      lastSprite: null,
      shadow: shadow,
      bubble: null,
      lastSaid: -Infinity,
      position: {
        x: 58 + (playerNum % 4) * 84,
        y: 78 + Math.floor(playerNum / 4) * 112
      },
      direction: 'down',
      moving: false,
      movementStarted: null,
      jumpStarted: null,
      // who this character was pushing against last frame, so one bump only counts once
      touching: null,
      wanderDirection: null,
      wanderUntil: 0,
      wanderSpeed: 0.6 + Math.random() * 0.4
    });
  }

  function setupEvents() {
    var buttons = {};
    document.querySelectorAll('.dpad [data-direction]').forEach(function(button) {
      buttons[button.dataset.direction] = button;
    });

    function press(directionName, source) {
      held[directionName].add(source);
      buttons[directionName].classList.add('pressed');
    }

    function release(directionName, source) {
      held[directionName].delete(source);
      if (!held[directionName].size) buttons[directionName].classList.remove('pressed');
    }

    function onKey(event, isDown) {
      if (event.key === ' ') {
        // let a focused button handle its own space press
        if (event.target.closest && event.target.closest('button')) return;
        event.preventDefault();
        if (isDown && !event.repeat) jump(players[playerId], performance.now());
        return;
      }
      var directionName = directionKeys[event.key];
      if (!directionName) return;
      // stop arrow keys from scrolling the page
      event.preventDefault();
      if (isDown) press(directionName, 'key');
      else release(directionName, 'key');
    }
    window.addEventListener('keydown', function(event) { onKey(event, true); });
    window.addEventListener('keyup', function(event) { onKey(event, false); });

    // keyup never fires if the key is let go while the page is in the background
    window.addEventListener('blur', function() {
      Object.keys(held).forEach(function(directionName) {
        held[directionName].forEach(function(source) { release(directionName, source); });
      });
    });

    Object.keys(buttons).forEach(function(directionName) {
      var button = buttons[directionName];
      button.addEventListener('pointerdown', function(event) {
        event.preventDefault();
        // keep getting pointerup even if the finger slides off the button
        button.setPointerCapture(event.pointerId);
        press(directionName, 'pointer' + event.pointerId);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(type) {
        button.addEventListener(type, function(event) {
          release(directionName, 'pointer' + event.pointerId);
        });
      });
      button.addEventListener('contextmenu', function(event) { event.preventDefault(); });
    });

    document.getElementById('random-button').addEventListener('click', function() {
      // anyone except the current character
      var choice = Math.floor(Math.random() * (players.length - 1));
      changePlayer(choice >= playerId ? choice + 1 : choice);
    });
    document.getElementById('wander-button').addEventListener('click', function() {
      setMode(mode === 'wander' ? null : 'wander');
    });
    document.getElementById('conga-button').addEventListener('click', function() {
      setMode(mode === 'conga' ? null : 'conga');
    });
    document.getElementById('dance-button').addEventListener('click', function() {
      var now = performance.now();
      danceUntil = now + 4000;
      players.forEach(function(player) { say(player, pick(lines.dance), now, true); });
    });
  }

  function setupEventsOnSprite(sprite, playerNum) {
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    // a little bigger than the sprite so it's easy to tap on a phone
    sprite.hitArea = new PIXI.Rectangle(-6, -6, 44, 44);
    sprite.on('pointertap', function() { changePlayer(playerNum); });
    return sprite;
  }

  function setMode(newMode) {
    var now = performance.now();
    var leader = players[playerId];
    mode = newMode;
    document.getElementById('wander-button').setAttribute('aria-pressed', mode === 'wander');
    document.getElementById('conga-button').setAttribute('aria-pressed', mode === 'conga');

    players.forEach(function(player) {
      player.wanderUntil = 0;
      if (player !== leader) player.moving = false;
    });

    if (mode === 'wander') {
      say(pick(players.filter(function(player) { return player !== leader; })), pick(lines.wander), now, true);
    } else if (mode === 'conga') {
      startConga();
      say(leader, 'Follow me!', now, true);
      say(followers[0], pick(lines.conga), now, true);
    }
  }

  function changePlayer(newPlayerId) {
    var now = performance.now();
    if (newPlayerId === playerId) {
      jump(players[playerId], now);
      return;
    }

    var oldPlayer = players[playerId];
    oldPlayer.moving = false;
    oldPlayer.movementStarted = null;
    oldPlayer.touching = null;

    playerId = newPlayerId;
    var player = players[playerId];
    player.jumpStarted = now;
    say(player, pick(lines.picked), now, true);
    if (mode === 'conga') startConga();
  }

  function jump(player, now) {
    if (player.jumpStarted === null) {
      player.jumpStarted = now;
      say(player, pick(lines.jump), now);
    }
  }

  function jumpHeight(player, now) {
    if (player.jumpStarted === null) return 0;
    var progress = (now - player.jumpStarted) / 450;
    if (progress >= 1) {
      player.jumpStarted = null;
      return 0;
    }
    return Math.sin(progress * Math.PI) * 12;
  }

  // a speech bubble over a character's head. Characters only talk every so often unless forced
  function say(player, text, now, force) {
    if (!force && now - player.lastSaid < 1500) return;
    player.lastSaid = now;
    if (player.bubble) player.bubble.destroy({children: true});

    var label = new PIXI.Text({
      text: text,
      style: {fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 10, fontWeight: '700', fill: 0x0b0d0c}
    });
    label.anchor.set(0.5, 1);
    var boxWidth = label.width + 10;
    var boxHeight = label.height + 5;
    label.y = -6.5;

    var background = new PIXI.Graphics()
      .roundRect(-boxWidth / 2, -boxHeight - 4, boxWidth, boxHeight, 6)
      .fill(0xffffff)
      .stroke({width: 1, color: 0x0b0d0c, alpha: 0.15})
      .poly([-3, -4.5, 3, -4.5, 0, 0])
      .fill(0xffffff);

    var bubble = new PIXI.Container();
    bubble.addChild(background, label);
    bubble.born = now;
    bubble.until = now + 1600;
    bubble.halfWidth = boxWidth / 2;
    bubble.fullHeight = boxHeight + 4;
    bubbleLayer.addChild(bubble);
    player.bubble = bubble;
  }

  // collisions only look at a small box around the feet, so characters can stand close together
  function footBox(position) {
    return {x: position.x + 6, y: position.y + 22, width: 20, height: 10};
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // who would be in the way at this new spot. Moving away from someone you already overlap is allowed,
  // so characters that end up stacked can still walk apart
  function findBlocker(player, next) {
    // conga dancers walk through each other
    if (mode === 'conga') return null;
    var box = footBox(next);
    for (var i = 0; i < players.length; i++) {
      var other = players[i];
      if (other === player) continue;
      if (overlaps(box, footBox(other.position)) && distance(next, other.position) < distance(player.position, other.position)) {
        return other;
      }
    }
    return null;
  }

  // moves one axis at a time so characters slide along each other and the walls
  function tryMove(player, dx, dy) {
    var result = {moved: false, blocker: null};
    [[dx, 0], [0, dy]].forEach(function(step) {
      if (!step[0] && !step[1]) return;
      var next = {
        x: clamp(player.position.x + step[0], 0, width - 32),
        y: clamp(player.position.y + step[1], 0, height - 32)
      };
      if (next.x === player.position.x && next.y === player.position.y) return;
      var blocker = findBlocker(player, next);
      if (blocker) {
        result.blocker = blocker;
      } else {
        player.position = next;
        result.moved = true;
      }
    });
    return result;
  }

  function bump(bumper, bumped, now) {
    var leader = players[playerId];
    if (bumper === leader || bumped === leader) {
      bumps++;
      document.getElementById('bump-count').textContent = bumps;
      document.getElementById('bump-label').textContent = bumps === 1 ? 'bump' : 'bumps';
    } else if (Math.random() < 0.6) {
      // wanderers bumping each other don't always bother saying something
      return;
    }
    // turn around to see who did that
    bumped.direction = opposite[bumper.direction];
    say(bumped, pick(lines.bumped), now);
  }

  function updateLeader(player, frames, now) {
    var changeX = 0;
    var changeY = 0;
    Object.keys(directions).forEach(function(directionName) {
      if (held[directionName].size) {
        changeX += directions[directionName].x;
        changeY += directions[directionName].y;
      }
    });

    if (!changeX && !changeY) {
      player.moving = false;
      player.movementStarted = null;
      player.touching = null;
      return;
    }

    if (changeY) player.direction = changeY > 0 ? 'down' : 'up';
    else player.direction = changeX > 0 ? 'right' : 'left';
    player.moving = true;
    if (!player.movementStarted) player.movementStarted = now;

    // starts slow and speeds up the longer you hold the key. frames is 1 at 60fps,
    // so the speed is the same on faster screens
    var rampUp = Math.min(now - player.movementStarted, 500) / 500;
    var speed = (0.5 + rampUp * 2) * frames;
    var result = tryMove(player, changeX * speed, changeY * speed);
    if (result.blocker && result.blocker !== player.touching) bump(player, result.blocker, now);
    player.touching = result.blocker;
  }

  function updateWanderer(player, frames, now) {
    if (now > player.wanderUntil) {
      // sometimes stand around for a bit
      player.wanderDirection = Math.random() < 0.3 ? null : pick(Object.keys(directions));
      player.wanderUntil = now + 400 + Math.random() * 1600;
    }
    if (!player.wanderDirection) {
      player.moving = false;
      return;
    }

    player.direction = player.wanderDirection;
    player.moving = true;
    var step = directions[player.wanderDirection];
    var speed = player.wanderSpeed * frames;
    var result = tryMove(player, step.x * speed, step.y * speed);
    if (result.blocker && result.blocker !== player.touching) bump(player, result.blocker, now);
    player.touching = result.blocker;
    // hit a wall or someone, so pick a new way to go next frame
    if (!result.moved) player.wanderUntil = 0;
  }

  // lines everyone up behind the current character, closest first
  function startConga() {
    var leader = players[playerId];
    followers = players
      .filter(function(player) { return player !== leader; })
      .sort(function(a, b) { return distance(a.position, leader.position) - distance(b.position, leader.position); });

    // pretend the leader just walked in a straight line to get here, so there are spots to line up on
    var back = directions[opposite[leader.direction]];
    var length = (followers.length + 1) * congaSpacing;
    trail = [];
    leaderDistance = 0;
    for (var d = length; d >= 0; d -= 2) {
      trail.push({
        x: clamp(leader.position.x + back.x * d, 0, width - 32),
        y: clamp(leader.position.y + back.y * d, 0, height - 32),
        distance: -d
      });
    }
  }

  function recordTrail(leader, before) {
    var moved = distance(before, leader.position);
    if (!moved) return;
    leaderDistance += moved;
    trail.push({x: leader.position.x, y: leader.position.y, distance: leaderDistance});
    // forget spots that are too far back for anyone to need
    var oldest = leaderDistance - (followers.length + 2) * congaSpacing;
    while (trail.length > 2 && trail[1].distance < oldest) trail.shift();
  }

  function trailPoint(targetDistance) {
    for (var i = trail.length - 1; i > 0; i--) {
      if (trail[i].distance <= targetDistance) return trail[i];
    }
    return trail[0];
  }

  function updateFollower(player, index, frames) {
    var target = trailPoint(leaderDistance - (index + 1) * congaSpacing);
    var dx = target.x - player.position.x;
    var dy = target.y - player.position.y;
    var gap = Math.hypot(dx, dy);
    if (gap < 0.5) {
      player.moving = false;
      return;
    }
    var step = Math.min(gap, 3 * frames);
    player.position = {x: player.position.x + dx / gap * step, y: player.position.y + dy / gap * step};
    if (Math.abs(dx) > Math.abs(dy)) player.direction = dx > 0 ? 'right' : 'left';
    else player.direction = dy > 0 ? 'down' : 'up';
    player.moving = true;
  }

  // flashes the floor different colors while dancing
  function updateDisco(now) {
    var beat = now < danceUntil ? Math.floor(now / 300) % discoColors.length : -1;
    if (beat === discoBeat) return;
    discoBeat = beat;
    app.renderer.background.color = beat < 0 ? floorColor : discoColors[beat];
  }

  function drawPlayer(player, now) {
    var leader = players[playerId];
    var dancing = now < danceUntil && !player.moving;
    // how high off the ground the character is
    var lift = jumpHeight(player, now);
    if (dancing) {
      player.direction = spinOrder[(Math.floor(now / 140) + player.num) % 4];
      lift += Math.abs(Math.sin(now / 250 + player.num)) * 5;
    }

    // the current character (and everyone in a conga line) jogs in place while standing still
    var jogging = !player.moving && !dancing && (player === leader || mode === 'conga');
    var pose = player.moving || jogging ? 'walk' : 'face';
    var sprite = player.sprites[pose + '-' + player.direction];
    if (pose === 'walk') sprite.animationSpeed = jogging ? 0.35 : 1;

    sprite.x = player.position.x;
    sprite.y = player.position.y - lift;
    sprite.zIndex = player.position.y;
    player.shadow.x = player.position.x + 16;
    player.shadow.y = player.position.y + 30;
    // the shadow shrinks while in the air
    player.shadow.scale.set(1 - lift / 30);

    if (sprite !== player.lastSprite) {
      if (player.lastSprite) {
        characterLayer.removeChild(player.lastSprite);
        if (player.lastSprite.stop) player.lastSprite.stop();
      }
      if (sprite.play) sprite.play();
      characterLayer.addChild(sprite);
    }
    player.lastSprite = sprite;

    var bubble = player.bubble;
    if (bubble) {
      if (now > bubble.until) {
        bubble.destroy({children: true});
        player.bubble = null;
      } else {
        bubble.x = clamp(player.position.x + 16, bubble.halfWidth + 2, width - bubble.halfWidth - 2);
        bubble.y = Math.max(player.position.y - lift + 2, bubble.fullHeight + 2);
        // pops in, then fades out at the end
        bubble.scale.set(Math.min(1, 0.6 + (now - bubble.born) / 300));
        bubble.alpha = Math.min(1, (bubble.until - now) / 300);
      }
    }
  }

  function animate(ticker) {
    var now = performance.now();
    var frames = ticker.deltaTime;
    var leader = players[playerId];
    var before = {x: leader.position.x, y: leader.position.y};

    updateLeader(leader, frames, now);
    if (mode === 'wander') {
      players.forEach(function(player) {
        if (player !== leader) updateWanderer(player, frames, now);
      });
    } else if (mode === 'conga') {
      recordTrail(leader, before);
      followers.forEach(function(player, index) { updateFollower(player, index, frames); });
    }
    updateDisco(now);

    players.forEach(function(player) { drawPlayer(player, now); });

    selectionRing.x = leader.position.x + 16;
    selectionRing.y = leader.position.y + 30;
    selectionRing.alpha = 0.75 + Math.sin(now / 250) * 0.25;
  }
})();
