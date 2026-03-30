export default class Cactus {
  constructor(ctx, x, y, width, height, image) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = image;
  }

  update(speed, gameSpeed, frameTimeDelta, scaleRatio) {
    this.x -= speed * gameSpeed * frameTimeDelta * scaleRatio;
  }

  draw() {
    this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }

  collideWith(sprite) {
    const adjustBy = 1.4;
    const cactusRight = this.x + this.width / adjustBy;
    const cactusBottom = this.y + this.height / adjustBy;
    const spriteRight = sprite.x + sprite.width / adjustBy;
    const spriteBottom = sprite.y + sprite.height / adjustBy;

    if (
      sprite.x < cactusRight &&
      spriteRight > this.x &&
      sprite.y < cactusBottom &&
      spriteBottom > this.y
    ) {
      return true;
    } else {
      return false;
    }
  }
}
