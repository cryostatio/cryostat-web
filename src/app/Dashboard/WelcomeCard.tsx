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
import { CardActions, CardBody, CardHeader, CardTitle, Text, TextList, TextListItem } from '@patternfly/react-core';
import React from 'react';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from './Dashboard';
import { DashboardCard } from './DashboardCard';

export interface WelcomeCardProps extends DashboardCardProps {}

const WelcomeCard: React.FunctionComponent<WelcomeCardProps> = (props) => {
  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={WelcomeCardSizes}
      cardHeader={
        <CardHeader>
          <CardTitle component="h4">Dashboard Quick Start</CardTitle>
          <CardActions>{...props.actions || []}</CardActions>
        </CardHeader>
      }
    >
      <CardBody>
        <Text>Welcome to the Cryostat Dashboard!</Text>
        <br />
        <Text>Here are some things you can do here:</Text>
        <TextList>
          <TextListItem>View and manage recordings</TextListItem>
          <TextListItem>View and manage templates</TextListItem>
          <TextListItem>View and manage reports</TextListItem>
          <TextListItem>View and manage targets</TextListItem>
          <TextListItem>View and manage connections</TextListItem>
        </TextList>
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
