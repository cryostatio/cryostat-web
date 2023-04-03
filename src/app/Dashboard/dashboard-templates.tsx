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
import { FileIcon } from '@patternfly/react-icons';
import { LayoutTemplate } from './DashboardUtils';
import React from 'react';
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';

export const BlankLayout: LayoutTemplate = {
  name: 'Blank',
  icon: <FileIcon style={{ paddingRight: '0.3rem' }} />,
  description: 'A blank layout template for creating your own dashboard.',
  layout: {
    name: 'Blank',
    cards: [],
    favorite: false,
  },
};

const GeneralLayout: LayoutTemplate = {
  name: 'General',
  icon: cryostatLogo,
  description: "A general layout template for monitoring a JVM's metrics and performance.",
  vendor: 'Cryostat',
  layout: {
    name: 'JVM-Monitoring',
    cards: [
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          chartKind: 'Heap Usage Percentage',
          duration: 60,
          period: 10,
          themeColor: 'cyan',
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          chartKind: 'System CPU Load',
          duration: 60,
          period: 10,
          themeColor: 'gold',
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          themeColor: 'blue',
          chartKind: 'Process CPU Load',
          duration: 60,
          period: 10,
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          chartKind: 'Physical Memory',
          duration: 60,
          period: 10,
          themeColor: 'orange',
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          themeColor: 'purple',
          chartKind: 'Heap Memory Usage',
          duration: 60,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Compiler Total Time',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Classloading Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Network Utilization',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Exception Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'File I/O',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Recording Duration',
          duration: 120,
          period: 10,
        },
      },
    ],
    favorite: false,
  },
};

const ThreadMonitoringLayout: LayoutTemplate = {
  name: 'Thread Monitoring',
  icon: cryostatLogo,
  description: "A layout template for monitoring a JVM's threads.",
  vendor: 'Cryostat',
  layout: {
    name: 'Thread-Monitoring',
    cards: [
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Count',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Context Switch Rate',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Core Count',
          duration: 120,
          period: 10,
        },
      },
    ],
    favorite: false,
  },
};

const MemoryMonitoringLayout: LayoutTemplate = {
  name: 'Memory Monitoring',
  icon: cryostatLogo,
  description: "A layout template for monitoring a JVM's memory.",
  vendor: 'Cryostat',
  layout: {
    name: 'Memory',
    cards: [
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Memory Usage',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Total Memory',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 3,
        props: {
          chartKind: 'Heap Usage Percentage',
          duration: 60,
          period: 10,
          themeColor: 'gold',
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Heap Usage',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 4,
        props: {
          chartKind: 'Physical Memory',
          duration: 60,
          period: 10,
          themeColor: 'blue',
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 4,
        props: {
          chartKind: 'Heap Memory Usage',
          duration: 60,
          period: 10,
          themeColor: 'cyan',
        },
      },
      {
        name: 'MBeanMetricsChartCard',
        span: 4,
        props: {
          chartKind: 'Non-Heap Memory Usage',
          duration: 60,
          period: 10,
          themeColor: 'purple',
        },
      },
    ],
    favorite: false,
  },
};

const JFRMonitoringLayout: LayoutTemplate = {
  name: 'JFR Monitoring',
  icon: cryostatLogo,
  description: "A layout template for monitoring a JVM's JFR events using embedded Grafana charts.",
  vendor: 'Cryostat',
  layout: {
    name: 'JFR Monitoring',
    cards: [
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Recording Start Time',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'CPU Load',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Heap Usage',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Memory Usage',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Classloading Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Network Utilization',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Exception Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Thread Context Switch Rate',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Compiler Statistics',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Compiler Total Time',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Safepoint Duration',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'File I/O',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Compiler Total Time',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Compiler Peak Time',
          duration: 120,
          period: 10,
        },
      },
      {
        name: 'JFRMetricsChartCard',
        span: 3,
        props: {
          theme: 'light',
          chartKind: 'Object Allocation Sample',
          duration: 120,
          period: 10,
        },
      },
    ],
    favorite: false,
  },
};

const CryostatLayoutTemplates: LayoutTemplate[] = [
  GeneralLayout,
  JFRMonitoringLayout,
  MemoryMonitoringLayout,
  ThreadMonitoringLayout,
];

export default CryostatLayoutTemplates;
