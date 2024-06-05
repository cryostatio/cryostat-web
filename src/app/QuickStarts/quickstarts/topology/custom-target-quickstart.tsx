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

import { conclusion, CryostatIcon } from '@app/QuickStarts/quickstart-utils';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';

const CustomTargetQuickstart: QuickStart = {
  metadata: {
    name: 'topology/create-custom-target-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
  },
  spec: {
    version: 2.3,
    displayName: 'Create a Custom Target',
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Don't see your applications? Use Custom Targets to tell Cryostat about them!`,
    introduction: `
## Custom Targets
By default, target JVMs are automatically discovered over remote Java Management Extensions (JMX) by **Cryostat**, using various mechanisms (e.g. **Kubernetes API**, **JDP**).
However, in some cases (e.g. for **Kubernetes API**, JMX port is not <code>9091</code> and port name is not <code>jfr-jmx</code>), Cryostat might not see your applications. Fortunately, you can tell Cryostat about them by specifying **Custom Targets**.

### What you'll learn
- How to test and create a Custom Target definition

### What you'll need

- A Java application that Cryostat cannot automatically discover
- The connection URL and JMX Credentials, if required, for that application
`,
    tasks: [
      {
        title: 'Go to the Topology page',
        description: `1. In the [APP] console navigation bar, click [Topology]{{highlight nav-topology-tab}}.`,
        review: {
          instructions: '#### Verify that you see the Topology page.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Open Custom Target creation form',
        description: `

1. From the toolbar, click on the [catalog icon]{{highlight topology-catalog-btn}}.

      This will open a modal containing the **Topology entity catalog**.

[Alternatively, press <kbd>Ctrl</kbd> + <kbd>Space</kbd> or right click the topology view. This will open a mini catalog for quick access.]{{admonition tip}}

2. Find and select the **Custom Target** option. To aid your search, use the search bar.
3. Click on the **Create** button to open the **Custom Target creation form**.
`,
        review: {
          instructions: '#### Verify that you can open the catalog and select Custom Target.',
          failedTaskHelp: 'If you do not see the Custom Target option, use the search bar to find it.',
        },
      },
      {
        title: 'Fill out the Custom Target form',
        description: `
1. Enter the JMX **Connection URL** for the target into the [Connection URL]{{highlight ct-connecturl-input}} field.
2. Optionally assign an **Alias** to the target by using the [Alias]{{highlight ct-alias-input}} field.
3. If the target has **JMX authentication** enabled, click the [JMX Credential option]{{highlight ct-credential-expand}} to expand the form.
4. Use the [Username]{{highlight ct-username-input}} and [Password]{{highlight ct-password-input}} fields to enter the username and password.
`,
        review: {
          instructions: '#### Verify that you have filled out the form.',
          failedTaskHelp:
            'Click the [JMX Credential option]{{highlight ct-credential-expand}} to expand the form to reveal the username and password fields.',
        },
      },
      {
        title: 'Test the Custom Target definition.',
        description: `
After form is filled, the [sample node]{{highlight ct-sample-testnode}} will be populated with those information.

To test the **Custom Target** definition:

1. Click on the [sample node icon]{{highlight ct-sample-testnode-icon}} to test your Custom Target definition. **Cryostat** will attempt a connection to the target defined by the form data.
2. If the attempt succeeds, a **Checkmark** icon is shown. Otherwise, an **Exclaimation** icon along with an alert banner that describes the error.
3. Re-enter the form and repeat step 1-2 until you have a valid definition.
`,
        review: {
          instructions: '#### Verify that you can test the Custom Target definition.',
          failedTaskHelp: 'You must provide a valid **Connection URL** to enable testing.',
        },
      },
      {
        title: 'Create the Custom Target.',
        description: `
To create the **Custom Target** definition:

1. Click [Create]{{highlight ct-create-btn}}.
2. If the submission is successful, the view will automatically be directed to the **Topology** page. Otherwise, revise your form inputs.
`,
        review: {
          instructions: '#### Verify that you can create the Custom Target and redirected to Topology View.',
          failedTaskHelp: 'Revise your **Custom Target** definition to ensure it is valid.',
        },
      },
      {
        title: 'View the Custom Target.',
        description: `
The **Custom Target** will appear under **Custom Targets Realm**.
[In Graph view, use the toolbar to filter out the **Custom Targets Realm** and the control bar to fit graph into screen, if needed.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you can can see the Custom Target.',
          failedTaskHelp: 'In a clustered graph, use the filter and control bar to adjust the view.',
        },
      },
    ],
    conclusion: conclusion('Create a Custom Target', 'Custom Targets'),
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default CustomTargetQuickstart;
