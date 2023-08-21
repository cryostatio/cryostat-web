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
  CardType,
  Cryostat,
  Dashboard,
  getElementByCSS,
  getElementById,
  getElementByLinkText,
  getElementByXPath,
  setupBuilder,
} from './util';

describe('Dashboard route functionalities', function () {
  let driver: WebDriver;
  let dashboard: Dashboard;
  let cryostat: Cryostat;
  jest.setTimeout(60000);

  beforeAll(async function () {
    driver = await setupBuilder().build();
    cryostat = Cryostat.getInstance(driver); 
    dashboard = await cryostat.navigateToDashboard();

    await cryostat.skipTour(driver);
    await cryostat.selectFakeTarget(driver);
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
    await dashboard.addLayout();
    const layoutName = await dashboard.getLayoutName();
    assert.equal(layoutName, 'Custom1');
  });

  it('adds three different cards and removes them', async function () {
    await dashboard.addCard(CardType.TARGET_JVM_DETAILS);
    await dashboard.addCard(CardType.AUTOMATED_ANALYSIS);
    await dashboard.addCard(CardType.MBEAN_METRICS_CHART);

    assert.equal((await dashboard.getCards()).length, 3);
   
    while ((await dashboard.getCards()).length > 0) {
      await dashboard.removeCard();
    }
    
    assert.ok(await dashboard.isEmpty());
  });
});
