import { By, WebDriver } from 'selenium-webdriver';



export async function selectFakeTarget(driver: WebDriver) {
  const targetName = "Fake Target";
  const targetSelect = await driver.findElement(By.css(`[aria-label="Options menu"]`));
  await targetSelect.click();
  const targetOption = await driver.findElement(By.xpath(`//*[contains(text(), '${targetName}')]`));
  await targetOption.click();
}


export async function getElementByXPath(driver: WebDriver, xpath: string) {
  const element = await driver.findElement(By.xpath(xpath));
  return element;
}

export async function getElementByCSS(driver: WebDriver, cssSelector: string) {
  const element = await driver.findElement(By.css(cssSelector));
  return element;
}

export async function getElementById(driver: WebDriver, id: string) {
  const element = await driver.findElement(By.id(id));
  return element;
}

export async function getElementByLinkText(driver: WebDriver, linkText: string) {
  const element = await driver.findElement(By.linkText(linkText));
  return element;
}
