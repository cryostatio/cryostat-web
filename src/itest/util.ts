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

const DEFAULT_FIND_ELEMENT_TIMEOUT = 5000;

export function getElementByXPath(driver: WebDriver, xpath: string) {
  return driver.wait(until.elementLocated(By.xpath(xpath)));
}

export function getElementByCSS(driver: WebDriver, cssSelector: string) {
  return driver.wait(until.elementLocated(By.css(cssSelector)));
}

export function getElementById(driver: WebDriver, id: string): WebElementPromise {
  return driver.wait(until.elementLocated(By.id(id)));
}

export function getElementByLinkText(driver: WebDriver, linkText: string) {
  return driver.wait(until.elementLocated(By.linkText(linkText)));
}

export function getElementByAttribute(driver: WebDriver, attribute: string, value: string) {
  return driver.wait(until.elementLocated(By.xpath(`//*[@${attribute}='${value}']`)));
}

export async function setupDriver(): Promise<WebDriver> {
  const headless = process.env.HEADLESS_BROWSER === 'true';
  const options = new firefox.Options();
  if (headless) {
    options.addArguments('--headless=true');
  }
  options.setAcceptInsecureCerts(true);
  options.addArguments('--width=1920', '--height=1080');
  const driver = new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
  await driver.manage().setTimeouts({
    implicit: DEFAULT_FIND_ELEMENT_TIMEOUT,
  });
  return driver;
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

  async navigateToRecordings(): Promise<Recordings> {
    await this.driver.get('http://localhost:9091/recordings');
    return new Recordings(this.driver);
  }

  async selectFakeTarget() {
    const targetName = 'Fake Target';
    const targetSelect = await this.driver.wait(until.elementLocated(By.css(`[aria-label="Select Target"]`)));
    await targetSelect.click();
    const targetOption = await this.driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${targetName}')]`)),
    );
    await targetOption.click();
  }

  async skipTour() {
    const skipButton = await this.driver
      .wait(until.elementLocated(By.css('button[data-action="skip"]')))
      .catch(() => null);
    if (skipButton) await skipButton.click();
  }

  async closeNotificationAlerts(): Promise<void> {
    const notiBadge = await this.driver.wait(until.elementLocated(By.id('notification-badge')));

    // Toggle to open/close
    await notiBadge.click();
    return await notiBadge.click();
  }

  async getLatestNotification(): Promise<ITestNotification> {
    const latestNotification = await this.driver.wait(
      until.elementLocated(By.className('pf-v5-c-alert-group pf-m-toast')),
    );
    return {
      title: await getDirectTextContent(
        this.driver,
        await latestNotification.findElement(By.css('li:last-of-type .pf-v5-c-alert__title')),
      ),
      description: await latestNotification
        .findElement(By.css('li:last-of-type .pf-v5-c-alert__description'))
        .getText(),
    };
  }
}

// from here: https://stackoverflow.com/a/19040341/22316240
async function getDirectTextContent(driver: WebDriver, el: WebElement): Promise<string> {
  return driver.executeScript<string>(
    `
    const parent = arguments[0];
    let child = parent.firstChild;
    let ret = "";
    while (child) {
        if (child.nodeType === Node.TEXT_NODE) {
            ret += child.textContent;
        }
        child = child.nextSibling;
    }
    return ret;
  `,
    el,
  );
}

interface ITestNotification {
  title: string;
  description: string;
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

    const newLayoutButton = await getElementByXPath(this.driver, '//button[contains(.,"New layout")]');
    await newLayoutButton.click();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getCards()).length == 0;
  }

  async getCards(): Promise<WebElement[]> {
    return await this.driver.findElements(By.className('dashboard-card'));
  }

  async addCard(cardType: CardType) {
    const addCardButton = await getElementById(this.driver, 'dashboard-add-btn');
    // Can't use click() directly because the button is wrapped by a Tooltip
    const actions = this.driver.actions();
    await actions.move({ origin: addCardButton }).click().perform();
    const twoPartCards = [CardType.AUTOMATED_ANALYSIS, CardType.JFR_METRICS_CHART, CardType.MBEAN_METRICS_CHART];

    switch (cardType) {
      case CardType.AUTOMATED_ANALYSIS: {
        const aaCard = await getElementById(this.driver, `AutomatedAnalysisCard.CARD_TITLE`);
        await aaCard.click();
        break;
      }
      case CardType.JFR_METRICS_CHART:
        break;
      case CardType.TARGET_JVM_DETAILS: {
        const detailsCard = await getElementById(this.driver, `JvmDetailsCard.CARD_TITLE`);
        await detailsCard.click();
        break;
      }
      case CardType.MBEAN_METRICS_CHART: {
        const mbeanCard = await getElementById(this.driver, `CHART_CARD.MBEAN_METRICS_CARD_TITLE`);
        await mbeanCard.click();
        break;
      }
    }
    const finishButton = await getElementById(this.driver, 'card-props-config-next');
    await finishButton.click();
    if (twoPartCards.includes(cardType)) {
      await finishButton.click();
    }
  }

  async removeCard() {
    const el: WebElement[] = await this.getCards();
    let firstCard;
    if (el.length > 0) {
      firstCard = el[0];
      await firstCard.click();
    } else {
      return;
    }

    const actionsButton = await getElementByCSS(this.driver, 'button[aria-label="dashboard action toggle"]');
    await actionsButton.click();

    const removeButton = await getElementByXPath(this.driver, "//li[contains(.,'Remove')]");
    await removeButton.click();
  }
}

export class Recordings {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async createRecording(name: string) {
    const createButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-create-btn');
    await createButton.click();

    // Enter recording name
    const recordingNameInput = await getElementById(this.driver, 'recording-name');
    await recordingNameInput.sendKeys(name);

    // Select template
    await getElementById(this.driver, 'recording-template').sendKeys('Demo Template');

    const submitButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'crf-create-btn');
    await submitButton.click();
  }

  async getRecordings(): Promise<WebElement[]> {
    const tableXPath = "//div[@class='recording-table--inner-container pf-v5-c-scroll-inner-wrapper']";
    return this.driver.findElements(By.xpath(`${tableXPath}//tbody`));
  }

  async getRecordingState(recording: WebElement): Promise<string> {
    return recording.findElement(By.xpath(`.//td[@data-label='State']`)).getText();
  }

  async stopRecording(recording: WebElement) {
    await recording.findElement(By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`)).click();
    await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-stop-btn').click();
  }

  async archiveRecording(recording: WebElement) {
    await recording.findElement(By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`)).click();
    await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-archive-btn').click();
  }

  async deleteRecording(recording: WebElement) {
    await recording.findElement(By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`)).click();
    await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-delete-btn').click();
    // confirm prompt
    await getElementByXPath(this.driver, `//div[@id='portal-root']//button[contains(text(),'Delete')]`).click();
  }

  // async addLabel(recording: WebElement, k: string, v: string) {
  //   await recording.findElement(By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`)).click();
  // }

  // async removeAllLabels(recording: WebElement) {
  //   await recording.findElement(By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`)).click();
  // }
}

// utility function for integration test debugging
export const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

export enum CardType {
  TARGET_JVM_DETAILS,
  AUTOMATED_ANALYSIS,
  JFR_METRICS_CHART,
  MBEAN_METRICS_CHART,
}
