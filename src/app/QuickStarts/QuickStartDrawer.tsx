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
import { allQuickStarts } from '@app/QuickStarts/all-quickstarts';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { SessionState } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useFeatureLevel } from '@app/utils/hooks/useFeatureLevel';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  QuickStartContext,
  QuickStartDrawer,
  useLocalStorage,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

const LINK_LABEL = "[\\d\\w\\s-()$!&']+"; // has extra &' in matcher
const HIGHLIGHT_ACTIONS = ['highlight']; // use native quickstarts highlight markdown extension
const SELECTOR_ID = `[\\w-&]+`; // has extra &'

// [linkLabel]{{action id}}
const HIGHLIGHT_REGEXP = new RegExp(`\\[(${LINK_LABEL})\\]{{(${HIGHLIGHT_ACTIONS.join('|')}) (${SELECTOR_ID})}}`, 'g');
export interface GlobalQuickStartDrawerProps {
  children: React.ReactNode;
}

export const GlobalQuickStartDrawer: React.FC<GlobalQuickStartDrawerProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});

  const activeLevel = useFeatureLevel();

  React.useEffect(() => {
    addSubscription(
      context.login.getSessionState().subscribe((s) => {
        if (s == SessionState.NO_USER_SESSION) {
          setActiveQuickStartID('');
        }
      }),
    );
  }, [addSubscription, context.login, setActiveQuickStartID]);

  const filteredQuickStarts = React.useMemo(() => {
    return allQuickStarts.filter((qs) => qs.metadata.featureLevel >= activeLevel);
  }, [activeLevel]);

  // useValues... hook seems to use first render value of allQuickStarts, so we need to re-render on activeLevel change
  const valuesForQuickStartContext = {
    ...useValuesForQuickStartContext({
      activeQuickStartID,
      setActiveQuickStartID,
      allQuickStartStates,
      setAllQuickStartStates,
      language: i18n.language,
      markdown: {
        extensions: [
          {
            // this only takes into effect if the regex matches the HIGHLIGHT_REGEXP i.e. contains the extra matching tokens the patternfly/quickstarts highlight extension regex does not
            type: 'lang',
            regex: HIGHLIGHT_REGEXP,
            replace: (text: string, linkLabel: string, linkType: string, linkId: string): string => {
              if (!linkLabel || !linkType || !linkId) return text;
              return `<button class="pf-c-button pf-m-inline pf-m-link" data-highlight="${linkId}">${linkLabel}</button>`;
            },
          },
          {
            // replace [APP] with productName like Cryostat
            type: 'output',
            regex: new RegExp(`\\[APP\\]`, 'g'),
            replace: (_text: string): string => {
              return `${build.productName}`;
            },
          },
        ],
      },
    }),
    allQuickStarts: filteredQuickStarts,
  };

  return (
    <React.Suspense fallback={<LoadingView />}>
      <QuickStartContext.Provider value={valuesForQuickStartContext}>
        <QuickStartDrawer>{children}</QuickStartDrawer>
      </QuickStartContext.Provider>
    </React.Suspense>
  );
};
