/*
 * Copyright The Cryostat Authors.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Builder, By, WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';

export async function selectFakeTarget(driver: WebDriver) {
  const targetName = 'Fake Target';
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

export function setupBuilder(): Builder {
  const headless = process.env.HEADLESS_BROWSER === 'true';
  const options = new firefox.Options();
  if (headless) {
    options.headless();
  }
  options.setAcceptInsecureCerts(true);
  return new Builder().forBrowser('firefox').setFirefoxOptions(options);
}
