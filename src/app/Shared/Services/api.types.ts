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
import { RecordingReplace } from '@app/CreateRecording/types';
import { AlertVariant } from '@patternfly/react-core';
import _ from 'lodash';
import { Observable } from 'rxjs';

export type ApiVersion = 'v1' | 'v2' | 'v2.1' | 'v2.2' | 'v2.3' | 'v2.4' | 'v3' | 'beta';
// ======================================
// Common Resources
// ======================================

export interface BuildInfo {
  git: {
    hash: string;
  };
}

export interface KeyValue {
  key: string;
  value: string;
}

export const isKeyValue = (o: any): o is KeyValue => {
  return typeof o === 'object' && _.isEqual(new Set(['key', 'value']), new Set(Object.getOwnPropertyNames(o)));
};

export const keyValueToString = (kv: KeyValue): string => {
  return `${kv.key}=${kv.value}`;
};

export interface Metadata {
  labels: KeyValue[];
}

export type TargetMetadata = Metadata & {
  annotations: {
    cryostat: KeyValue[];
    platform: KeyValue[];
  };
};

export function isTargetMetadata(metadata: Metadata | TargetMetadata): metadata is TargetMetadata {
  return (metadata as TargetMetadata).annotations !== undefined;
}

export interface ApiV2Response {
  meta: {
    status: string;
    type: string;
  };
  data: unknown;
}

export interface AssetJwtResponse extends ApiV2Response {
  data: {
    result: {
      resourceUrl: string;
    };
  };
}

export type SimpleResponse = Pick<Response, 'ok' | 'status'>;

export interface XMLHttpResponse {
  body: unknown;
  headers: object;
  respType: XMLHttpRequestResponseType;
  status: number;
  statusText: string;
  ok: boolean;
  text: () => Promise<string>;
}

export interface XMLHttpRequestConfig {
  body?: XMLHttpRequestBodyInit;
  headers: object;
  method: string;
  listeners?: {
    onUploadProgress?: (e: ProgressEvent) => void;
  };
  abortSignal?: Observable<void>;
}

export class HttpError extends Error {
  readonly httpResponse: Response;

  constructor(httpResponse: Response) {
    super(httpResponse.statusText);
    this.httpResponse = httpResponse;
  }
}

export class XMLHttpError extends Error {
  readonly xmlHttpResponse: XMLHttpResponse;

  constructor(xmlHttpResponse: XMLHttpResponse) {
    super(xmlHttpResponse.statusText);
    this.xmlHttpResponse = xmlHttpResponse;
  }
}

export type TargetStub = Omit<Target, 'agent' | 'jvmId' | 'labels' | 'annotations'>;

export type TargetForTest = Pick<Target, 'alias' | 'connectUrl'> & {
  labels: object;
  annotations: { cryostat: object; platform: object };
};

// ======================================
// Health Resources
// ======================================
export interface GrafanaDashboardUrlGetResponse {
  grafanaDashboardUrl: string;
}

export interface GrafanaDatasourceUrlGetResponse {
  grafanaDatasourceUrl: string;
}

export interface HealthGetResponse {
  cryostatVersion: string;
  build: BuildInfo;
  datasourceConfigured: boolean;
  datasourceAvailable: boolean;
  dashboardConfigured: boolean;
  dashboardAvailable: boolean;
  reportsConfigured: boolean;
  reportsAvailable: boolean;
}

// ======================================
// Auth Resources
// ======================================
export interface AuthV2Response extends ApiV2Response {
  data: {
    result: {
      username: string;
    };
  };
}

// ======================================
// MBean metric resources
// ======================================
export interface MemoryUtilization {
  init: number;
  used: number;
  committed: number;
  max: number;
}

export interface MBeanMetrics {
  thread?: {
    threadCount?: number;
    daemonThreadCount?: number;
  };
  os?: {
    name?: string;
    arch?: string;
    availableProcessors?: number;
    version?: string;
    systemCpuLoad?: number;
    systemLoadAverage?: number;
    processCpuLoad?: number;
    totalPhysicalMemorySize?: number;
    freePhysicalMemorySize?: number;
    totalSwapSpaceSize?: number;
  };
  memory?: {
    heapMemoryUsage?: MemoryUtilization;
    nonHeapMemoryUsage?: MemoryUtilization;
    heapMemoryUsagePercent?: number;
  };
  runtime?: {
    bootClassPath?: string;
    classPath?: string;
    inputArguments?: string[];
    libraryPath?: string;
    managementSpecVersion?: string;
    name?: string;
    specName?: string;
    specVendor?: string;
    startTime?: number;
    systemProperties?: KeyValue[];
    uptime?: number;
    vmName?: string;
    vmVendor?: string;
    vmVersion?: string;
    bootClassPathSupported?: boolean;
  };
}

export interface MBeanMetricsResponse {
  data: {
    targetNodes: {
      target: {
        mbeanMetrics: MBeanMetrics;
      };
    }[];
  };
}

// ======================================
// Recording resources
// ======================================
export interface RecordingDirectory {
  connectUrl: string;
  jvmId: string;
  recordings: ArchivedRecording[];
}

export enum RecordingState {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
}

export interface AdvancedRecordingOptions {
  toDisk?: boolean;
  maxSize?: number;
  maxAge?: number;
}

export interface RecordingAttributes {
  name: string;
  events: string;
  duration?: number;
  archiveOnStop?: boolean;
  replace?: RecordingReplace;
  advancedOptions?: AdvancedRecordingOptions;
  metadata?: Metadata;
}

export interface Recording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
  metadata: Metadata;
}

export interface ArchivedRecording extends Recording {
  jvmId?: string;
  archivedTime: number;
  size: number;
}

export interface ActiveRecording extends Recording {
  id: number;
  state: RecordingState;
  duration: number; // In miliseconds
  startTime: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}

export interface ActiveRecordingsFilterInput {
  name?: string;
  state?: string;
  continuous?: boolean;
  toDisk?: boolean;
  durationMsGreaterThanEqual?: number;
  durationMsLessThanEqual?: number;
  startTimeMsBeforeEqual?: number;
  startTimeMsAfterEqual?: number;
  labels?: string[] | string;
}

/**
 * New target specific archived recording apis now enforce a non-empty target field
 * The placeholder targetId for uploaded (non-target) recordings is "uploads"
 */
export const UPLOADS_SUBDIRECTORY = 'uploads';

export interface RecordingResponse extends ApiV2Response {
  data: {
    result: ActiveRecording;
  };
}

export interface RecordingCountResponse {
  data: {
    targetNodes: {
      target: {
        activeRecordings: {
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}

// ======================================
// Credential resources
// ======================================
export interface StoredCredential {
  id: number;
  matchExpression: string;
  numMatchingTargets: number;
}

export interface MatchedCredential {
  matchExpression: string;
  targets: Target[];
}

export interface CredentialResponse extends ApiV2Response {
  data: {
    result: MatchedCredential;
  };
}

export interface CredentialsResponse extends ApiV2Response {
  data: {
    result: StoredCredential[];
  };
}

// ======================================
// Agent-related resources
// ======================================
export interface ProbeTemplate {
  name: string;
  xml: string;
}

export interface EventProbe {
  id: string;
  name: string;
  clazz: string;
  description: string;
  path: string;
  recordStackTrace: boolean;
  useRethrow: boolean;
  methodName: string;
  methodDescriptor: string;
  location: string;
  returnValue: string;
  parameters: string;
  fields: string;
}

export interface ProbeTemplateResponse extends ApiV2Response {
  data: {
    result: ProbeTemplate[];
  };
}

export interface EventProbesResponse extends ApiV2Response {
  data: {
    result: EventProbe[];
  };
}

// ======================================
// Rule resources
// ======================================
export interface Rule {
  name: string;
  description: string;
  matchExpression: string;
  enabled: boolean;
  eventSpecifier: string;
  archivalPeriodSeconds: number;
  initialDelaySeconds: number;
  preservedArchives: number;
  maxAgeSeconds: number;
  maxSizeBytes: number;
}

export interface RulesResponse extends ApiV2Response {
  data: {
    result: Rule[];
  };
}

export interface RuleResponse extends ApiV2Response {
  data: {
    result: Rule;
  };
}

// ======================================
// Template resources
// ======================================
export interface OptionDescriptor {
  name: string;
  description: string;
  defaultValue: string;
}

export interface EventType {
  name: string;
  typeId: string;
  description: string;
  category: string[];
  options: { [key: string]: OptionDescriptor }[];
}

export type TemplateType = 'TARGET' | 'CUSTOM';

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
  type: TemplateType;
}

// ======================================
// Report resources
// ======================================
export const automatedAnalysisRecordingName = 'automated-analysis';

export interface CachedReportValue {
  report: AnalysisResult[];
  timestamp: number;
}

// [topic, { ruleName, score, description, ... }}]
export type CategorizedRuleEvaluations = [string, AnalysisResult[]];

export type GenerationError = Error & {
  status: number;
  messageDetail: Observable<string>;
};

export interface AnalysisResult {
  name: string;
  topic: string;
  score: number;
  evaluation: Evaluation;
}

export interface Evaluation {
  summary: string;
  explanation: string;
  solution: string;
  suggestions: Suggestion[];
}

export interface Suggestion {
  setting: string;
  name: string;
  value: string;
}

export enum AutomatedAnalysisScore {
  NA_SCORE = -1,
  ORANGE_SCORE_THRESHOLD = 25,
  RED_SCORE_THRESHOLD = 75,
}

export const FAILED_REPORT_MESSAGE =
  'Failed to load the report from Recording because the requested entity is too large.';
export const NO_RECORDINGS_MESSAGE = 'No Active or Archived Recordings available. Create a new Recording for analysis.';
export const RECORDING_FAILURE_MESSAGE = 'Failed to start Recording for analysis.';
export const TEMPLATE_UNSUPPORTED_MESSAGE = 'The template type used in this Recording is not supported on this JVM.';

// ======================================
// Discovery/Target resources
// ======================================
export interface Target {
  id?: number; // present in responses but we must not include it in requests to create targets
  jvmId?: string; // present in responses, but we do not need to provide it in requests
  agent: boolean;
  connectUrl: string;
  alias: string;
  labels: KeyValue[];
  annotations: {
    cryostat: KeyValue[];
    platform: KeyValue[];
  };
}

export type NullableTarget = Target | undefined;

export enum NodeType {
  // The entire deployment scenario Cryostat finds itself in.
  UNIVERSE = 'Universe',
  // A division of the deployment scenario (i.e. Kubernetes, JDP, Custom Target, CryostatAgent)
  REALM = 'Realm',
  // A plain target JVM, connectable over JMX.
  JVM = 'JVM',
  // A target JVM using the Cryostat Agent, *not* connectable over JMX. Agent instances
  // that do publish a JMX Service URL should publish themselves with the JVM NodeType.
  AGENT = 'CryostatAgent',
  // Custom Target defined via Custom Target creation form.
  CUSTOM_TARGET = 'CustomTarget',
  // Kubernetes platform.
  NAMESPACE = 'Namespace',
  STATEFULSET = 'StatefulSet',
  DAEMONSET = 'DaemonSet',
  DEPLOYMENT = 'Deployment',
  DEPLOYMENTCONFIG = 'DeploymentConfig', // OpenShift specific
  REPLICASET = 'ReplicaSet',
  REPLICATIONCONTROLLER = 'ReplicationController',
  POD = 'Pod',
  ENDPOINT = 'Endpoint',
  // Standalone targets
  TARGET = 'Target',
  NODE = 'Node', // Default/fallback for unknown
}

interface _AbstractNode {
  readonly id: number;
  readonly name: string;
  readonly nodeType: NodeType;
  readonly labels: KeyValue[];
}

export interface EnvironmentNode extends _AbstractNode {
  readonly children: (EnvironmentNode | TargetNode)[];
}

export interface TargetNode extends _AbstractNode {
  readonly target: Target;
}

// ======================================
// Notification resources
// ======================================

export interface NotificationMessage {
  meta: MessageMeta;
  // Should a message be any type? Try T?
  message: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface MessageMeta {
  category: string;
  type: MessageType;
}

export interface MessageType {
  type: string;
  subtype: string;
}

export interface TargetDiscoveryEvent {
  kind: 'LOST' | 'FOUND' | 'MODIFIED';
  serviceRef: Target;
}

export interface Notification {
  hidden?: boolean;
  read?: boolean;
  key?: string;
  title: string;
  message?: string | Error;
  category?: string;
  variant: AlertVariant;
  timestamp?: number;
}

export enum NotificationCategory {
  WsClientActivity = 'WsClientActivity',
  TargetJvmDiscovery = 'TargetJvmDiscovery',
  ActiveRecordingCreated = 'ActiveRecordingCreated',
  ActiveRecordingStopped = 'ActiveRecordingStopped',
  ActiveRecordingSaved = 'ActiveRecordingSaved',
  ActiveRecordingDeleted = 'ActiveRecordingDeleted',
  SnapshotCreated = 'SnapshotCreated',
  SnapshotDeleted = 'SnapshotDeleted',
  ArchivedRecordingCreated = 'ArchivedRecordingCreated',
  ArchivedRecordingDeleted = 'ArchivedRecordingDeleted',
  TemplateUploaded = 'TemplateUploaded',
  TemplateDeleted = 'TemplateDeleted',
  ProbeTemplateUploaded = 'ProbeTemplateUploaded',
  ProbeTemplateDeleted = 'ProbeTemplateDeleted',
  ProbeTemplateApplied = 'ProbeTemplateApplied',
  ProbesRemoved = 'ProbesRemoved',
  RuleCreated = 'RuleCreated',
  RuleUpdated = 'RuleUpdated',
  RuleDeleted = 'RuleDeleted',
  RecordingMetadataUpdated = 'RecordingMetadataUpdated',
  GrafanaConfiguration = 'GrafanaConfiguration', // generated client-side
  LayoutTemplateCreated = 'LayoutTemplateCreated', // generated client-side
  TargetCredentialsStored = 'TargetCredentialsStored',
  TargetCredentialsDeleted = 'TargetCredentialsDeleted',
  CredentialsStored = 'CredentialsStored',
  CredentialsDeleted = 'CredentialsDeleted',
}

export enum CloseStatus {
  LOGGED_OUT = 1000,
  PROTOCOL_FAILURE = 1002,
  INTERNAL_ERROR = 1011,
  UNKNOWN = -1,
}

export interface ReadyState {
  ready: boolean;
  code?: CloseStatus;
}

export interface NotificationMessageMapper {
  title: string;
  body?: (evt: NotificationMessage) => string;
  variant?: AlertVariant;
  hidden?: boolean;
}
