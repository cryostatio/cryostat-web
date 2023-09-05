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
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';
import React from 'react';
import { CryostatIcon, conclusion } from '../quickstart-utils';

const displayName = 'Start a Recording';

const RecordingQuickStart: QuickStart = {
  metadata: {
    name: 'start-a-recording-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 1,
  },
  spec: {
    version: 2.3,
    displayName: displayName,
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Learn how to start a recording with Java Flight Recorder (JFR) with **[APP]**.`,
    prerequisites: [''],
    introduction: `
## Start a Recording
**Java Flight Recorder (JFR)** is a profiling tool that is built into the JVM. It allows you to record events that happen in the JVM and then analyze the recording to find performance issues. [APP] leverages JFR to provide a simple way to start, stop, and download recordings from a containerized target JVM.

### What you'll learn

- How to start/stop a JFR recording on a target JVM
- How to download a recording from [APP] to your local machine
- How to view an automated analysis report of a recording with [APP]'s capabilities

### What you'll need

- A running instance of [APP] which has discovered at least one target JVM
- JMX auth credentials for the target JVM (if required)

`,
    tasks: [
      {
        title: 'Go to the Recordings page',
        description: '1. In the [APP] console navigation bar, click [Recordings]{{highlight nav-recordings-tab}}.',
        review: {
          instructions: '#### Verify that you see the Recordings page.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Select a target JVM',
        description: `
Select a target JVM from the list of available targets that [APP] has discovered.

1. Click the [Target Select]{{highlight target-select}} dropdown menu.
2. Select a target from the list of available targets.


[If JMX Auth username and password is required, you will be prompted to enter them.]{{admonition note}}`,
        review: {
          instructions: '#### Verify that you can see the Recordings table.',
          failedTaskHelp: 'If you do not see the table, try the above steps again.',
        },
      },
      {
        title: 'Start a recording',
        description: `
There are two tabs within the Recordings page:

[Active Recordings]{{highlight active-recordings-tab}} and [Archived Recordings]{{highlight archived-recordings-tab}}.

**Active recordings** are recordings that only exist only within the target JVM. **Archived recordings** are recordings that have been saved from the target JVM and copied to [APP]'s storage volume.

To start an active recording:

1. Click [Create]{{highlight recordings-create-btn}} to open the **Custom Flight Recording Form**.
[If you have a smaller viewport, the \`Create\` button may not be immediately visible. In this case, you can click on the kebab button (three vertical dots) to reveal additional options, including \`Create\`."]{{admonition note}}
2. Enter a name for the recording in the [Name]{{highlight crf-name}} field.
3. Select the [Duration]{{highlight crf-duration}} for the recording. You can select \`CONTINUOUS\` to record until the recording is stopped.
4. Select an [Event Template]{{highlight template-selector}} to use for the recording.
5. Click [Create]{{highlight crf-create-btn}}.

After the creation of a recording, the recording will be displayed in the **Active Recordings** tab. You should be able to see the recording's name, start time, duration, state, and any attached labels.

[You may also attach metadata labels to the recordings under the [Metadata]{{highlight crf-metadata-opt}} options or configure your custom recording further under the [Advanced]{{highlight crf-advanced-opt}} options.]{{admonition tip}}`,
        review: {
          instructions: '#### Verify that you see the recording within the table.',
          failedTaskHelp: 'If you do not see the recording, try the above steps again.',
        },
      },
      {
        title: 'Stop a recording',
        description: `
Stopping a recording will cut off the recording at the time that the recording is stopped.

1. Select the [checkbox]{{highlight active-recordings-checkbox}} ☐ next to the recording.
2. Click [Stop]{{highlight recordings-stop-btn}} to stop the recording.`,
        review: {
          instructions: '#### Verify that the STATE field of the recording has changed to STOPPED.',
          failedTaskHelp: 'If you do not see the recording, try the **Start a recording** task again.',
        },
      },
      {
        title: 'Download a recording',
        description: `
Downloading a recording will save the recording to your local machine as a JFR file. You can then use **JDK Mission Control (JMC)** to analyze the recording.
1. Open the [kebab menu]{{highlight recording-kebab}} next to the recording that you want to download.
2. Click \`Download Recording\` to prompt your browser to open a dialog to save the recording to your local machine.
3. Choose what to do with the file.
      `,
        review: {
          instructions: '#### Verify that you have downloaded the recording to your local machine.',
          failedTaskHelp: 'If you do not see the recording, try the **Start a recording** task again.',
        },
      },
      {
        title: 'View an analysis report',
        description: `
[APP] is able to generate an **Automated Analysis Report** using a JFR recording. The **Java Mission Control** rules engine analyzes your recording, looks for common problems, and assigns a severity score from 0 (no problem) to 100 (potentially severe problem) to each problem.
1. Click the [kebab menu]{{highlight recording-kebab}} next to the recording that you want to view an analysis report for.
2. Click \`View Report ...\` to view an analysis report of the recording in a new tab.
3. *Optional:* Right click on the page and select \`Save Page As...\` to download the report HTML file to your local machine.
`,
        review: {
          instructions: '#### Verify that you can see an analysis report of the recording.',
          failedTaskHelp:
            'The kebab `⁝` should be next to the recording row in the active recordings table. Clicking the kebab icon should show a menu with the `View Report ...` option.',
        },
      },
      {
        title: 'Archive a recording',
        description: `
Archiving a recording will save the recording to [APP]'s archival storage, and will persist even after either the target JVM, or [APP], has stopped. These recordings will appear in the target JVM's **Archived Recordings** tab, as well as in the [Archives]{{highlight nav-archives-tab}} view on the [APP] console navigation bar.

1. Click [Archive]{{highlight recordings-archive-btn}} to archive the recording.
2. To view the archived recording in [APP]'s storage, go to the [Archived Recordings]{{highlight archived-recordings-tab}} tab.

[You can download archived recordings and view an analysis report of the archived recording from the [Archived Recordings]{{highlight archived-recordings-tab}} tab, similar to active recordings.]{{admonition tip}}`,
        review: {
          instructions: '#### Verify that the recording has been archived in the **Archived Recordings** tab.',
          failedTaskHelp:
            'The recording name should have been saved in the format `<jvm-alias>_<recording-name>_<timestamp>.jfr`. If you still cannot find the recording, please try the above steps again.',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      'Start a recording',
      `To learn more about [APP]'s extensive features and capabilities, please visit our website at <a href="${build.documentationUrl}" target="_blank">${build.documentationUrl}</a>.`,
    ),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
    nextQuickStart: ['automated-rules-quickstart'],
  },
};

export default RecordingQuickStart;
