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
import { CaptureDiagnostics } from '@app/Diagnostics/CaptureDiagnostics';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { testT, render, mockMediaQueryList } from '@test/utils';
import { screen } from '@testing-library/react';
import * as React from 'react';
import { NEVER, of } from 'rxjs';

jest.mock('@app/TargetView/TargetView', () => ({
  TargetView: jest.fn((props) => <>{props.children}</>),
}));

jest.mock('@app/Dashboard/Charts/mbean/MBeanMetricsChartCard', () => ({
  MBeanMetricsChartCard: jest.fn(() => <>MBean Metrics Chart</>),
}));

describe('<CaptureDiagnostics />', () => {
  const target = {
    agent: true,
    connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
    alias: 'target-one',
    labels: [],
    annotations: { cryostat: [], platform: [] },
  };

  beforeEach(() => {
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(target));
    jest
      .spyOn(defaultServices.api, 'getGcLoggingStatus')
      .mockReturnValue(of({ enabled: true, what: 'gc+safepoint', decorators: 'time,level' }));
    jest.spyOn(defaultServices.api, 'getThreadDumps').mockReturnValue(of([]));
    jest.spyOn(defaultServices.api, 'getHeapDumps').mockReturnValue(of([]));
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
    jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of('light' as any));
    jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));
    jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));
    jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(NEVER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hides beta gc logging status and actions at production feature level', async () => {
    render({
      routerConfigs: {
        routes: [{ path: '/', element: React.createElement(CaptureDiagnostics, null) }],
      },
    });

    expect(await screen.findByRole('button', { name: testT('DiagnosticsCard.DIAGNOSTICS_GC_BUTTON') })).toBeVisible();
    expect(screen.getByText(testT('GcCaptureCard.TITLE'))).toBeVisible();
    expect(screen.getByText(testT('DiagnosticsCard.DIAGNOSTICS_CARD_TITLE'))).toBeVisible();
    expect(screen.queryByText(testT('GcLoggingStatusCard.STATUS_LABEL'))).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: testT('GcLoggingStatusCard.ENABLE_BUTTON') })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: testT('GcLoggingStatusCard.RECONFIGURE_BUTTON') }),
    ).not.toBeInTheDocument();
  });

  it('shows beta gc logging status and actions at beta feature level', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));

    render({
      routerConfigs: {
        routes: [{ path: '/', element: React.createElement(CaptureDiagnostics, null) }],
      },
    });

    expect(screen.getByText(testT('GcCaptureCard.TITLE'))).toBeVisible();
    expect(screen.getByText(testT('DiagnosticsCard.DIAGNOSTICS_CARD_TITLE'))).toBeVisible();
    expect(await screen.findByText(testT('GcLoggingStatusCard.STATUS_LABEL'))).toBeVisible();
    expect(screen.getByText(testT('GcLoggingStatusCard.ENABLED'))).toBeVisible();
    expect(screen.getByRole('button', { name: testT('GcLoggingStatusCard.RECONFIGURE_BUTTON') })).toBeVisible();
    expect(screen.getByRole('button', { name: testT('DiagnosticsCard.DIAGNOSTICS_THREAD_DUMP_BUTTON') })).toBeVisible();
    expect(screen.getByRole('button', { name: testT('DiagnosticsCard.DIAGNOSTICS_HEAP_DUMP_BUTTON') })).toBeVisible();
  });
});
