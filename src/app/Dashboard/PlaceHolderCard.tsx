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
import { CardActions, CardBody, CardHeader, Text } from '@patternfly/react-core';
import { ResourcesAlmostEmptyIcon, ResourcesFullIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardTypeProps, DashboardCardSizes } from './dashboard-utils';
import { DashboardCard } from './DashboardCard';

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
  } & DashboardCardTypeProps
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
  labels: [
    {
      content: 'Dev',
      color: 'red',
    },
  ],
  propControls: [],
  icon: <ResourcesAlmostEmptyIcon />,
} as DashboardCardDescriptor;

export const AllPlaceholderCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.DEVELOPMENT,
  title: 'AllPlaceholderCard.CARD_TITLE',
  cardSizes: PLACEHOLDER_CARD_SIZE,
  description: 'AllPlaceholderCard.CARD_DESCRIPTION',
  descriptionFull: 'AllPlaceholderCard.CARD_DESCRIPTION_FULL',
  component: PlaceholderCard,
  labels: [
    {
      content: 'Dev',
      color: 'red',
    },
  ],
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
  icon: <ResourcesFullIcon />,
} as DashboardCardDescriptor;
