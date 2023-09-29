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
import { RecordingState } from '@app/Shared/Services/api.types';
import { WebDriver } from 'selenium-webdriver';
import { Cryostat, Recordings, setupDriver, sleep } from './util';

describe('Recording workflow steps', function () {
  let driver: WebDriver;
  let recordings: Recordings;
  let cryostat: Cryostat;
  jest.setTimeout(60000);

  beforeAll(async function () {
    driver = await setupDriver();
    cryostat = Cryostat.getInstance(driver);
    recordings = await cryostat.navigateToRecordings();

    await cryostat.skipTour();
    await cryostat.selectFakeTarget();
  });

  afterAll(async function () {
    await driver.close();
  });

  it('shows correct route', async function () {
    const url = await driver.getCurrentUrl();
    const route = url.split('/').pop();
    assert.equal('recordings', route);
  });

  it('creates a new recording', async function () {
    assert.equal((await recordings.getRecordings()).length, 0);
    await recordings.createRecording('helloWorld');
    const active = await recordings.getRecordings();
    assert.equal(active.length, 1);

    const state = await recordings.getRecordingState(active[0]);
    assert.equal(state, RecordingState.RUNNING);
  });

  it('stops a recording', async function () {
    const active = await recordings.getRecordings();
    assert.equal(active.length, 1);

    await recordings.stopRecording(active[0]);

    const state = await recordings.getRecordingState(active[0]);
    assert.equal(state, RecordingState.STOPPED);
  });

  it('archives a new recording', async function () {
    const active = await recordings.getRecordings();
    assert.equal(active.length, 1);

    await recordings.archiveRecording(active[0]);
    const notif = await cryostat.getLatestNotification();

    assert.equal(notif.title, 'Recording Saved');
    assert.ok(notif.description.includes('helloWorld'));
  });

  it('deletes a recording', async function () {
    const active = await recordings.getRecordings();
    assert.equal(active.length, 1);

    await recordings.deleteRecording(active[0]);
    await sleep(10000);
    assert.equal((await recordings.getRecordings()).length, 0);
  });

  // TODO: checking UI for download, report generation, label editing
});
