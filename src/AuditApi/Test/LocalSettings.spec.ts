import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs";

chai.use(chaiAsPromised);

describe("LocalSettings", function (): void {
  it("should not contain settings that are not in template settings file", function (): void {
    const localSettingsPath = "local.settings.json";
    let localSettingsContent;
    try {
      localSettingsContent = fs.readFileSync(localSettingsPath).toString();
    } catch (e) {
      this.skip();
    }
    const templateSettings = JSON.parse(fs.readFileSync("template.settings.json").toString());
    const localSettings = JSON.parse(localSettingsContent);
    // tslint:disable-next-line: no-unsafe-any
    expect(Object.keys(templateSettings.Values)).to.include.members(Object.keys(localSettings.Values));
  });
});
