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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
import { Card, CardBody, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { TriggersTable } from './Triggers';

export interface CaptureTriggersProps {}

export const CaptureSmartTriggers: React.FC<CaptureTriggersProps> = ({ ...props }) => {
  const cardBody = React.useMemo(
    () => (
      <Stack hasGutter>
        <StackItem>
          <TargetContextSelector />
        </StackItem>
        <StackItem>{<TriggersTable />}</StackItem>
      </Stack>
    ),
    [],
  );

  return (
    <BreadcrumbPage {...props} pageTitle="Smart Triggers">
      <Card isFullHeight>
        <CardBody isFilled>{cardBody}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default CaptureSmartTriggers;
