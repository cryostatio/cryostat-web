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
import build from '@app/build.json';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { allQuickStarts } from '@app/QuickStarts/all-quickstarts';
import { SessionState } from '@app/Shared/Services/Login.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  QuickStartContext,
  QuickStartDrawer,
  useLocalStorage,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface GlobalQuickStartDrawerProps {
  children: React.ReactNode;
}

const LINK_LABEL = '[\\d\\w\\s-()$!&]+'; // has extra '&' in matcher
const HIGHLIGHT_ACTIONS = ['highlight']; // use native quickstarts highlight markdown extension
const SELECTOR_ID = `[\\w-&]+`; // has extra '&'

// [linkLabel]{{action id}}
const HIGHLIGHT_REGEXP = new RegExp(`\\[(${LINK_LABEL})]{{(${HIGHLIGHT_ACTIONS.join('|')}) (${SELECTOR_ID})}}`, 'g');

export const GlobalQuickStartDrawer: React.FC<GlobalQuickStartDrawerProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});
  const valuesForQuickStartContext = useValuesForQuickStartContext({
    allQuickStarts,
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
    language: i18n.language,
    markdown: {
      extensions: [
        {
          // taken from patternfly/quickstarts but with extra '&' in regex matcher
          type: 'lang',
          regex: HIGHLIGHT_REGEXP,
          replace: (text: string, linkLabel: string, linkType: string, linkId: string): string => {
            if (!linkLabel || !linkType || !linkId) return text;
            return `<button class="pf-c-button pf-m-inline pf-m-link" data-highlight="${linkId}">${linkLabel}</button>`;
          },
        },
        {
          // replace [APP] with bolded productName like <strong>Cryostat</strong>
          type: 'output',
          regex: new RegExp(`\\[APP\\]`, 'g'),
          replace: (_text: string): string => {
            return `<strong>${build.productName}</strong>`;
          },
        },
      ],
    },
  });

  React.useEffect(() => {
    addSubscription(
      context.login.getSessionState().subscribe((s) => {
        if (s !== SessionState.USER_SESSION) {
          setActiveQuickStartID('');
        }
      })
    );
  }, [addSubscription, context.login, setActiveQuickStartID]);

  return (
    <React.Suspense fallback={<LoadingView />}>
      <QuickStartContext.Provider value={valuesForQuickStartContext}>
        <QuickStartDrawer>{children}</QuickStartDrawer>
      </QuickStartContext.Provider>
    </React.Suspense>
  );
};
