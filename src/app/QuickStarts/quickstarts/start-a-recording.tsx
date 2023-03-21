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
import cryostatLogoIcon from '@app/assets/cryostat_icon_rgb_default.svg';
import cryostatLogo from '@app/assets/cryostat_logo_vert_rgb_default.svg';

import { QuickStart } from '@patternfly/quickstarts';
import build from '@app/build.json';

const RecordingQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'sample-quickstart',
  },
  spec: {
    version: 2.3,
    displayName: 'Start a Recording',
    durationMinutes: 10,
    icon: cryostatLogoIcon,
    description: `Learn how to start a recording with Java Flight Recorder (JFR) with **${build.productName}**.`,
    prerequisites: [''],
    introduction: `
# Start a Recording
**Java Flight Recorder (JFR)** is a profiling tool that is built into the JVM. It allows you to record events that happen in the JVM and then analyze the recording to find performance issues.

In this quick start, you will use **${build.productName}** to connect to a target JVM and start a recording of the target JVM's activity. You will then stop and download the recording to your local machine. Finally, you will view an automated analysis report of the recording with **Cryostat**'s capabilities.

### What you'll learn

- How to start/stop a JFR recording on a target JVM
- How to download a recording from **${build.productName}** to your local machine
- How to view an automated analysis report of a recording with **Cryostat**'s capabilities

### What you'll need

- A running instance of **${build.productName}** which has discovered at least one target JVM
- JMX auth credentials for the target JVM (if required)

`,
  tasks: [
    {
      title: 'Go to the Recordings tab',
      description: '1. Press the [Recordings]{{highlight nav-recordings-tab}} tab in the Cryostat console navigation bar.',
      review: {
        instructions: '#### Verify that you have done the task.',
        failedTaskHelp: 'If you do not see the navigation bar, you can click the `☰` button in the [top left corner of the page]{{highlight nav-toggle-btn}}.',
      },
    },
    {
      title: 'Select a target JVM',
      description: `    
Select a target JVM from the list of available targets that Cryostat has discovered.

1. Click the [Target Select]{{highlight target-select}} dropdown menu.
2. Select a target from the list of available targets.

<sub>Note: If JMX Auth username and password is required, you will be prompted to enter them.</sub>`,
    },
    {
      title: 'Start a recording',
      description: `
There are two tabs within the Recordings page: \n
[Active Recordings]{{highlight active-recordings-tab}} and [Archived Recordings]{{highlight archived-recordings-tab}}.\n
Active recordings are recordings that are currently running, and Archived recordings are recordings that have been stopped.

We will start a recording while on the Active tab.

1. Click [Create]{{highlight recordings-create-btn}} to go to the Custom Flight Recording Form.
2. Enter a name for the recording in the [Name]{{highlight crf-name}} field.
3. Select the [Duration]{{highlight crf-duration}} for the recording. You can select CONTINUOUS to record until the recording is stopped.
4. Select the Events to record using the [Event Template]{{highlight template-selector}} selector.
5. Click [Create]{{highlight crf-create-btn}} to start the recording.

After the creation of a recording, the recording will be displayed in the Active Recordings tab. You should be able to see the recording's name, start time, duration, state, and any attached labels.

<sub>Note: You may also attach metadata labels to the recordings under the [Metadata]{{highlight crf-metadata-opt}} options or configure your custom recording further under the [Advanced]{{highlight crf-advanced-opt}} options.</sub>`,
    review: {
      instructions: '#### Verify that you see the recording within the table.',
      failedTaskHelp: 'If you do not see the recording, try the steps again.',
    },      
}, 
    {
      title: 'Stop a recording',
      description: `
Stopping a recording will cut off the recording at the time that the recording is stopped.

1. Click the [Stop]{{highlight recordings-stop-btn}} button to stop the recording.`
    },
    {
      title: 'Download a recording',
      description: `
Downloading a recording will save the recording to your local machine as a JFR file. You can then use JDK Mission Control (JMC) to analyze the recording.
1. Open the kebab menu next to the recording that you want to download.
2. Click the [Download]{{highlight recordings-download-btn}} button to download the recording to your local machine.
3. Choose what to do with the file. Your browser will present you to save the file to your local machine.
      `
    },
    {
      title: 'View an analysis report',
      description: `
1. Click the kebab menu next to the recording that you want to view an analysis report for.
2. Click [View Report]{{highlight recordings-view-analysis-btn}} to view an analysis report of the recording.
`
    },
    {
      title: 'Archive a recording',
      description: `
Archiving a recording will save the recording to Cryostat's archival storage. These recordings will show up in the target JVM's Archived Recordings tab, as well as in the [Archives]{{highlight nav-archives-tab}} view on the Cryostat console navigation bar. move the recording from the Active Recordings tab to the Archived Recordings tab. Archived recordings can be also be downloaded to your local machine.

1. Click the [Archive]{{highlight recordings-archive-btn}} button to archive the recording.
2. Go to the Archived Recordings tab to see the archived recording.

<sub>Note: You can also download and view an analysis report of the archived recording from the Archived Recordings tab.</sub>
`
    },

  ],
    conclusion: `
<div>
  <p>You completed the <strong>Start a Recording</strong> quick start!</p>

  <div style="max-width: 350px">
    <img style="margin-top: 75px; margin-bottom: 75px" src="${cryostatLogo}" alt="Cryostat Logo" width="100%" height="100%" />
  </div>
  <p>Learn more about Cryostat from our guides at <a href="https://cryostat.io/guides/" target="_blank">cryostat.io</a>.</p>
</div>`,
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default RecordingQuickStart;
