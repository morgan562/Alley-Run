import Cactus from "./Cactus.js";

export default class CactiController {
  CACTUS_INTERVAL_MIN = 380;
  CACTUS_INTERVAL_MAX = 1200;
  RETRY_DELAY = 50;
  TRASH_PAIR_CHANCE = 0.25;

  GAP_RULES = {
    small: {
      small: () => 108 * this.scaleRatio,
      large: () => 152 * this.scaleRatio,
    },
    large: {
      small: () => 148 * this.scaleRatio,
      large: () => 184 * this.scaleRatio,
    },
  };

  nextCactusInterval = null;
  cacti = [];

  constructor(ctx, cactiImages, scaleRatio, speed, groundHeight) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.cactiImages = cactiImages;
    this.scaleRatio = scaleRatio;
    this.speed = speed;
    this.groundHeight = groundHeight;

    this.setNextCactusTime();
  }

  setNextCactusTime() {
    const num = this.getRandomNumber(
      this.CACTUS_INTERVAL_MIN,
      this.CACTUS_INTERVAL_MAX
    );

    this.nextCactusInterval = num;
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  getSizeLabel(width) {
    if (this.smallestWidth === undefined || this.largestWidth === undefined) {
      const widths = this.cactiImages.map((img) => img.width);
      this.smallestWidth = Math.min(...widths);
      this.largestWidth = Math.max(...widths);
      this.sizeThreshold = (this.smallestWidth + this.largestWidth) / 2;
    }

    return width <= this.sizeThreshold ? "small" : "large";
  }

  getLatestActiveCactus() {
    for (let i = this.cacti.length - 1; i >= 0; i -= 1) {
      if (this.cacti[i].x > -this.cacti[i].width) {
        return this.cacti[i];
      }
    }
    return null;
  }

  hasRequiredGap(cactusImage) {
    const latest = this.getLatestActiveCactus();
    if (!latest) return true;

    const previousSize = this.getSizeLabel(latest.width);
    const nextSize = this.getSizeLabel(cactusImage.width);
    const requiredGap = this.GAP_RULES[previousSize][nextSize]();

    const spawnX = this.canvas.width * 1.5;
    const previousRightEdge = latest.x + latest.width;

    return spawnX - previousRightEdge >= requiredGap;
  }

  createCactus() {
    const index = this.getRandomNumber(0, this.cactiImages.length - 1);
    const cactusImage = this.cactiImages[index];
    if (!this.hasRequiredGap(cactusImage)) {
      this.nextCactusInterval = this.RETRY_DELAY;
      return false;
    }
    const x = this.canvas.width * 1.5;
    const y =
      this.canvas.height -
      this.groundHeight -
      cactusImage.height +
      (cactusImage.yOffset || 0);

    const isTrashBag = cactusImage.image.src.endsWith("trash_bag.png");
    const spawnPair = isTrashBag && Math.random() < this.TRASH_PAIR_CHANCE;

    if (spawnPair) {
      const pairGap = 18 * this.scaleRatio;
      const first = new Cactus(
        this.ctx,
        x,
        y,
        cactusImage.width,
        cactusImage.height,
        cactusImage.image
      );
      const second = new Cactus(
        this.ctx,
        x + cactusImage.width + pairGap,
        y,
        cactusImage.width,
        cactusImage.height,
        cactusImage.image
      );
      this.cacti.push(first, second);
      return true;
    }

    const cactus = new Cactus(
      this.ctx,
      x,
      y,
      cactusImage.width,
      cactusImage.height,
      cactusImage.image
    );

    this.cacti.push(cactus);
    return true;
  }

  update(gameSpeed, frameTimeDelta) {
    if (this.nextCactusInterval <= 0) {
      const spawned = this.createCactus();
      if (spawned) {
        this.setNextCactusTime();
      }
    }
    this.nextCactusInterval -= frameTimeDelta;

    this.cacti.forEach((cactus) => {
      cactus.update(this.speed, gameSpeed, frameTimeDelta, this.scaleRatio);
    });

    this.cacti = this.cacti.filter((cactus) => cactus.x > -cactus.width);
  }

  draw() {
    this.cacti.forEach((cactus) => cactus.draw());
  }

  collideWith(sprite) {
    return this.cacti.some((cactus) => cactus.collideWith(sprite));
  }

  reset() {
    this.cacti = [];
  }
}
