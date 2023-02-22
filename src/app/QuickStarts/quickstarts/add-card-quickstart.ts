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
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';
import build from '@app/build.json';
import { QuickStart } from '@patternfly/quickstarts';

export const AddCardQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'add-card-quickstart',
  },
  spec: {
    displayName: 'Adding/Removing Cards',
    durationMinutes: 1,
    icon: cryostatLogo,
    description: `Add and remove cards from the ${build.productName} Dashboard.`,
    introduction: '### This is a sample quickstart.',
    tasks: [
      {
        title: 'Add a Card',
        description: `### We will add a card to the ${build.productName} Dashboard.
1. Go to the bottom of this page, and press the **Add** button on the 'Add Card' card.
2. Select a card type.
3. Press **Finish** to add the card to the dashboard.`,
        review: {
          instructions: `#### To verify the card was added:
1. Notice the new card located on the Dashboard.
                    `,
          failedTaskHelp: 'Try the steps again.',
        },
        summary: {
          success: 'You have successfully added a card.',
          failed: 'Try the steps again.',
        },
      },
      {
        title: 'Remove a Card',
        description: `### We will remove a card to the ${build.productName} Dashboard.
1. Find the card was created in Step 1.
2. Press the kebab on the top right of that card's header.
3. Press **Remove Card**.`,
        summary: {
          success: 'You have successfully removed a card.',
          failed: 'Try the steps again.',
        },
      },
    ],
    prerequisites: ['Complete the **Sample Quickstart** quick start.'],
    conclusion: 'You have completed this quickstart on adding and removing cards.',
  },
};
