import ForienBaseModule from "../utility/ForienBaseModule.mjs";
import Utility from "../utility/Utility.mjs";
import {dataTypes, settings} from "../constants.mjs";
import RingTest from "../tests/RingTest.mjs";

export default class Rings extends ForienBaseModule {
  templates = {
    magicRings: "partials/actor-sheet-wfrp4e-magic-rings.hbs",
  };

  /**
   * @inheritDoc
   */
  bindHooks() {
    Hooks.on(
      "renderActorSheetWfrp4eCharacter",
      this.#onRenderActorSheet.bind(this),
    );
    Hooks.on("renderActorSheetWfrp4eNPC", this.#onRenderActorSheet.bind(this));
    Hooks.on(
      "wfrp4e:constructInventory",
      this.#onWfrp4eConstructInventory.bind(this),
    );
  }

  /**
   * Add Rings to appropriate Inventory categories
   *
   * @param {ActorSheetWfrp4e} sheet
   * @param {{}} categories
   * @param {{}} collapsed
   */
  #onWfrp4eConstructInventory(sheet, categories, collapsed) {
    const rings = sheet.actor.itemTypes[dataTypes.ring];

    if (Utility.getSetting(settings.scrolls.ownCategory)) {
      categories.rings = {
        label: game.i18n.localize("Forien.Armoury.Rings.MagicRings"),
        items: rings,
        toggle: true,
        toggleName: game.i18n.localize("Equipped"),
        show: true,
        collapsed: collapsed?.rings,
        dataType: dataTypes.ring,
      }
    } else {
      categories.clothingAccessories.items.push(...rings);
    }
  }

  /**
   * Adds rings to Magic tab and registers Ring-specific Event Listeners
   *
   * @param {ActorSheetWfrp4e} sheet
   * @param {jQuery} html
   * @param {{}} _options
   *
   * @returns {Promise<void>}
   */
  async #onRenderActorSheet(sheet, html, _options) {
    const actor = sheet.actor;
    const rings = actor.itemTypes[dataTypes.ring];

    let content = await renderTemplate(
      Utility.getTemplate(this.templates.magicRings),
      {
        rings,
        isOwner: sheet.document.isOwner,
        dataType: dataTypes.ring,
      },
    );
    html.find(".content .tab.magic").append(content);

    // register listeners only if it's the first render of outer application:
    // @todo split into two hooks in Application v2 on Foundry v12
    if (html.hasClass("sheet")) {
      html.on("click", ".ring-spell-link", (event) =>
        this.#onRingSpellLinkClick(event),
      );
      html.on("click", ".ring-spell-cast", (event) =>
        this.#onRingSpellCastClick(sheet, event),
      );
      html.on("mousedown", ".ring-roll", (event) =>
        this.#onRingRollClick(sheet, event),
      );
      html.on("click", ".item-toggle", (event) =>
          this.#onItemToggle(sheet, event),
      );
    }
  }

  #onItemToggle(sheet, event) {
    const id = event.currentTarget.closest(".item").dataset.id;
    const item = sheet.actor.items.get(id);
    if (item.type === "forien-armoury.ring") {
      item.system.worn = !item.system.worn;
      WFRP_Audio.PlayContextAudio({
        item,
        action: "equip",
        outcome: item.system.worn,
      });
      sheet.actor.updateEmbeddedDocuments("Item", [item]);
      sheet.render(true);
    }
  }
  /**
   * When ring is clicked to be used (for example by clicking on "Use Ring" button), prepare the Test.
   *
   * @param {ActorSheetWfrp4e} sheet
   * @param {MouseEvent} event
   *
   * @returns {Promise<RingTest|false>}
   */
  async #onRingSpellCastClick(sheet, event) {
    const id = event.currentTarget.closest(".item").dataset.id;
    const ring = sheet.actor.items.get(id);

    if (!ring) return false;

    return ring.system.prepareRingTest();
  }

  /**
   * When Ring is clicked directly on Magic tab, unveil the Item Summary (on right click) or use the ring
   *
   * @param {ActorSheetWfrp4e} sheet
   * @param {MouseEvent} event
   *
   * @returns {Promise<RingTest|void|false>}
   */
  async #onRingRollClick(sheet, event) {
    event.preventDefault();
    if (event.button === 2) return await sheet._onItemSummary(event);

    return await this.#onRingSpellCastClick(sheet, event);
  }

  /**
   * When Spell's tag is clicked, render the Spell's Sheet
   *
   * @param {MouseEvent} event
   */
  #onRingSpellLinkClick(event) {
    const uuid = event.currentTarget.dataset.uuid;

    fromUuid(uuid).then((item) => item?.sheet.render(true));
  }

  /**
   * @inheritDoc
   */
  applyWfrp4eConfig() {
    foundry.utils.mergeObject(game.wfrp4e.rolls, { RingTest: RingTest });
    return {};
  }
}