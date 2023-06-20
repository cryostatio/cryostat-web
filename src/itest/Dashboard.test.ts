/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { By, Builder, WebDriver, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';
import assert from 'assert';
import { getElementByCSS, getElementById, getElementByLinkText, getElementByXPath, selectFakeTarget } from './util';

describe('Dashboard route functionalities', function () {
  let driver: WebDriver;
  let options = new firefox.Options();
  options.setAcceptInsecureCerts(true);
  let builder = new Builder().forBrowser('firefox').setFirefoxOptions(options);
  jest.setTimeout(30000);

  beforeAll(async function () {
    driver = await builder.build();
    await driver.get('http://localhost:9091');

    const skipButton = await driver.wait(until.elementLocated(By.css('button[data-action="skip"]')), 1000).catch(() => {
      return null;
    });
    if (skipButton) await skipButton.click();

    await selectFakeTarget(driver);
  });

  afterAll(async function ()  {
    await driver.quit();
  });

  it('shows correct route', async function () {
    let url = await driver.getCurrentUrl();
    let route = url.split('/').pop();
    assert.equal('', route);
  });

  it('adds a new layout', async function () {
    const layoutSelector = await getElementById(driver, 'dashboard-layout-dropdown-toggle');
    await layoutSelector.click();

    const newLayoutButton = await getElementByXPath(driver, '//button[contains(.,"New Layout")]');
    await newLayoutButton.click();

    let emptyState = await getElementByCSS(driver, `.pf-c-empty-state__content`);
    expect(emptyState).toBeTruthy();
  });

  it('adds three different cards', async function () {
    let finishButton;
    let addCardButton = await getElementByCSS(driver, `[aria-label="Add card"]`);
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
    let firstCard = await driver.findElement(By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`));
    let actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    let removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    firstCard = await driver.findElement(By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`));
    actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    firstCard = await driver.findElement(By.xpath(`//div[contains(@class, 'pf-l-grid__item')][@style='--pf-l-grid--item--Order: 0;']`));
    actionsButton = await firstCard.findElement(By.css('button[aria-label="Actions"]'));
    await actionsButton.click();

    removeButton = await getElementByLinkText(driver, 'Remove');
    await removeButton.click();

    // check all cards are removed
    let emptyState = await getElementByCSS(driver, `.pf-c-empty-state__content`);
    expect(emptyState).toBeTruthy();
  });
});
