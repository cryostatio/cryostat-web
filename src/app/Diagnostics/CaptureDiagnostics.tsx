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
import { MBeanMetricsChartCard } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import { DiagnosticsCard } from '@app/Dashboard/Diagnostics/DiagnosticsCard';
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Grid, GridItem, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { GcCaptureCard } from './GcCaptureCard';

export interface CaptureDiagnosticsProps {}

export const CaptureDiagnostics: React.FC<CaptureDiagnosticsProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [target, setTarget] = React.useState<NullableTarget>(undefined);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setTarget));
  }, [addSubscription, context.target]);

  return (
    <TargetView {...props} pageTitle="Diagnostics">
      <Grid hasGutter>
        <GridItem span={4}>
          <Stack hasGutter>
            <StackItem>{target ? <GcCaptureCard target={target} /> : null}</StackItem>
            <StackItem>
              <DiagnosticsCard span={4} dashboardId={0} isResizable={false} isDraggable={false} />
            </StackItem>
          </Stack>
        </GridItem>
        <GridItem span={8}>
          <MBeanMetricsChartCard
            span={8}
            chartKind="Heap Memory Usage"
            themeColor="blue"
            duration={300}
            period={10}
            dashboardId={0}
            isDraggable={false}
            isResizable={false}
          />
        </GridItem>
      </Grid>
    </TargetView>
  );
};

export default CaptureDiagnostics;
