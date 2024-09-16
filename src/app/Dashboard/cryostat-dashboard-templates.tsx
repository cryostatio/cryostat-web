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
import { LayoutTemplate, LayoutTemplateVendor, LayoutTemplateVersion } from './types';

const CURR_VERSION: LayoutTemplateVersion = LayoutTemplateVersion['v3.0'];

export const BlankLayout: LayoutTemplate = {
  name: 'Blank',
  description: 'A blank layout template for creating your own dashboard.',
  cards: [],
  version: CURR_VERSION,
  vendor: LayoutTemplateVendor.BLANK,
};

const GeneralLayout: LayoutTemplate = {
  name: 'General',
  description: "A general layout template for monitoring a JVM's metrics and performance.",
  vendor: LayoutTemplateVendor.CRYOSTAT,
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
  version: CURR_VERSION,
};

const ThreadMonitoringLayout: LayoutTemplate = {
  name: 'Thread Monitoring',
  description: "A layout template for monitoring a JVM's threads.",
  vendor: LayoutTemplateVendor.CRYOSTAT,
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
  version: CURR_VERSION,
};

const MemoryMonitoringLayout: LayoutTemplate = {
  name: 'Memory Monitoring',
  description: "A layout template for monitoring a JVM's memory.",
  vendor: LayoutTemplateVendor.CRYOSTAT,
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
  version: CURR_VERSION,
};

const AutomatedAnalysisLayout: LayoutTemplate = {
  name: 'Automated analysis',
  description: 'A layout template for identifying and calculating risk scores for common performance issues in a JVM.',
  vendor: LayoutTemplateVendor.CRYOSTAT,
  cards: [
    {
      name: 'AutomatedAnalysisCard',
      span: 7,
      props: {},
    },
    {
      name: 'JvmDetailsCard',
      span: 5,
      props: {},
    },
  ],
  version: CURR_VERSION,
};

const MBeanMetricsLayout: LayoutTemplate = {
  name: 'MBean Metrics',
  description: "A layout template for monitoring some of a JVM's MBean metrics.",
  vendor: LayoutTemplateVendor.CRYOSTAT,
  cards: [
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'Process CPU Load',
        duration: 60,
        period: 10,
        themeColor: 'blue',
      },
    },

    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'System Load Average',
        duration: 60,
        period: 10,
        themeColor: 'cyan',
      },
    },
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'System CPU Load',
        duration: 60,
        period: 10,
        themeColor: 'gold',
      },
    },
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'Heap Usage Percentage',
        duration: 60,
        period: 10,
        themeColor: 'orange',
      },
    },
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'Heap Memory Usage',
        duration: 60,
        period: 10,
        themeColor: 'gray',
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
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'Threads',
        duration: 60,
        period: 10,
        themeColor: 'green',
      },
    },
    {
      name: 'MBeanMetricsChartCard',
      span: 4,
      props: {
        chartKind: 'Physical Memory',
        duration: 60,
        period: 10,
        themeColor: 'gold',
      },
    },
  ],
  version: CURR_VERSION,
};

const JFRMonitoringLayout: LayoutTemplate = {
  name: 'JFR Monitoring',
  description: "A layout template for monitoring a JVM's JFR events using embedded Grafana charts.",
  vendor: LayoutTemplateVendor.CRYOSTAT,
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
  version: CURR_VERSION,
};

export const CryostatLayoutTemplates: LayoutTemplate[] = [
  GeneralLayout,
  AutomatedAnalysisLayout,
  MBeanMetricsLayout,
  JFRMonitoringLayout,
  MemoryMonitoringLayout,
  ThreadMonitoringLayout,
];
