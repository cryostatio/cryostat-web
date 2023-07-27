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
import assert from 'assert';
import { By, WebDriver, until } from 'selenium-webdriver';
import {
  getElementByCSS,
  getElementById,
  getElementByLinkText,
  getElementByXPath,
  selectFakeTarget,
  setupBuilder,
} from './util';

describe('Dashboard route functionalities', function () {
  let driver: WebDriver;
  jest.setTimeout(30000);

  beforeAll(async function () {
    driver = await setupBuilder().build();
    await driver.get('http://localhost:9091');

    const skipButton = await driver
      .wait(until.elementLocated(By.css('button[data-action="skip"]')), 1000)
      .catch(() => null);
    if (skipButton) await skipButton.click();

    await selectFakeTarget(driver);
  });

  afterAll(async function () {
    await driver.quit();
  });

  it('shows correct route', async function () {
    const url = await driver.getCurrentUrl();
    const route = url.split('/').pop();
    assert.equal('', route);
  });

  it('adds a new layout', async function () {
    const layoutSelector = await getElementById(driver, 'dashboard-layout-dropdown-toggle');
    await layoutSelector.click();

    const newLayoutButton = await getElementByXPath(driver, '//button[contains(.,"New Layout")]');
    await newLayoutButton.click();

    const emptyState = await getElementByCSS(driver, `.pf-c-empty-state__content`);
    expect(emptyState).toBeTruthy();
  });

  it('adds three different cards', async function () {
    let finishButton;
    const addCardButton = await getElementByCSS(driver, `[aria-label="Add card"]`);
    await addCardButton.click();

    // click TargetJVMDetails card
    const detailsCard = await getElementById(driver, `JvmDetailsCard.CARD_TITLE`);
    await detailsCard.click();

    finishButton = await getElementByCSS(driver, 'button.pf-c-button.pf-m-primary[type="submit"]');
    await finishButton.click();
    await addCardButton.click();

    // click AutomatedAnalysis card
    const aaCard = await driver.findElement(By.id(`AutomatedAnalysisCard.CARD_TITLE`));
    await aaCard.click();

    finishButton = await getElementByCSS(driver, 'button.pf-c-button.pf-m-primary[type="submit"]');
    await finishButton.click(); // next
    await finishButton.click(); // finish

    await addCardButton.click();

    // click MBeanMetrics card
    const mbeanCard = await driver.findElement(By.id(`CHART_CARD.MBEAN_METRICS_CARD_TITLE`));
    await mbeanCard.click();

    finishButton = await getElementByCSS(driver, 'button.pf-c-button.pf-m-primary[type="submit"]');
    await finishButton.click(); // next
    await finishButton.click(); // finish
  });

  it('removes all cards', async function () {
    let firstCard = await driver.findElement(
      By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`)
    );
    let actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    let removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    firstCard = await driver.findElement(
      By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`)
    );
    actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    firstCard = await driver.findElement(
      By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`)
    );
    actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    // check all cards are removed
    const emptyState = await getElementByCSS(driver, `.pf-c-empty-state__content`);
    expect(emptyState).toBeTruthy();
  });
});
