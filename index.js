import Player from "./Player.js";
import Ground from "./Ground.js";
import CactiController from "./CactiController.js";
import Score from "./Score.js";
import Consumable from "./Consumable.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const GAME_SPEED_START = 1; // 1.0
const GAME_SPEED_INCREMENT = 0.00001;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 200;
const PLAYER_WIDTH = 88 / 1.18; // slight hitbox tighten
const PLAYER_HEIGHT = 94 / 1.18; // slight hitbox tighten
const MAX_JUMP_HEIGHT = GAME_HEIGHT;
const MIN_JUMP_HEIGHT = 150;
const GROUND_WIDTH = 2400;
const GROUND_HEIGHT = 24;
const GROUND_AND_CACTUS_SPEED = 0.5;
const FLOW_MULTIPLIER = 1.3;
const FLOW_DURATION = 5000;
const CONSUMABLE_UNLOCK_TIME = 12000;
const CONSUMABLE_SIZE = 12;
const CONSUMABLE_RESPAWN_COOLDOWN = 5000;

const CACTI_CONFIG = [
  { width: 40 / 1.8, height: 60 / 1.8, image: "images/trash_bag.png", yOffset: 6 },
  { width: 88 / 1.5, height: 78 / 1.5, image: "images/dumpster.png", yOffset: 4 },
];

//Game Objects
let player = null;
let ground = null;
let cactiController = null;
let score = null;

let scaleRatio = null;
let previousTime = null;
let gameSpeed = GAME_SPEED_START;
let gameOver = false;
let waitingToStart = true;
let flowActive = false;
let flowTimer = 0;
let activePlayTime = 0;
let consumable = null;
let consumableCollected = false;
let consumableCooldown = 0;

function createSprites() {
  const playerWidthInGame = PLAYER_WIDTH * scaleRatio;
  const playerHeightInGame = PLAYER_HEIGHT * scaleRatio;
  const minJumpHeightInGame = MIN_JUMP_HEIGHT * scaleRatio;
  const maxJumpHeightInGame = MAX_JUMP_HEIGHT * scaleRatio;

  const groundWidthInGame = GROUND_WIDTH * scaleRatio;
  const groundHeightInGame = GROUND_HEIGHT * scaleRatio;

  player = new Player(
    ctx,
    playerWidthInGame,
    playerHeightInGame,
    minJumpHeightInGame,
    maxJumpHeightInGame,
    scaleRatio
  );

  ground = new Ground(
    ctx,
    groundWidthInGame,
    groundHeightInGame,
    GROUND_AND_CACTUS_SPEED,
    scaleRatio
  );

  const cactiImages = CACTI_CONFIG.map((cactus) => {
    const image = new Image();
    image.src = cactus.image;
    return {
      image: image,
      width: cactus.width * scaleRatio,
      height: cactus.height * scaleRatio,
      yOffset: (cactus.yOffset || 0) * scaleRatio,
    };
  });

  cactiController = new CactiController(
    ctx,
    cactiImages,
    scaleRatio,
    GROUND_AND_CACTUS_SPEED,
    groundHeightInGame
  );

  score = new Score(ctx, scaleRatio);
}

function setScreen() {
  scaleRatio = getScaleRatio();
  canvas.width = GAME_WIDTH * scaleRatio;
  canvas.height = GAME_HEIGHT * scaleRatio;
  createSprites();
}

setScreen();
//Use setTimeout on Safari mobile rotation otherwise works fine on desktop
window.addEventListener("resize", () => setTimeout(setScreen, 500));

if (screen.orientation) {
  screen.orientation.addEventListener("change", setScreen);
}

function getScaleRatio() {
  const screenHeight = Math.min(
    window.innerHeight,
    document.documentElement.clientHeight
  );

  const screenWidth = Math.min(
    window.innerWidth,
    document.documentElement.clientWidth
  );

  //window is wider than the game width
  if (screenWidth / screenHeight < GAME_WIDTH / GAME_HEIGHT) {
    return screenWidth / GAME_WIDTH;
  } else {
    return screenHeight / GAME_HEIGHT;
  }
}

function showGameOver() {
  const fontSize = 70 * scaleRatio;
  ctx.font = `${fontSize}px Verdana`;
  ctx.fillStyle = "grey";
  const x = canvas.width / 4.5;
  const y = canvas.height / 2;
  ctx.fillText("Game Over", x, y);

  const restartFont = 32 * scaleRatio;
  ctx.font = `${restartFont}px Verdana`;
  ctx.fillText("Press Space to Restart", x - 20 * scaleRatio, y + 50 * scaleRatio);
}

function reset(event) {
  const isSpaceKey = event.type === "keyup" && event.code === "Space";
  const isTouch = event.type === "touchstart";

  if (waitingToStart) {
    if (!isSpaceKey && !isTouch) return;
    waitingToStart = false;
  } else if (gameOver) {
    if (!isSpaceKey) return;
    gameOver = false;
  } else {
    return;
  }

  ground.reset();
  cactiController.reset();
  score.reset();
  gameSpeed = GAME_SPEED_START;
  previousTime = null;
  flowActive = false;
  flowTimer = 0;
  activePlayTime = 0;
  consumable = null;
  consumableCollected = false;
  consumableCooldown = 0;

  player.x = 10 * scaleRatio;
  player.y = player.yStandingPosition;
  player.jumpPressed = false;
  player.jumpInProgress = false;
  player.falling = false;
  player.image = player.standingStillImage;
  player.walkAnimationTimer = player.WALK_ANIMATION_TIMER;
}

function showStartGameText() {
  const fontSize = 40 * scaleRatio;
  ctx.font = `${fontSize}px Verdana`;
  ctx.fillStyle = "grey";
  const x = canvas.width / 14;
  const y = canvas.height / 2;
  ctx.fillText("Tap Screen or Press Space To Start", x, y);
}

function updateGameSpeed(frameTimeDelta) {
  gameSpeed += frameTimeDelta * GAME_SPEED_INCREMENT;
}

function clearScreen() {
  ctx.fillStyle = "#EF721F";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameLoop(currentTime) {
  if (previousTime === null) {
    previousTime = currentTime;
    requestAnimationFrame(gameLoop);
    return;
  }
  const frameTimeDelta = currentTime - previousTime;
  previousTime = currentTime;

  clearScreen();

  if (!gameOver && !waitingToStart) {
    const effectiveGameSpeed = gameSpeed * (flowActive ? FLOW_MULTIPLIER : 1);
    activePlayTime += frameTimeDelta;
    if (consumableCooldown > 0) {
      consumableCooldown -= frameTimeDelta;
    }

    if (
      !consumable &&
      !flowActive &&
      !consumableCollected &&
      activePlayTime >= CONSUMABLE_UNLOCK_TIME &&
      consumableCooldown <= 0
    ) {
      const size = CONSUMABLE_SIZE * scaleRatio;
      const x = canvas.width * 1.2;
      const latest =
        typeof cactiController.getLatestActiveCactus === "function"
          ? cactiController.getLatestActiveCactus()
          : null;
      const safeGap = 180 * scaleRatio;
      const spawnY = ground.y - size - 2 * scaleRatio;
      const canSpawn =
        !latest || x - (latest.x + latest.width) >= safeGap;

      if (canSpawn) {
        consumable = new Consumable(
          ctx,
          x,
          spawnY,
          size,
          GROUND_AND_CACTUS_SPEED,
          scaleRatio
        );
      }
    }

    if (consumable) {
      consumable.update(effectiveGameSpeed, frameTimeDelta);
      if (consumable.collidesWith(player)) {
        consumable = null;
        flowActive = true;
        flowTimer = FLOW_DURATION;
        consumableCollected = true;
      } else if (consumable.x < -consumable.size) {
        consumable = null;
        consumableCooldown = CONSUMABLE_RESPAWN_COOLDOWN;
      }
    }

    if (flowActive) {
      flowTimer -= frameTimeDelta;
      if (flowTimer <= 0) {
        flowActive = false;
      }
    }

    //Update game objects
    ground.update(effectiveGameSpeed, frameTimeDelta);
    cactiController.update(effectiveGameSpeed, frameTimeDelta);
    player.update(effectiveGameSpeed, frameTimeDelta);
    score.update(frameTimeDelta, flowActive ? 2 : 1);
    updateGameSpeed(frameTimeDelta);
  }

  if (!gameOver && cactiController.collideWith(player)) {
    gameOver = true;
    score.setHighScore();
  }

  //Draw game objects
  ground.draw();
  cactiController.draw();
  player.draw();
  if (consumable) {
    consumable.draw();
  }
  score.draw();

  if (gameOver) {
    showGameOver();
  }

  if (waitingToStart) {
    showStartGameText();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

window.addEventListener("keyup", reset);
window.addEventListener("touchstart", reset);
