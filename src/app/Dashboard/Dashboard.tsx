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
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { CardConfig, dashboardCardConfigFirstRunIntent } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import {
  dashboardCardConfigAddCardIntent,
  dashboardCardConfigDeleteCardIntent,
  dashboardCardConfigResizeCardIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { TargetView } from '@app/TargetView/TargetView';
import { CardActions, CardBody, CardHeader, Grid, GridItem, gridSpans, Text } from '@patternfly/react-core';
import { TFunction } from 'i18next';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Observable, of } from 'rxjs';
import { AddCard } from './AddCard';
import { AutomatedAnalysisCardDescriptor } from './AutomatedAnalysis/AutomatedAnalysisCard';
import { ChartCardDescriptor } from './Charts/ChartCard';
import { ChartContext } from './Charts/ChartContext';
import { ChartController } from './Charts/ChartController';
import { DashboardCard } from './DashboardCard';
import { DashboardCardActionMenu } from './DashboardCardActionMenu';
import { WelcomeCardDescriptor } from './Quickstart/WelcomeCard';

export interface Sized<T> {
  minimum: T;
  default: T;
  maximum: T;
}

export interface DashboardCardSizes {
  span: Sized<gridSpans>;
  height: Sized<number>;
}

export interface DashboardCardDescriptor {
  featureLevel: FeatureLevel;
  title: string;
  cardSizes: DashboardCardSizes;
  description: string;
  descriptionFull: JSX.Element | string;
  component: React.FC<any>;
  propControls: PropControl[];
  advancedConfig?: JSX.Element;
}

export interface PropControl {
  name: string;
  key: string;
  description: string;
  kind: 'boolean' | 'number' | 'string' | 'text' | 'select';
  values?: any[] | Observable<any>;
  defaultValue: any;
  extras?: any;
}

export interface DashboardProps {}

export interface DashboardCardProps {
  span: number;
  dashboardId: number;
  actions?: JSX.Element[];
}

// TODO remove this
const PLACEHOLDER_CARD_SIZE = {
  span: {
    minimum: 1,
    default: 3,
    maximum: 6,
  },
  height: {
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
} as DashboardCardSizes;

const PlaceholderCard: React.FunctionComponent<
  {
    title: string;
    message: string;
    count: number;
    toggleswitch: boolean;
    menu: string;
    asyncmenu: string;
    asyncmenu2: string;
  } & DashboardCardProps
> = (props) => {
  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={PLACEHOLDER_CARD_SIZE}
      cardHeader={
        <CardHeader>
          <CardActions>{...props.actions || []}</CardActions>
        </CardHeader>
      }
    >
      <CardBody>
        <Text>title: {props.title}</Text>
        <Text>message: {props.message}</Text>
        <Text>count: {props.count}</Text>
        <Text>toggle: {String(props.toggleswitch)}</Text>
        <Text>menu: {props.menu}</Text>
        <Text>asyncmenu: {props.asyncmenu}</Text>
        <Text>asyncmenus: {props.asyncmenu2}</Text>
      </CardBody>
    </DashboardCard>
  );
};

export const NonePlaceholderCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.DEVELOPMENT,
  title: 'NonePlaceholderCard.CARD_TITLE',
  cardSizes: PLACEHOLDER_CARD_SIZE,
  description: 'NonePlaceholderCard.CARD_DESCRIPTION',
  descriptionFull: 'NonePlaceholderCard.CARD_DESCRIPTION_FULL',
  component: PlaceholderCard,
  propControls: [],
} as DashboardCardDescriptor;

export const AllPlaceholderCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.DEVELOPMENT,
  title: 'AllPlaceholderCard.CARD_TITLE',
  cardSizes: PLACEHOLDER_CARD_SIZE,
  description: 'AllPlaceholderCard.CARD_DESCRIPTION',
  descriptionFull: 'AllPlaceholderCard.CARD_DESCRIPTION_FULL',
  component: PlaceholderCard,
  propControls: [
    {
      name: 'string',
      key: 'title',
      defaultValue: 'a short text',
      description: 'a string input',
      kind: 'string',
    },
    {
      name: 'text',
      key: 'message',
      defaultValue: 'a long text',
      description: 'a text input',
      kind: 'text',
    },
    {
      name: 'menu select',
      key: 'menu',
      values: ['choices', 'options'],
      defaultValue: '',
      description: 'a selection menu',
      kind: 'select',
    },
    {
      name: 'menu select 2',
      key: 'asyncmenu',
      values: new Observable((subscriber) => {
        let count = 0;
        const id = setInterval(() => {
          if (count > 2) {
            clearInterval(id);
            setTimeout(() => subscriber.error('Timed Out'), 5000);
          }
          subscriber.next(`async ${count++}`);
        }, 1000);
      }),
      defaultValue: '',
      description: 'an async stream selection menu',
      kind: 'select',
    },
    {
      name: 'menu select 3',
      key: 'asyncmenu2',
      values: of(['arr1', 'arr2', 'arr3']),
      defaultValue: '',
      description: 'an async array selection menu',
      kind: 'select',
    },
    {
      name: 'a switch',
      key: 'toggleswitch',
      defaultValue: false,
      description: 'a boolean input',
      kind: 'boolean',
    },
    {
      name: 'numeric spinner input',
      key: 'count',
      defaultValue: 5,
      description: 'a number input',
      kind: 'number',
    },
  ],
  advancedConfig: <Text>This is an advanced configuration component</Text>,
} as DashboardCardDescriptor;

export const getDashboardCards: (featureLevel?: FeatureLevel) => DashboardCardDescriptor[] = (
  featureLevel = FeatureLevel.DEVELOPMENT
) => {
  const cards = [
    AutomatedAnalysisCardDescriptor,
    ChartCardDescriptor,
    NonePlaceholderCardDescriptor,
    AllPlaceholderCardDescriptor,
    WelcomeCardDescriptor,
  ];
  return cards.filter((card) => card.featureLevel >= featureLevel);
};

export function hasConfigByName(name: string): boolean {
  for (const choice of getDashboardCards()) {
    if (choice.component.name === name) {
      return true;
    }
  }
  return false;
}

export function getConfigByName(name: string): DashboardCardDescriptor {
  for (const choice of getDashboardCards()) {
    if (choice.component.name === name) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${name}`);
}

export function hasConfigByTitle(title: string, t: TFunction): boolean {
  for (const choice of getDashboardCards()) {
    if (t(choice.title) === title) {
      return true;
    }
  }
  return false;
}

export function getConfigByTitle(title: string, t: TFunction): DashboardCardDescriptor {
  for (const choice of getDashboardCards()) {
    if (t(choice.title) === title) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${title}`);
}

export const Dashboard: React.FC<DashboardProps> = (_) => {
  const serviceContext = React.useContext(ServiceContext);
  const dispatch = useDispatch<StateDispatch>();
  const cardConfigs: CardConfig[] = useSelector((state: RootState) => state.dashboardConfigs.list);
  const { t } = useTranslation();
  const chartController = React.useRef(
    new ChartController(
      serviceContext.api,
      serviceContext.target,
      serviceContext.notificationChannel,
      serviceContext.settings
    )
  );

  React.useEffect(() => {
    const currentVersion = serviceContext.settings.dashboardSlicerVersion();
    if (currentVersion == undefined) {
      dispatch(dashboardCardConfigFirstRunIntent());
    }
  }, [dispatch, serviceContext.settings]);

  const chartContext = React.useMemo(() => {
    return {
      controller: chartController.current,
    };
  }, [chartController]);

  React.useEffect(() => {
    const controller = chartController.current;
    return () => {
      controller._tearDown();
    };
  }, []);

  const handleRemove = React.useCallback(
    (idx: number) => {
      dispatch(dashboardCardConfigDeleteCardIntent(idx));
    },
    [dispatch]
  );

  const handleResetSize = React.useCallback(
    (idx: number) => {
      const defaultSpan = getConfigByName(cardConfigs[idx].name).cardSizes.span.default;
      if (defaultSpan === cardConfigs[idx].span) {
        return;
      }
      dispatch(dashboardCardConfigResizeCardIntent(idx, defaultSpan));
    },
    [dispatch, cardConfigs]
  );

  return (
    <TargetView pageTitle={t('Dashboard.PAGE_TITLE')} compactSelect={false}>
      <ChartContext.Provider value={chartContext}>
        <Grid id={'dashboard-grid'} hasGutter>
          {cardConfigs
            .filter((cfg) => hasConfigByName(cfg.name))
            .map((cfg, idx) => (
              <FeatureFlag level={getConfigByName(cfg.name).featureLevel} key={`${cfg.id}-wrapper`}>
                <GridItem span={cfg.span} key={cfg.id} order={{ default: idx.toString() }}>
                  {React.createElement(getConfigByName(cfg.name).component, {
                    span: cfg.span,
                    ...cfg.props,
                    dashboardId: idx,
                    actions: [
                      <DashboardCardActionMenu
                        key={`${cfg.name}-actions`}
                        onRemove={() => handleRemove(idx)}
                        onResetSize={() => handleResetSize(idx)}
                      />,
                    ],
                  })}
                </GridItem>
              </FeatureFlag>
            ))}
          <GridItem key={cardConfigs.length} order={{ default: cardConfigs.length.toString() }}>
            <AddCard />
          </GridItem>
        </Grid>
      </ChartContext.Provider>
    </TargetView>
  );
};

export default Dashboard;
