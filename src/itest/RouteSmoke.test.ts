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
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { IRouteMeta, routeDefs } from '@app/routeDefs';
import { By, WebDriver, until } from 'selenium-webdriver';
import { Cryostat, setupDriver } from './util';

// Base URL for the running dev server (matches the existing itest convention).
const BASE_URL = process.env.CRYOSTAT_BASE_URL || 'http://localhost:9091';

// Text sentinels that indicate a page failure regardless of route.
const ERROR_BOUNDARY_TEXT = 'Something went wrong';
const NOT_FOUND_TEXT = "404: We couldn't find that page";

/**
 * Flattens the route metadata tree, propagating the parent's featureLevel
 * down to children that do not declare their own.  This ensures that child
 * routes of a BETA parent (e.g. /async-profiler/create) are correctly
 * classified as BETA rather than PRODUCTION.
 */
function flattenWithInheritedLevel(defs: IRouteMeta[], parentLevel?: FeatureLevel): IRouteMeta[] {
  const result: IRouteMeta[] = [];
  for (const def of defs) {
    const effectiveLevel = def.featureLevel ?? parentLevel;
    result.push({ ...def, featureLevel: effectiveLevel });
    if (def.children) {
      result.push(...flattenWithInheritedLevel(def.children, effectiveLevel));
    }
  }
  return result;
}

const allMeta = flattenWithInheritedLevel(routeDefs);

// Test routes that are standalone navigation destinations: routes with a label
// (nav-visible) or a description (listed on the NotFound page).  Unlabelled,
// undescribed child routes (e.g. /d-solo, /async-profiler/create) are wizard
// sub-steps not suitable for cold direct navigation.
const navigableRoutes = allMeta.filter((r) => r.label !== undefined || r.description !== undefined);

const productionRoutes = navigableRoutes.filter(
  (r) => r.featureLevel === undefined || r.featureLevel >= FeatureLevel.PRODUCTION,
);
const betaRoutes = navigableRoutes.filter(
  (r) => r.featureLevel !== undefined && r.featureLevel < FeatureLevel.PRODUCTION,
);

// The PatternFly Page component renders its children inside an element with
// this id.  Waiting for it signals that the app shell and route component have
// both mounted.
const MAIN_CONTAINER_ID = 'primary-app-container';

/**
 * Navigates to the given path and asserts:
 * 1. The error boundary fallback is NOT rendered.
 * 2. The 404/NotFound page is NOT rendered.
 */
async function smokeTestRoute(driver: WebDriver, path: string): Promise<void> {
  await driver.get(`${BASE_URL}${path}`);

  // Wait until the main page container is present — this indicates the app
  // shell and the route component have mounted.  Falls back to a 10s timeout
  // so the test fails fast rather than hanging indefinitely.
  await driver.wait(until.elementLocated(By.id(MAIN_CONTAINER_ID)), 10000);

  const pageSource = await driver.getPageSource();

  assert.ok(
    !pageSource.includes(NOT_FOUND_TEXT),
    `Route "${path}" rendered the 404 Not Found page ("${NOT_FOUND_TEXT}").`,
  );
  assert.ok(
    !pageSource.includes(ERROR_BOUNDARY_TEXT),
    `Route "${path}" rendered the error boundary fallback ("${ERROR_BOUNDARY_TEXT}").`,
  );
}

describe('Route smoke test: unknown route', function () {
  let driver: WebDriver;
  jest.setTimeout(30000);

  beforeAll(async function () {
    Cryostat.resetInstance();
    driver = await setupDriver();
    const cryostat = Cryostat.getInstance(driver);
    await driver.get(BASE_URL);
    await cryostat.skipTour();
  });

  afterAll(async function () {
    await driver.close();
  });

  it('renders the NotFound page for an unregistered path', async function () {
    await driver.get(`${BASE_URL}/this-does-not-exist`);
    await driver.wait(until.elementLocated(By.id(MAIN_CONTAINER_ID)), 10000);
    const pageSource = await driver.getPageSource();
    assert.ok(
      pageSource.includes(NOT_FOUND_TEXT),
      `Expected the 404 Not Found page ("${NOT_FOUND_TEXT}") but it was not present.`,
    );
    assert.ok(!pageSource.includes(ERROR_BOUNDARY_TEXT), `Unexpected error boundary fallback on unknown route.`);
  });
});

describe('Route smoke test: PRODUCTION routes', function () {
  let driver: WebDriver;
  jest.setTimeout(120000);

  beforeAll(async function () {
    Cryostat.resetInstance();
    driver = await setupDriver();
    const cryostat = Cryostat.getInstance(driver);
    await driver.get(BASE_URL);
    await cryostat.skipTour();
    await cryostat.selectFakeTarget();
  });

  afterAll(async function () {
    await driver.close();
  });

  for (const { path } of productionRoutes) {
    it(`renders without errors: ${path}`, async function () {
      await smokeTestRoute(driver, path);
    });
  }
});

describe('Route smoke test: BETA routes', function () {
  let driver: WebDriver;
  jest.setTimeout(120000);

  beforeAll(async function () {
    Cryostat.resetInstance();
    driver = await setupDriver();
    const cryostat = Cryostat.getInstance(driver);
    await driver.get(BASE_URL);
    await cryostat.skipTour();
    await cryostat.selectFakeTarget();

    // Enable beta feature level so beta-gated routes render instead of 404.
    await driver.executeScript(`localStorage.setItem('FEATURE_LEVEL', '1');`);
  });

  afterAll(async function () {
    await driver.close();
  });

  for (const { path } of betaRoutes) {
    it(`renders without errors: ${path}`, async function () {
      await smokeTestRoute(driver, path);
    });
  }
});
