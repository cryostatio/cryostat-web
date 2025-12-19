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
import { TargetView } from '@app/TargetView/TargetView';
import { Grid, GridItem } from '@patternfly/react-core';
import * as React from 'react';

export interface CaptureDiagnosticsProps {}

export const CaptureDiagnostics: React.FC<CaptureDiagnosticsProps> = ({ ...props }) => {
  return (
    <TargetView {...props} pageTitle="Diagnostics">
      <Grid hasGutter>
        <GridItem span={3}>
          <DiagnosticsCard span={3} dashboardId={0} headerDisabled={true} isResizable={false} isDraggable={false} />
        </GridItem>
        <GridItem span={9}>
          <MBeanMetricsChartCard
            span={9}
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
