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
    options.addArguments('--headless');
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
    const notiBadge = await this.driver.wait(until.elementLocated(By.id('notification-badge')), 10000);

    // Toggle to open/close - use JavaScript clicks to avoid interception
    await this.driver.executeScript('arguments[0].click();', notiBadge);
    await this.driver.sleep(500);
    return await this.driver.executeScript('arguments[0].click();', notiBadge);
  }

  async getLatestNotification(): Promise<ITestNotification> {
    const latestNotification = await this.driver.wait(
      until.elementLocated(By.className('pf-v6-c-alert-group pf-m-toast')),
    );
    return {
      title: await getDirectTextContent(
        this.driver,
        await latestNotification.findElement(By.css('li:last-of-type .pf-v6-c-alert__title')),
      ),
      description: await latestNotification
        .findElement(By.css('li:last-of-type .pf-v6-c-alert__description'))
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
    await this.driver.executeScript('arguments[0].click();', layoutSelector);

    const newLayoutButton = await getElementByXPath(this.driver, '//button[contains(.,"New layout")]');
    await this.driver.executeScript('arguments[0].click();', newLayoutButton);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getCards()).length == 0;
  }

  async getCards(): Promise<WebElement[]> {
    return await this.driver.findElements(By.className('dashboard-card'));
  }

  async addCard(cardType: CardType) {
    const addCardButton = await getElementById(this.driver, 'dashboard-add-btn');
    await this.driver.executeScript('arguments[0].click();', addCardButton);

    const twoPartCards = [CardType.JFR_METRICS_CHART, CardType.MBEAN_METRICS_CHART];

    switch (cardType) {
      case CardType.AUTOMATED_ANALYSIS: {
        const aaCard = await getElementById(this.driver, `AutomatedAnalysisCard.CARD_TITLE-input`);
        await this.driver.executeScript('arguments[0].click();', aaCard);
        break;
      }
      case CardType.JFR_METRICS_CHART: {
        const jfrCard = await getElementById(this.driver, `CHART_CARD.JFR_METRICS_CARD_TITLE-input`);
        await this.driver.executeScript('arguments[0].click();', jfrCard);
        break;
      }
      case CardType.TARGET_JVM_DETAILS: {
        const detailsCard = await getElementById(this.driver, `JvmDetailsCard.CARD_TITLE-input`);
        await this.driver.executeScript('arguments[0].click();', detailsCard);
        break;
      }
      case CardType.MBEAN_METRICS_CHART: {
        const mbeanCard = await getElementById(this.driver, `CHART_CARD.MBEAN_METRICS_CARD_TITLE-input`);
        await this.driver.executeScript('arguments[0].click();', mbeanCard);
        break;
      }
    }

    // Click Next/Finish button until modal closes or we reach max attempts
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      // Check if modal still exists
      const modals = await this.driver.findElements(By.css('.pf-v6-c-modal-box'));
      if (modals.length === 0) {
        break;
      }

      // Find and click the next/finish button
      try {
        const nextButton = await getElementById(this.driver, 'card-props-config-next');
        await this.driver.executeScript('arguments[0].click();', nextButton);
        await this.driver.sleep(1000);
      } catch (e) {
        // Button not found, modal likely closed
        break;
      }
    }

    // Wait for dashboard to update
    await this.driver.sleep(1500);
  }

  async removeCard() {
    const el: WebElement[] = await this.getCards();
    let firstCard;
    if (el.length > 0) {
      firstCard = el[0];
      await this.driver.executeScript('arguments[0].click();', firstCard);
    } else {
      return;
    }

    await this.driver.sleep(500);
    const actionsButton = await getElementByCSS(this.driver, 'button[aria-label="dashboard action toggle"]');
    await this.driver.executeScript('arguments[0].click();', actionsButton);

    await this.driver.sleep(500);
    const removeButton = await getElementByXPath(this.driver, "//li[contains(.,'Remove')]");
    await this.driver.executeScript('arguments[0].click();', removeButton);

    // Wait for card to be removed from dashboard
    await this.driver.sleep(1000);
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

    // Wait for modal to appear
    await this.driver.sleep(1000);

    // Enter recording name
    const recordingNameInput = await getElementById(this.driver, 'recording-name');
    await recordingNameInput.sendKeys(name);

    // Select template by clicking dropdown and selecting option
    const templateSelect = await getElementById(this.driver, 'recording-template');
    await templateSelect.click();
    await this.driver.sleep(500);

    // Try to find and click the "Demo Template" option
    try {
      const demoOption = await this.driver.findElement(By.xpath("//option[contains(text(), 'Demo Template')]"));
      await demoOption.click();
    } catch (e) {
      await templateSelect.sendKeys('Demo Template');
    }

    await this.driver.sleep(1000);

    const submitButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'crf-create-btn');
    await submitButton.click();

    // Wait for modal to close
    await this.driver.sleep(2000);

    // Creating from a modal can update the table asynchronously.
    await this.driver.wait(async () => (await this.getRecordings()).length > 0, 15000);
  }

  async getRecordings(): Promise<WebElement[]> {
    const tableXPath = "//div[contains(@class,'recording-table-inner-container')]";
    return this.driver.findElements(By.xpath(`${tableXPath}//tbody`));
  }

  async getRecordingState(recording: WebElement): Promise<string> {
    return recording.findElement(By.xpath(`.//td[@data-label='State']`)).getText();
  }

  async stopRecording(recording: WebElement) {
    const checkbox = await recording.findElement(
      By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`),
    );
    await this.driver.executeScript('arguments[0].click();', checkbox);

    const stopButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-stop-btn');
    await this.driver.executeScript('arguments[0].click();', stopButton);
  }

  async archiveRecording(recording: WebElement) {
    const checkbox = await recording.findElement(
      By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`),
    );
    await this.driver.executeScript('arguments[0].click();', checkbox);

    const archiveButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-archive-btn');
    await this.driver.executeScript('arguments[0].click();', archiveButton);
  }

  async deleteRecording(recording: WebElement) {
    const checkbox = await recording.findElement(
      By.xpath(`.//input[@data-quickstart-id='active-recordings-checkbox']`),
    );
    await this.driver.executeScript('arguments[0].click();', checkbox);

    const deleteButton = await getElementByAttribute(this.driver, 'data-quickstart-id', 'recordings-delete-btn');
    await this.driver.executeScript('arguments[0].click();', deleteButton);

    // Wait for confirmation dialog to appear
    await this.driver.sleep(1000);

    // Try to find confirmation button - it might be in a modal
    try {
      // Look for any danger/delete button in a modal
      const confirmButton = await this.driver.wait(
        until.elementLocated(
          By.xpath(`//div[contains(@class,'pf-v6-c-modal-box')]//button[contains(@class,'pf-m-danger')]`),
        ),
        3000,
      );
      await this.driver.executeScript('arguments[0].click();', confirmButton);
    } catch (e) {
      // No confirmation dialog found, delete may have happened automatically
    }
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
