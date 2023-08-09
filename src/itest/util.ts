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
import { Builder, By, WebDriver, WebElement, WebElementPromise, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';

export function getElementByXPath(driver: WebDriver, xpath: string) {
  return driver.findElement(By.xpath(xpath));
}

export function getElementByCSS(driver: WebDriver, cssSelector: string) {
  return driver.findElement(By.css(cssSelector));
}

export function getElementById(driver: WebDriver, id: string): WebElementPromise {
  return driver.findElement(By.id(id));
}

export function getElementByLinkText(driver: WebDriver, linkText: string) {
  return driver.findElement(By.linkText(linkText));
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

export class Cryostat {
  private driver: WebDriver;
  private static instance: Cryostat;

  private constructor(driver: WebDriver) {
    this.driver = driver;
  }

  public static getInstance(driver: WebDriver): Cryostat {
    if (!Cryostat.instance) {
      Cryostat.instance = new Cryostat(driver);
    }
    return Cryostat.instance;
  }

  async navigateToDashboard(): Promise<Dashboard> {
    await this.driver.get('http://localhost:9091');
    return new Dashboard(this.driver);
  }

  async selectFakeTarget(driver: WebDriver) {
    const targetName = 'Fake Target';
    const targetSelect = await driver.findElement(By.css(`[aria-label="Options menu"]`));
    await targetSelect.click();
    const targetOption = await driver.findElement(By.xpath(`//*[contains(text(), '${targetName}')]`));
    await targetOption.click();
  }
  
  async skipTour(driver: WebDriver) {
    const skipButton = await driver
    .wait(until.elementLocated(By.css('button[data-action="skip"]')), 1000)
    .catch(() => null);
    if (skipButton) await skipButton.click();
  }
  
}

export class Dashboard {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  getLayoutName(): Promise<string> {
    return getElementById(this.driver, 'dashboard-layout-dropdown-toggle').getText();
  }

  async addLayout() {
    const layoutSelector = await getElementById(this.driver, 'dashboard-layout-dropdown-toggle');
    await layoutSelector.click();

    const newLayoutButton = await getElementByXPath(this.driver, '//button[contains(.,"New Layout")]');
    await newLayoutButton.click();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getCards()).length == 0;
  }

  async getCards(): Promise<WebElement[]> {
   return (await this.driver.findElements(By.className('dashboard-card')));
  }

  async addCard(cardType: CardType) {
    let finishButton;
    const addCardButton = await getElementByCSS(this.driver, `[aria-label="Add card"]`);
    await addCardButton.click();
    const twoPartCards = [CardType.AUTOMATED_ANALYSIS, CardType.JFR_METRICS_CHART, CardType.MBEAN_METRICS_CHART]

    switch(cardType) {
      case CardType.AUTOMATED_ANALYSIS:
        const aaCard = await getElementById(this.driver, `AutomatedAnalysisCard.CARD_TITLE`);
        await aaCard.click();
        break;
      case CardType.JFR_METRICS_CHART:
        break;
      case CardType.TARGET_JVM_DETAILS:
        const detailsCard = await getElementById(this.driver, `JvmDetailsCard.CARD_TITLE`);
        await detailsCard.click();
        break;
      case CardType.MBEAN_METRICS_CHART:
        const mbeanCard = await getElementById(this.driver, `CHART_CARD.MBEAN_METRICS_CARD_TITLE`);
        await mbeanCard.click();
        break;
    }

    finishButton = await getElementByCSS(this.driver, 'button.pf-c-button.pf-m-primary[type="submit"]');
    await finishButton.click();
    if (twoPartCards.includes(cardType)) {
      await finishButton.click();
    }
  }

  async removeCard() {
    let el: WebElement[] = await this.getCards();
    let firstCard;
    if (el.length > 0) {
      firstCard = el[0];
      await firstCard.click();
    } else {
      return;
    }

    let actionsButton = await getElementByCSS(this.driver, 'button[aria-label="Actions"]');
    await actionsButton.click();

    let removeButton = await getElementByLinkText(this.driver, 'Remove');
    await removeButton.click();
  }
}

export enum CardType {
  TARGET_JVM_DETAILS,
  AUTOMATED_ANALYSIS,
  JFR_METRICS_CHART,
  MBEAN_METRICS_CHART
}
