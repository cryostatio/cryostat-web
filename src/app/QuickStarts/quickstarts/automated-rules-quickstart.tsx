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
import { CEL_SPEC_HREF } from '@app/Rules/utils';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';
import { CryostatIcon, conclusion } from '../quickstart-utils';

const displayName = 'Get started with Automated Rules';

const AutomatedRulesQuickStart: QuickStart = {
  metadata: {
    name: 'automated-rules-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 3,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 5,
    icon: <CryostatIcon />,
    description: `Learn about automated rules in **[APP]** and how to create one.`,
    prerequisites: ['Start a Recording'],
    introduction: `
## Automated Rules
Automated Rules are configurations that instruct [APP] to create JDK Flight Recordings on matching Target JVM applications. Each rule specifies parameters for which Event Template to use, how much data should be kept in the application Recording buffer, and how frequently [APP] should copy the application Recording buffer into [APP]'s own archived storage.

### What you'll learn

- How to create an automated rule in [APP]
- How to use Match Expressions to match one or more target JVMs

### What you'll need

- A running instance of [APP] which has discovered at least one Target JVM
- JMX auth credentials for the Target JVM (if required)

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
To create a new rule, use the Automated Rule creation form to fill in the required fields.

The [Match Expression]{{highlight rule-matchexpr}} field is a <a target="_blank" href="${CEL_SPEC_HREF}">Common Expression Language (CEL)</a> code snippet that is matched against each Target JVM. This allows you to create rules that run on specific target JVMs. For example, you can create a rule that runs on all target JVMs with the Match Expression: \`true\`{{copy}}. You can also match targets more specifically with a Match Expression like \`target.annotations.cryostat['PORT'] == 9091\`{{copy}}, which will match targets that are connected to [APP] on port 9091.


To create a new rule, you must fill out the following required fields:
1. Enter a name for the rule in the [Name]{{highlight rule-name}} field.
2. Enter an expression in the [Match Expression]{{highlight rule-matchexpr}} field. To see an example Match Expression, click the [match hint]{{highlight rule-matchexpr-help}}.
[Use the [Match Expression visualizer]{{highlight match-expr-card}} to test your Match Expression against the target JVMs currently discovered by [APP]. Any matched targets will appear unfaded in the Graph view and will be listed in the List view.]{{admonition tip}}

3. Select an [Event Template]{{highlight rule-evt-template}}.

[There may be no available templates if there are no targets currently matched, or if there is a failure to connect to all matched targets.]{{admonition warning}}

4. Click [Create]{{highlight rule-create-btn}}.

`,
        review: {
          instructions: '#### Verify that you see the new rule in the Automated Rules table.',
          failedTaskHelp: `If you do not see the new rule, follow the previous steps again.
                If you cannot create the rule, check that you have entered valid values for each required field.`,
        },
      },
      {
        title: 'View the generated Recording',
        description: `
The rule that was created will have started a new Recording on any matched target JVMs.
1. In the [APP] console navigation bar, click [Recordings]{{highlight nav-recordings-tab}}.
2. Click the [Target Selector]{{highlight target-select}} dropdown menu and select a Target JVM that was matched from the created automated rule, if not already selected.

There should now be a new Recording in the list of Active Recordings on the selected Target JVM.

The Recording should be named according to the rule-name format, such as \`auto_<rule-name>\`.

[If you set any other attributes on the rule, you should see those attributes reflected in the Recording.]{{admonition note}}
`,
        review: {
          instructions:
            '#### Verify that you see the new Recording with the correct Automated Rule Recording naming scheme in the list of Recordings.',
          failedTaskHelp:
            'If you do not see the new Recording, go back to the Rule Creation form, and try verifying that your rule Match Expression correctly matches the intended target JVMs in this task.',
        },
      },
    ],
    conclusion: conclusion(displayName, 'Automated Rules'),
    type: {
      text: 'Advanced',
      color: 'red',
    },
  },
};

export default AutomatedRulesQuickStart;
