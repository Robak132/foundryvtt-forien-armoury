import Utility from '../utility/Utility.mjs';
import RingTest from "../tests/RingTest.mjs";


export default class RingDialog extends CastDialog {

  testClass = RingTest;
  chatTemplate = Utility.getTemplate("chat-rolls/ring-card.hbs");

  /**
   * @inheritDoc
   *
   * @param {{}} fields
   * @param {{}} data
   * @param {{}} options
   *
   * @returns {Promise<RingDialog>}
   */
  static async setup(fields = {}, data = {}, options = {}) {
    options.title = options.title || game.i18n.localize("Forien.Armoury.Rings.RingTest") + " - " + data.ring.name;
    options.title += options.appendTitle || "";

    return new Promise((resolve) => {
      let dlg = new this(fields, data, resolve, options);
      dlg.bypass();
    });
  }
  /**
   * @inheritDoc
   *
   * @returns {{}}
   * @protected
   */
  _constructTestData() {
    let data = super._constructTestData();

    data.item = this.data.spell;
    data.ring = this.data.ring;

    return data;
  }
}