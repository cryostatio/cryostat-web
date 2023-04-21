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
import cryostatLogoIconDark from '@app/assets/cryostat_icon_rgb_reverse.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { withThemedIcon } from '@app/utils/withThemedIcon';
import { QuickStart } from '@patternfly/quickstarts';
import React from 'react';

const Icon = withThemedIcon(cryostatLogoIcon, cryostatLogoIconDark, 'Cryostat Icon');

const AutomatedRulesQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'automated-rules-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 3,
  },
  spec: {
    version: 2.3,
    displayName: 'Automated Rules',
    durationMinutes: 5,
    icon: <Icon />,
    description: `Learn about automated rules in **[APP]** and how to create one.`,
    prerequisites: ['Start a Recording'],
    introduction: `
## Automated Rules
Automated Rules are configurations that instruct [APP] to create JDK Flight Recordings on matching target JVM applications. Each rule specifies parameters for which Event Template to use, how much data should be kept in the application recording buffer, and how frequently [APP] should copy the application recording buffer into [APP]'s own archived storage.

### What you'll learn

- How to create an automated rule in [APP]
- How to use match expressions to match one or more target JVMs

### What you'll need

- A running instance of [APP] which has discovered at least one target JVM
- JMX auth credentials for the target JVM (if required)

    `,
    tasks: [
      {
        title: 'Create a new Automated Rule',
        description: `
1. In the [APP] console navigation bar, click [Automated Rules]{{highlight nav-automatedrules-tab}}.
2. Click [Create]{{highlight create-rule-btn}}.
        `,
        review: {
          instructions: '#### Verify that you see the Automated Rules creation form.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Fill out the Automated Rule form',
        description: `
To create a new rule, you'll use the Automated Rule creation form which has multiple fields with helpful text to guide you. Each field is labeled to explain its purpose and help you fill out the form correctly.

**The most important field is the [Match Expression]{{highlight rule-matchexpr}} field.** This field is used to match one or more target JVMs. The match expression is a Java-like code snippet that is matched against each target JVM.

[Use the [Match Expression Visualizer]{{highlight match-expr-card}} to test your match expression against the target JVMs currently discovered by [APP]. Any matched targets will appear unfaded in the Graph view and will be listed in the List view.]{{admonition tip}}

**To create a new rule, you must fill out the following required fields:**
1. Enter a name for the rule in the [Name]{{highlight rule-name}} field.
2. Enter a [Match Expression]{{highlight rule-matchexpr}}. Try the [match hint]{{highlight rule-matchexpr-help}} to help you create a match expression or use the expression \`true\`{{copy}}.
3. Select an [Event Template]{{highlight rule-evt-template}}.

The rest of the fields are optional and not required for this quick start: \`Description, Maximum Size, Maximum Age, Maximum Age, Archival Period, Initial Delay, Preserved Archives\`.

[Learn more about these other Automated Rule attributes in the [[APP] documentation](${build.automatedRulesGuideUrl}).]{{admonition tip}}

When you are finished, click [Create]{{highlight rule-create-btn}}.

`,
        review: {
          instructions: '#### Verify that you see the new rule in the Automated Rules table.',
          failedTaskHelp: `If you do not see the new rule, follow the previous steps again.
                If you cannot create the rule, check that you have entered valid values for each required field.`,
        },
      },
      {
        title: 'View the generated recording',
        description: `
The rule that was created will have started a new recording on any matched target JVMs.
1. In the [APP] console navigation bar, click [Recordings]{{highlight nav-recordings-tab}}.
2. Click the [Target Selector]{{highlight target-select}} dropdown menu and select the target JVM that you used to create the rule, if not already selected.

There should now be a new recording in the list of active recordings on the selected target JVM. 

The recording should be named according to the rule-name format, such as \`auto_<rule-name>\`.

[If you set any other attributes on the rule, you should see those attributes reflected in the recording.]{{admonition note}}
`,
        review: {
          instructions:
            '#### Verify that you see the new recording with the correct Automated Rule recording naming scheme in the list of recordings.',
          failedTaskHelp:
            'If you do not see the new recording, go back to the Rule Creation form, and try verifying that your rule match expression correctly matches the target JVM that you selected in this task.',
        },
      },
    ],
    conclusion: `
<div>
    <p>You completed the <strong>Automated Rules</strong> quick start!</p>
    <div style="max-width: 22rem">
        <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogoIcon}" alt="Cryostat Logo" width="100%" height="100%" />
        <p class="cryostat-text">cryostat</p>
        </div>
    <p>For more information about the <strong>Automated Rules</strong> feature, read our guides on the <a href="${build.automatedRulesGuideUrl}" target="_blank">[APP] documentation</a>.</p>
</div>`,
    type: {
      text: 'Advanced',
      color: 'red',
    },
  },
};

export default AutomatedRulesQuickStart;
