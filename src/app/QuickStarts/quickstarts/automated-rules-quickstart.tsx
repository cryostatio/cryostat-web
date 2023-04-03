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
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';

// TODO: Add quickstarts based on the following example:
const AutomatedRulesQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'automated-rules-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
  },
  spec: {
    version: 2.3,
    displayName: 'Automated Rules',
    durationMinutes: 10,
    icon: cryostatLogoIcon,
    description: `Learn about automated rules in [APP] and how to create one.`,
    prerequisites: ['Start a Recording'],
    introduction: `
# Automated Rules
Automated Rules are configurations that instruct [APP] to create JDK Flight Recordings on matching target JVM applications. Each Automated Rule specifies parameters for which Event Template to use, how much data should be kept in the application recording buffer, and how frequently Cryostat should copy the application recording buffer into Cryostat’s own archived storage.

Once you’ve created a rule, [APP] immediately matches it against all existing discovered targets and starts your flight recording. [APP] will also apply the rule to newly discovered targets that match its definition. You can create multiple rules to match different subsets of targets or to layer different recording options for your needs.
In this quick start, you will use [APP] to create an automated rule that will start a recording on an existing target JVM.

### What you'll learn

- How to create an automated rule in [APP]
- How to use match expressions to match one or more target JVMs

### What you'll need

- A running instance of [APP] which has discovered at least one target JVM
- JMX auth credentials for the target JVM (if required)

    `,
    tasks: [
      {
        title: 'Go to the Automated Rules page',
        description: `1. Click the [Automated Rules]{{highlight nav-automatedrules-tab}} tab in the [APP] console navigation bar.`,
        review: {
          instructions: '#### Verify that you see the Automated Rules page.',
          failedTaskHelp:
            'If you do not see the navigation bar, you can click the `☰` button in the [top left corner of the page]{{highlight nav-toggle-btn}}.',
        },
      },
      {
        title: 'Create a new Automated Rule',
        description: `
1. Click the [Create]{{highlight create-rule-btn}} button.
[Read the [About Automated Rules]{{highlight about-rules}} section of the for more information.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you see the Automated Rules creation form.',
          failedTaskHelp: 'If you do not see the creation form, follow the previous steps again.',
        },
      },
      {
        title: 'Fill out the Automated Rule form',
        description: `
The Automated Rule creation form has several fields that you can fill out to create a new rule. Each field has helper text that explains what the field is for.

**The most important field is the [Match Expression]{{highlight rule-matchexpr}} field.** This field is used to match one or more target JVMs. The match expression is a Java-like code snippet that is matched against each target JVM. For example, if you wanted to match all discovered target JVMs, try using the match expression: \`true\`{{copy}}.

[Use the [Match Expression Visualizer]{{highlight match-expr-card}} to test your match expression against the target JVMs that are currently discovered by [APP]. Matched targets will be unfaded in the Graph view, and listed in the List View.]{{admonition tip}}

1. Select a target JVM from the [Target]{{highlight rule-target}} dropdown menu.
2. Enter a [Match Expression]{{highlight rule-matchexpr}} for the rule. Try using the match hint to help you create a match expression.
3. Note the target JVM details code block in the tester. These details can be used in the match expression.

**To create a new rule, you must fill out the following required fields:**
1. Enter a name for the rule in the [Name]{{highlight rule-name}} field.
2. Enter a [Match Expression]{{highlight rule-matchexpr}} for the rule.
3. Select the [Event Template]{{highlight rule-evt-template}} you want to use for the rule.

**The rest of the fields are optional and not required for this quick start: \`[Description, Maximum Size, Maximum Age, Maximum Age, Archival Period, Initial Delay, and Preserved Archives]\`.**

[Learn more about these other Automated Rule attributes in the [Cryostat documentation](https://cryostat.io/guides/#create-an-automated-rule).]{{admonition tip}}

When you are finished, click the [Create]{{highlight rule-create-btn}} button.

`,
        review: {
          instructions: '#### Verify that you see the new rule in the list of rules.',
          failedTaskHelp: `If you do not see the new rule, follow the previous steps again.
                If you cannot create the rule, check that you have entered valid values for each required field.`,
        },
      },
      {
        title: 'Find the recording that was created by the rule',
        description: `
The rule we just created should have created a new recording on the target JVM that we selected. Let's find the recording.
1. Click the [Recordings]{{highlight nav-recordings-tab}} tab in the [APP] console navigation bar.
2. Click the [Target]{{highlight recordings-target}} dropdown menu and select the target JVM that you used to create the rule, if not already selected.

There should now be a new recording in the list of recordings started on the selected target JVM. 

This recording was created by the rule that we just created and should have a name that matches the name of the rule like \`auto_<rule-name>\`. 

[If you set any other attributes on the rule, you should see those attributes reflected in the recording.]{{admonition note}}
`,
        review: {
          instructions:
            '#### Verify that you see the new recording with the correct Automated Rule recording naming scheme in the list of recordings.',
          failedTaskHelp:
            'If you do not see the new recording, try verifying that your rule match expression correctly matches the target JVM. Also make sure that the rule is enabled, and that the target JVM is still running, and selected in the Target dropdown menu.',
        },
      },
    ],
    conclusion: `
<div>
    <p>You completed the <strong>Automated Rules</strong> quick start!</p>
    <div style="max-width: 350px">
        <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogo}" alt="Cryostat Logo" width="100%" height="100%" />
    </div>
    <p>For more information about the <strong>Automated Rules</strong> feature, read our guides on the <a href="${build.automatedRulesGuideUrl}" target="_blank">Cryostat documentation</a>.</p>
</div>`,
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default AutomatedRulesQuickStart;
