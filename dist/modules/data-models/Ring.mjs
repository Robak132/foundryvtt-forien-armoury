import Utility from "../utility/Utility.mjs";
import { settings } from "../constants.mjs";
import RingDialog from "../apps/RingDialog.mjs";

const fields = foundry.data.fields;

/**
 * @extends PhysicalItemModel
 * @mixes PropertiesMixin
 * @category - Documents
 */
export default class RingModel extends PropertiesMixin(PhysicalItemModel) {

  /**
   * @inheritDoc
   *
   * @returns {DataSchema}
   */
  static defineSchema() {
    let schema = super.defineSchema();
    schema.spellUuid = new fields.StringField({blank: true, nullable: true, initial: null});
    schema.worn = new fields.BooleanField()
    return schema;
  }

  get isEquipped() {
    return this.worn
  }

  toggleEquip() {
    return this.parent.update({"system.worn" : !this.isEquipped})
  }

  /**
   *
   * @returns {ItemWfrp4e|{folder:string,img:string,name:string,pack:string,sort:number,type:string,uuid:string,_id:string}}
   */
  get spell() {
    return fromUuidSync(this.spellUuid);
  }

  /**
   * @returns {Promise<ItemWfrp4e|null>}
   */
  async loadSpell() {
    return await fromUuid(this.spellUuid);
  }

  /**
   * @returns {boolean}
   */
  get canUse() {
    return this.quantity.value > 0 && this.worn;
  }

  toggleEquip() {
    return this.parent.update({"system.worn" : !this.isEquipped})
  }

  // *** Creation ***
  /**
   * @inheritDoc
   *
   * @param data
   * @param options
   * @param user
   * @returns {Promise<{}>}
   */
  async preCreateData(data, options, user) {
    const preCreateData = await super.preCreateData(data, options, user);

    if (!data.img || data.img === "icons/svg/item-bag.svg" || data.img === "systems/wfrp4e/icons/blank.png") {
      const match = data.name.match(/(\(\d+\))/i);
      preCreateData.img = "icons/equipment/finger/ring-cabochon-gold-green.webp";

      if (match) {
        const number = match[1];
        preCreateData.name = game.i18n.localize("Forien.Armoury.Rings.NewRingDefaultName") + ` ${number}`;
      }
    }

    if (this.parent.isOwned && this.parent.actor.type !== "character" && this.parent.actor.type !== "vehicle") {
      foundry.utils.setProperty(preCreateData, "system.worn", true);
    }

    if (!preCreateData.system?.encumbrance?.value) {
      foundry.utils.setProperty(preCreateData, 'system.encumbrance.value', Utility.getSetting(settings.scrolls.defaultEncumbrance));
    }

    if (!preCreateData.system?.availability?.value) {
      foundry.utils.setProperty(preCreateData, 'system.availability.value', Utility.getSetting(settings.scrolls.defaultAvailability));
    }

    return preCreateData;
  }

  /**
   * @inheritDoc
   *
   * @param data
   * @param options
   * @param user
   */
  updateChecks(data, options, user) {
    super.updateChecks(data);

    if (data.system?.spellUuid) {
      this.#promptForRingNameChange(options);
    }
  }

  /**
   * @inheritDoc
   *
   * @returns {Promise<void>}
   */
  async #promptForRingNameChange(options = {}) {
    const setting = Utility.getSetting(settings.scrolls.updateName);

    if (!options.skipAsk && setting === settings.scrolls.never) return;

    const spell = await this.loadSpell();
    const ringName = game.i18n.format("Forien.Armoury.Rings.RingOf", {spell: spell.name});
    const updateData = {name: ringName};

    let content = game.i18n.format("Forien.Armoury.Rings.ChangeRingNameContent", updateData);

    if (options.skipAsk || Utility.getSetting(settings.scrolls.replaceDescription)) {
      content += "<br>" + game.i18n.localize("Forien.Armoury.Rings.ChangeRingDescription");
      updateData["system.description.value"] = spell.description.value;
    }

    let agreed = true;

    if (!options.skipAsk && setting === settings.scrolls.ask) {
      agreed = await Dialog.confirm({
        title: 'Forien.Armoury.Rings.ChangeRingNameTitle',
        content
      });
    }

    if (agreed === true)
      this.parent.update(updateData);
  }

  /**
   * @inheritDoc
   *
   * @param htmlOptions
   * @returns {Promise<{}>}
   */
  async expandData(htmlOptions) {
    let data = await super.expandData(htmlOptions);
    if (this.spell) {
      /**
       * @type {ItemWfrp4e}
       */
      let spell = await fromUuid(this.spell.uuid);
      data.properties.push(`<a class="ring-spell-link" data-uuid="${spell.uuid}">${spell.name}</a>`);
      data.properties.push(spell.system.ritual?.value ? game.i18n.localize("ITEM.Ritual") : false);
      data.properties.push(spell.system.magicMissile?.value ? game.i18n.localize("Magic Missile") : false);
      data.properties.push(spell.system.target?.aoe ? game.i18n.localize("AoE") : false);
      data.properties.push(spell.system.range?.vortex ? game.i18n.localize("ITEM.RandomVortex") : false);

      const buttonLabel = game.i18n.format("Forien.Armoury.Rings.CastFromRing", {spell: spell.name});
      data.other.push(`<a class="ring-spell-cast">${buttonLabel}</a>`);
    }

    let itemProperties = this.OriginalQualities.concat(this.OriginalFlaws)
    for (let prop of itemProperties)
      data.properties.push("<a class ='item-property'>" + prop + "</a>")

    data.properties = data.properties.filter(p => !!p);

    return data;
  }


  /**
   * Prepares the Ring Dialog and performs the Ring Test
   *
   * @returns {Promise<RingTest|null>}
   */
  async prepareRingTest(options = {}) {
    /**
     * @type {ActorWfrp4e}
     */
    const actor = this.parent.actor;
    if (!actor) return null;

    if (!this.canUse) {
      Utility.notify(
          game.i18n.format("Forien.Armoury.Rings.ActorCanNotUse", {
            actor: actor.name,
            ring: this.parent.name,
            language: this.language
          }),
          {type: "warning"}
      );

      return null;
    }

    const compendiumSpell = await this.loadSpell();
    const spellData = compendiumSpell.toObject();

    spellData.system.memorized.value = true;
    spellData.system.cn.value = 0;

    const spell = new CONFIG.Item.documentClass(spellData, {parent: actor});
    const dialogData = {
      fields: options.fields || {},
      data: {
        ring: this.parent,
        spell,
        hitLoc: !!spell.system.damage.value,
      },
      options: options || {}
    }

    const test = await actor._setupTest(dialogData, RingDialog)
    return await test.roll()
  }
}
