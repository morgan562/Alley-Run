export default class Consumable {
  constructor(ctx, x, y, size, baseSpeed, scaleRatio) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.size = size;
    this.baseSpeed = baseSpeed;
    this.scaleRatio = scaleRatio;
  }

  update(gameSpeed, frameTimeDelta) {
    this.x -= this.baseSpeed * gameSpeed * frameTimeDelta * this.scaleRatio;
  }

  draw() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  collidesWith(sprite) {
    return (
      sprite.x < this.x + this.size &&
      sprite.x + sprite.width > this.x &&
      sprite.y < this.y + this.size &&
      sprite.y + sprite.height > this.y
    );
  }
}
