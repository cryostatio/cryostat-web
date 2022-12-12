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
import * as React from 'react';
import { Card, CardActions, CardBody, CardHeader, Stack, StackItem, Text } from '@patternfly/react-core';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCardIntent } from '@app/Shared/Redux/DashboardConfigActions';
import { TargetView } from '@app/TargetView/TargetView';
import { AddCard } from './AddCard';
import { DashboardCardActionMenu } from './DashboardCardActionMenu';
import { AutomatedAnalysisCardDescriptor } from './AutomatedAnalysis/AutomatedAnalysisCard';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';

export interface DashboardCardDescriptor {
  title: string;
  description: string;
  descriptionFull: JSX.Element | string;
  component: React.FunctionComponent<any>;
  propControls: PropControl[];
}

export interface PropControl {
  name: string;
  key: string;
  description: string;
  kind: 'boolean' | 'number' | 'string' | 'text';
  defaultValue: any;
}

export interface DashboardProps {}

export interface DashboardCardProps {
  actions?: JSX.Element[];
}

// TODO remove this
const PlaceholderCard: React.FunctionComponent<
  { title: string; message: string; count: number; toggleswitch: boolean } & DashboardCardProps
> = (props) => {
  return (
    <Card isRounded>
      <CardHeader>
        <CardActions>{...props.actions || []}</CardActions>
      </CardHeader>
      <CardBody>
        <Text>title: {props.title}</Text>
        <Text>message: {props.message}</Text>
        <Text>count: {props.count}</Text>
        <Text>toggle: {String(props.toggleswitch)}</Text>
      </CardBody>
    </Card>
  );
};

export const DashboardCards: DashboardCardDescriptor[] = [
  AutomatedAnalysisCardDescriptor,
  {
    title: 'None Placeholder',
    description: 'placeholder',
    descriptionFull: 'This is a do-nothing placeholder with no config',
    component: PlaceholderCard,
    propControls: [],
  },
  {
    title: 'All Placeholder',
    description: 'placeholder',
    descriptionFull: 'This is a do-nothing placeholder with all the config',
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
  },
];

export function getConfigByName(name: string): DashboardCardDescriptor {
  for (const choice of DashboardCards) {
    if (choice.component.name === name) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${name}`);
}

export function getConfigByTitle(title: string): DashboardCardDescriptor {
  for (const choice of DashboardCards) {
    if (choice.title === title) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${title}`);
}

export const Dashboard: React.FunctionComponent<DashboardProps> = (props) => {
  const dispatch = useDispatch<StateDispatch>();
  const cardConfigs = useSelector((state: RootState) => state.dashboardConfigs.list);

  const handleRemove = React.useCallback(
    (idx: number) => {
      dispatch(deleteCardIntent(idx));
    },
    [dispatch, deleteCardIntent]
  );

  return (
    <TargetView pageTitle="Dashboard" compactSelect={false} hideEmptyState>
      <Stack hasGutter>
        {cardConfigs.map((cfg, idx) => (
          <StackItem key={idx}>
            {React.createElement(getConfigByName(cfg.name).component, {
              ...cfg.props,
              actions: [<DashboardCardActionMenu onRemove={() => handleRemove(idx)} />],
            })}
          </StackItem>
        ))}
        <StackItem key={cardConfigs.length}>
          <AddCard />
        </StackItem>
      </Stack>
    </TargetView>
  );
};

export default Dashboard;
