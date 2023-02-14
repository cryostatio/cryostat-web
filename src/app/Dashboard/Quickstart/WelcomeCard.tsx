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
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import {
  AllQuickStartStates,
  QuickStart,
  QuickStartCatalog,
  QuickStartCatalogPage,
  QuickStartContainer,
  useLocalStorage,
} from '@patternfly/quickstarts';
import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListTerm,
  Text,
  TextContent,
  TextList,
  TextListItem,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import { allQuickStarts as exampleQuickStarts } from './all-quickstarts';

export interface WelcomeCardProps extends DashboardCardProps {}

const WelcomeCard: React.FunctionComponent<WelcomeCardProps> = (props) => {
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});
  const language = localStorage.getItem('bridge/language') || 'en';

  // eslint-disable-next-line no-console
  React.useEffect(() => console.log(activeQuickStartID), [activeQuickStartID]);
  React.useEffect(() => {
    // callback on state change
    // eslint-disable-next-line no-console
    console.log(allQuickStartStates);
  }, [allQuickStartStates]);

  const [loading, setLoading] = React.useState(true);
  const [quickStarts, setQuickStarts] = React.useState<QuickStart[]>([]);
  React.useEffect(() => {
    const load = async () => {
      setQuickStarts(exampleQuickStarts);
      setLoading(false);
    };
    setTimeout(() => {
      load();
    }, 500);
  }, []);

  const drawerProps = {
    quickStarts,
    activeQuickStartID,
    allQuickStartStates,
    setActiveQuickStartID,
    setAllQuickStartStates,
    language,
    loading,
    alwaysShowTaskReview: true,
    markdown: {
      extensions: [
        // variable substitution
        {
          type: 'output',
          filter: function (html) {
            html = html.replace(/\[APPLICATION\]/g, 'Mercury');
            html = html.replace(/\[PRODUCT\]/g, 'Lightning');

            return html;
          },
        },
      ],
    },
  };
  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={WelcomeCardSizes}
      cardHeader={
        <CardHeader>
          <CardTitle component="h2">Welcome Tutorial</CardTitle>
          <CardActions>{...props.actions || []}</CardActions>
        </CardHeader>
      }
    >
      <CardBody>
        <QuickStartContainer {...drawerProps}>
          <QuickStartCatalogPage
            title="Dashboard Quick Starts"
            hint="Quick start tutorials to learn some basic features and configurations for the Cryostat Dashboard."
          />
        </QuickStartContainer>
        {/* TODO: Update when export and import feature is implemented
          <DescriptionList displaySize='lg' columnModifier={{ default: '2Col' }}>
          <Card component="div">
            <DescriptionListTerm>Quick Start</DescriptionListTerm>
            <DescriptionListDescription>This is a quick start tutorial to learn some basic features and configurations for the Cryostat Dashboard.
            </DescriptionListDescription>
          </Card>
          <Card component="div">
            <DescriptionListTerm>Adding/Removing Cards</DescriptionListTerm>
            <DescriptionListDescription>
              Here you can add various Cards to the Dashboard using the "Add Card" card at the bottom of the Dashboard.
              You can also remove Cards by clicking the "Remove Card" button in the kebab menu of the Card header.
            </DescriptionListDescription>
          </Card>
          <Card component="div">
            <DescriptionListTerm>Resizing/Ordering Cards</DescriptionListTerm>
            <DescriptionListDescription>
              You can also customize the layout and order of the Cards by dragging the Card headers around.
              You may also resize cards according to their minimum and maximum sizes by dragging the right side of the Card.
            </DescriptionListDescription>
          </Card>
          <Card component="div">
            <DescriptionListTerm>Import/Export Layouts</DescriptionListTerm>
            <DescriptionListDescription>
              Finally, you can import and export Dashboard layouts and quickly switch between them by clicking the "Import/Export" button in the top right corner.
            </DescriptionListDescription>
          </Card>
        </DescriptionList>
        */}
      </CardBody>
    </DashboardCard>
  );
};

const WelcomeCardSizes = {
  span: {
    minimum: 1,
    default: 12,
    maximum: 12,
  },
  height: {
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
} as DashboardCardSizes;

export const WelcomeCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'Welcome Tutorial',
  cardSizes: WelcomeCardSizes,
  description: 'Cryostat Dashboard quick start tutorial.',
  descriptionFull: 'A quick start tutorial to learn some basic features and configurations for the Cryostat Dashboard.',
  component: WelcomeCard,
  propControls: [],
} as DashboardCardDescriptor;
