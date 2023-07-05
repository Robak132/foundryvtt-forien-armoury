export default class ItemRepair {
  static bindHooks() {
    Hooks.on('renderChatLog', this._setChatListeners.bind(this));
  }

  /**
   * @param log
   * @param html
   * @private
   */
  static _setChatListeners(log, html) {
    html.on("click", ".forien-repair-item", this._onRepairItem.bind(this));
  }

  /**
   * @param event
   * @private
   */
  static _onRepairItem(event) {
    console.log(event.currentTarget.dataset.item);
    console.log(event.currentTarget.dataset.location);
    let money = MarketWfrp4e.payCommand(event.currentTarget.dataset.cost, actor);
    if (money) {
      WFRP_Audio.PlayContextAudio({item: {"type": "money"}, action: "lose"});
      //actor.updateEmbeddedDocuments("Item", money);
      console.log('money');
      console.log(money);
    }
  }

  /**
   * @param {ItemWfrp4e} item
   * @private
   * @return {Number}
   */
  static _getPriceInD(item) {
    return Number(item.price.gc || 0) * 240 + Number(item.price.ss || 0) * 12 + Number(item.price.bp || 0);
  }

  static _getMoneyStringFromD(amount) {
    let string = ``;
    let money = {
      gc: 0,
      ss: 0,
      bp: 0
    }

    money.gc = Math.trunc(amount / 240);
    amount = amount % 240;
    money.ss = Math.trunc(amount / 12);
    amount = amount % 12;
    money.bp = Math.trunc(amount);

    if (money.gc > 0)
      string += `${money.gc} GC `;

    if (money.ss > 0)
      string += `${money.ss} SS `;

    if (money.bp > 0)
      string += `${money.bp} BP`;

    return string;
  }

  /**
   * @param {ItemWfrp4e} item
   */
  static checkWeaponDamage(item) {
    let regex = /\d{1,3}/gm;
    let maxDamage = Number(regex.exec(item.damage.value)[0] || 0) + Number(item.properties.qualities.durable?.value || 0);
    let damage = Number(item.damageToItem?.value || 0)
    let price = this._getPriceInD(item);

    return {
      uuid: item.uuid,
      name: item.name,
      damaged: damage > 0,
      damage: damage,
      maxDamage: maxDamage,
      price: price
    };
  }

  /**
   * @param {ItemWfrp4e} item
   */
  static checkTrappingDamage(item) {
    let damage = Number(item.damageToItem?.value || 0);
    let maxDamage = Number(item.properties.qualities.durable?.value || 0);
    let price = this._getPriceInD(item);

    return {
      uuid: item.uuid,
      name: item.name,
      damaged: damage > 0,
      damage: damage,
      maxDamage: maxDamage,
      price: price
    };
  }

  /**
   * @param {ItemWfrp4e} item
   */
  static checkArmourDamage(item) {
    let durable = item.properties.qualities.durable;

    let locationKeys = Object.keys(item.AP);
    let locations = [];

    for (let i in locationKeys) {
      let location = locationKeys[i];
      let AP = item.AP[location];
      let damage = item.APdamage[location];

      if (AP > 0 && damage > 0) {
        locations.push({name: location, ap: AP, damage: damage});
      }
    }
    let price = this._getPriceInD(item);

    return {
      uuid: item.uuid,
      name: item.name,
      damaged: locations.length > 0,
      locations: locations,
      price: price
    };
  }


  /**
   * @param {ItemWfrp4e[]} items
   */
  static processWeapons(items = []) {
    let html = ``;
    let data = items.map(this.checkWeaponDamage.bind(this));

    for (let i in data) {
      let datum = data[i];
      html += `<h3>${datum.name}</h3>`

      if (!datum.damaged) continue;

      if (datum.damage === datum.maxDamage) {
        html += `<p>Weapon is mangled beyond recognition. It's treated now as an Improvised Weapon and can't normally be repaired.</p>`;
      } else {
        let singleRepairCost = this._getMoneyStringFromD(datum.price * 0.1);
        let repairCost = this._getMoneyStringFromD(datum.price * 0.1 * datum.damage);
        html += `<p>Weapon has received <strong>${datum.damage} points of damage</strong> out of maximum <strong>${datum.maxDamage}</strong> it can sustain.</p>`;
        html += `<p>Repairing this weapon will cost ${singleRepairCost} per damage for a total of <strong>${repairCost}</strong>.</p>`;
      }
    }

    return html;
  }

  /**
   * @param {ItemWfrp4e[]} items
   */
  static processTrappings(items = []) {
    return ``;
  }

  /**
   * @param {ItemWfrp4e[]} items
   */
  static processArmour(items = []) {
    return ``;
  }

  /**
   * @param {ActorWfrp4e} actor
   */
  static checkInventoryForDamage(actor) {
    let armourResult = this.processArmour(actor.itemCategories.armour);
    let weaponResult = this.processWeapons(actor.itemCategories.weapon);
    let trappingResult = this.processTrappings(actor.itemCategories.trapping);

    ChatMessage.create({
      user: game.user._id,
      content: weaponResult
    });
  }
}