/**
 * @extends WomCastTest
 */
export default class RingTest extends WomCastTest {
  constructor(data, actor) {
    super(data, actor)
    if (!data) return
    this.data.preData.ring = data.ring;
    this.data.preData.roll = -1
    this.data.preData.target = -1
    this.data.preData.outcome = "success"
    this.data.preData.baseSL = 0
    this.data.preData.SL = 0
    this.computeTargetNumber();
  }

  async computeResult() {
    await super.computeResult()

    // Remove SLs again
    this.data.result.SL = "+0"
    this.data.result.slOver = 0
  }

  get item() {
    let item = super.item;
    item.system.computeOvercastingData();
    return item;
  }

  get ring() {
    return this.data.preData.ring;
  }

  get damageEffects() {
    return this.item.damageEffects.map(this.#mapEffects.bind(this));
  }

  get targetEffects() {
    return this.item.targetEffects.map(this.#mapEffects.bind(this));
  }

  get areaEffects() {
    return this.item.areaEffects.map(this.#mapEffects.bind(this));
  }

  #mapEffects(e) {
    let effect = foundry.utils.duplicate(e);
    effect.uuid = `${this.ring.system.spellUuid}.ActiveEffect.${effect._id}`;
    return effect;
  }
}