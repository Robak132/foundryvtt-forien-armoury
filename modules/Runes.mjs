import Utility from "./Utility.mjs";

export default class TemporaryRunes {
  static bindHooks() {
    Hooks.on("updateActiveEffect", this._onEffectUpdate.bind(this));
  }

  static _onEffectUpdate(effect, update, _data) {
    let effectName = effect.name.toLowerCase();

    if (effectName.includes(`rune of`) && effectName.includes(`temporary`) && effect.parent instanceof Actor) {

      if (update.disabled === true) {
        this.processRemovingRune(effect).then(msg => {
          Utility.notify(msg, {permanent: true})
        });
      }
    }
  }

  static async processRemovingRune(effect) {
    let actor = effect.parent;
    let itemUuid = effect.origin;
    /**
     * @type {ActorWfrp4e|null}
     */
    await actor.deleteEmbeddedDocuments("ActiveEffect", [effect._id]);
    /**
     * @type {ItemWfrp4e|null}
     */
    let item = await fromUuid(itemUuid);
    let itemEffect = item.effects.find(e => e.name === effect.name);

    await item.deleteEmbeddedDocuments("ActiveEffect", [itemEffect._id]);

    let itemDamaged = await this.damageFromRune(item, actor);

    return `Removed "${effect.name}" effect from Actor "${actor.name}" and Item "${item.name}". It was Temporary Rune that got disabled. ${itemDamaged}`;
  }

  /**
   * @param {ItemWfrp4e} item
   * @param {ActorWfrp4e} actor
   * @returns {Promise<string|`Armour received 1 Damage on ${string}.`|string>}
   */
  static async damageFromRune(item, actor) {
    switch (item.type) {
      case 'weapon':
        return await this.damageWeapon(item, actor);
      case 'armour':
        return await this.damageArmour(item, actor);
      default:
        return await this.damageTrapping(item, actor);
    }
  }

  /**
   * @param {ItemWfrp4e} item
   * @param {ActorWfrp4e} actor
   * @returns {Promise<string>}
   */
  static async damageWeapon(item, actor) {
    let itemDamaged = ``;

    let itemData = item.toObject();
    let regex = /\d{1,3}/gm;
    let maxDamage = Number(regex.exec(item.damage.value)[0] || 0) + Number(item.properties.qualities.durable?.value || 0) || 999;
    itemData.system.damageToItem.value = Math.min(maxDamage, itemData.system.damageToItem.value + 1);

    itemDamaged += `Weapon received 1 Damage`;

    if (maxDamage === itemData.system.damageToItem.value) {
      itemData.system.equipped = false;
      itemData.name += " (damaged)";
      itemDamaged += ` and got unequipped because of it (it's now considered an Improvised Weapon)`
    }

    itemDamaged += `.`;
    await actor.updateEmbeddedDocuments("Item", [itemData]);

    return itemDamaged;
  }

  /**
   * @param {ItemWfrp4e} item
   * @param {ActorWfrp4e} actor
   * @returns {Promise<`Armour received 1 Damage on ${string}.`|string>}
   */
  static async damageArmour(item, actor) {
    let itemDamaged = ``;

    let durable = item.properties.qualities.durable;
    let armourToDamage = item.toObject();

    let locationKeys = Object.keys(armourToDamage.system.AP);
    let locations = [];

    for (let key in locationKeys) {
      let location = locationKeys[key];
      let AP = armourToDamage.system.AP[location];
      let damage = armourToDamage.system.APdamage[location];

      if (AP > 0 && AP > damage) {
        locations.push(locationKeys[key]);
      }
    }

    if (locations.length === 0) {
      return `Armour couldn't be damaged more.`;
    }

    let location = locations[Math.floor((Math.random() * locations.length))];
    armourToDamage.system.APdamage[location] = Math.min(armourToDamage.system.AP[location] + (Number(durable?.value) || 0), armourToDamage.system.APdamage[location] + 1);

    let locationName = game.i18n.localize(`WFRP4E.Locations.${location}`);
    itemDamaged = `Armour received 1 Damage on ${locationName}.`;

    await actor.updateEmbeddedDocuments("Item", [armourToDamage]);

    return itemDamaged;
  }


  /**
   *
   * @param {ItemWfrp4e} item
   * @param {ActorWfrp4e} actor
   * @returns {Promise<string>}
   */
  static async damageTrapping(item, actor) {
    let itemDamaged = ``;

    let itemData = item.toObject();
    let maxDamage = Number(item.properties.qualities.durable?.value || 0);

    if (itemData.system.damageToItem === undefined) {
      itemData.system.damageToItem = {type: 'Number', value: 0, shield: 0};
    }

    if (maxDamage > 0 && maxDamage > itemData.system.damageToItem.value) {
      itemData.system.damageToItem.value = Math.min(maxDamage, itemData.system.damageToItem.value + 1);

      itemDamaged += `Item received 1 Damage`;
    } else {
      itemDamaged += `Item got Damaged`;
    }

    if (itemData.system.damageToItem.value >= maxDamage) {
      itemData.name += " (damaged)";

      if (itemData.system.worn) {
        itemData.system.worn = false;
        itemDamaged += ` and got unequipped because of it`;
      }
    }

    itemDamaged += `.`;
    await actor.updateEmbeddedDocuments("Item", [itemData]);

    return itemDamaged;
  }
}