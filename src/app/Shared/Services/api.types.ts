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
import { HeapDumpAnalysisResult } from '@app/Diagnostics/Analysis/HeapDumps/types';
import { AlertVariant } from '@patternfly/react-core';
import _ from 'lodash';
import { Observable } from 'rxjs';
import {
  ActiveRecordingsFilterInput as GqlActiveRecordingsFilterInput,
  AnalysisResult as GqlAnalysisResult,
  Evaluation as GqlEvaluation,
  Report as GqlReport,
  Suggestion as GqlSuggestion,
} from 'src/schema/graphql.types';
import { components, paths } from 'src/schema/openapi.types';

export type ApiVersion = 'unversioned' | 'v4' | 'v4.1' | 'beta';

// ======================================
// Common Resources
// ======================================

export type BuildInfo = components['schemas']['BuildInfo'];

export type KeyValue = components['schemas']['KeyValue'];

export const isKeyValue = (o: any): o is KeyValue => {
  return typeof o === 'object' && _.isEqual(new Set(['key', 'value']), new Set(Object.getOwnPropertyNames(o)));
};

export const keyValueToString = (kv: KeyValue): string => {
  return `${kv.key}=${kv.value}`;
};

export type Metadata = components['schemas']['Metadata'];

export type TargetMetadata = Metadata & {
  annotations: components['schemas']['Annotations'];
};

export function isTargetMetadata(metadata: Metadata | TargetMetadata): metadata is TargetMetadata {
  return (metadata as TargetMetadata).annotations !== undefined;
}

export type SimpleResponse = Pick<Response, 'ok' | 'status'>;

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

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

export type TargetReference = Omit<Target, 'agent' | 'jvmId' | 'labels' | 'annotations'>;

// The non-credential subset of the schema's target-creation request body
// (components['schemas']['TargetStub']); credentials are submitted separately by ApiService#createTarget.
export type TargetCreateRequest = Pick<components['schemas']['TargetStub'], 'alias' | 'connectUrl'>;

export type TargetForTest = Pick<Target, 'alias' | 'connectUrl'> & {
  labels: object;
  annotations: { cryostat: object; platform: object };
};

// ======================================
// Health Resources
// ======================================
export type GrafanaDashboardUrlGetResponse = components['schemas']['DashboardUrl'];

export type GrafanaDatasourceUrlGetResponse = components['schemas']['DatasourceUrl'];

export type HealthGetResponse = components['schemas']['ApplicationHealth'];

// ======================================
// Auth Resources
// ======================================

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

export interface ThreadDumpsResponse {
  data: {
    targetNodes: {
      target: {
        threadDumps: {
          data: ThreadDump[];
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}

export interface HeapDumpsResponse {
  data: {
    targetNodes: {
      target: {
        heapDumps: {
          data: HeapDump[];
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}

// ======================================
// Recording resources
// ======================================
export type RecordingDirectory = components['schemas']['ArchivedRecordingDirectory'];

export type RecordingState = components['schemas']['RecordingState'];

// A Record (rather than a bare array) so that adding, removing, or renaming a state in the schema
// causes a compile error here via excess/missing-property checking, instead of silently drifting.
const RECORDING_STATE_MEMBERS: Record<RecordingState, true> = {
  NEW: true,
  DELAYED: true,
  RUNNING: true,
  STOPPED: true,
  CLOSED: true,
};
export const RECORDING_STATES = Object.keys(RECORDING_STATE_MEMBERS) as RecordingState[];

// The recording-creation request body, as declared inline on the POST
// /api/v4/targets/{targetId}/recordings path (not under components['schemas'], so it's referenced
// via `paths` instead).
type RecordingCreateForm =
  paths['/api/v4/targets/{targetId}/recordings']['post']['requestBody']['content']['application/x-www-form-urlencoded'];

export type AdvancedRecordingOptions = Pick<RecordingCreateForm, 'toDisk' | 'maxSize' | 'maxAge'>;

export interface RecordingAttributes {
  name: string;
  events: NonNullable<RecordingCreateForm['events']>;
  duration?: RecordingCreateForm['duration'];
  archiveOnStop?: RecordingCreateForm['archiveOnStop'];
  replace?: RecordingReplace;
  advancedOptions?: AdvancedRecordingOptions;
  metadata?: Metadata;
}

export type Recording = Pick<ActiveRecording, 'name' | 'downloadUrl' | 'reportUrl' | 'metadata'>;

export type ThreadDumpDirectory = components['schemas']['ArchivedThreadDumpDirectory'];

export type ThreadDump = components['schemas']['ThreadDump'];

export type StackFrame = components['schemas']['StackFrame'];

export type LockInfo = components['schemas']['LockInfo'];

// A single deadlocked thread's participation in a deadlock cycle.
export type DeadlockedThread = components['schemas']['DeadlockedThread'];

// A detected deadlock cycle; the threads participating in it are in `threads`.
export type DeadlockInfo = components['schemas']['DeadlockInfo'];

export type ThreadInfo = components['schemas']['ThreadInfo'];

export type AnalysisFinding = components['schemas']['ThreadDumpAnalysisResult'];

export type ThreadDumpAnalysisResult = components['schemas']['ThreadDumpAnalysis'];

export type ArchivedRecording = components['schemas']['ArchivedRecording'];

export type ActiveRecording = components['schemas']['LinkedRecordingDescriptor'];

export type HeapDumpDirectory = components['schemas']['ArchivedHeapDumpDirectory'];

export type HeapDump = components['schemas']['HeapDump'];

export type ActiveRecordingsFilterInput = GqlActiveRecordingsFilterInput;

/**
 * New target specific archived recording apis now enforce a non-empty target field
 * The placeholder targetId for uploaded (non-target) recordings is "uploads"
 */
export const UPLOADS_SUBDIRECTORY = 'uploads';

export type AggregateReport = GqlReport;

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

export interface ThreadDumpCountResponse {
  data: {
    targetNodes: {
      target: {
        threadDumps: {
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}

export interface HeapDumpCountResponse {
  data: {
    targetNodes: {
      target: {
        heapDumps: {
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
export type MatchedCredential = components['schemas']['CredentialMatchResult'];

// ======================================
// Agent-related resources
// ======================================
export type ProbeTemplate = components['schemas']['ProbeTemplateResponse'];

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

// ======================================
// Rule resources
// ======================================
export type Rule = components['schemas']['Rule'];

// ======================================
// Smart Triggers Resources
// ======================================
export interface SmartTrigger {
  id: string;
  triggerCondition: string;
  recordingTemplateName: string;
  targetDuration: number;
  state: string;
  simple: boolean;
  timeConditionFirstMet: string;
}

export interface SmartTriggerRequest {
  condition: string;
  duration: number;
  recordingTemplate: string;
}

// ======================================
// Template resources
// ======================================
export type OptionDescriptor = components['schemas']['SerializableOptionDescriptor'];

export type EventType = components['schemas']['SerializableEventTypeInfo'];

export type TemplateType = components['schemas']['TemplateType'];

export type EventTemplate = components['schemas']['Template'];

// ======================================
// Report resources
// ======================================
export const automatedAnalysisRecordingName = 'automated-analysis';

export interface CachedReportValue {
  report: AnalysisResult[];
  timestamp: number;
}

export interface CachedHeapDumpReportValue {
  report: HeapDumpAnalysisResult;
  timestamp: number;
}

// [topic, { ruleName, score, description, ... }}]
export type CategorizedRuleEvaluations = [string, AnalysisResult[]];

export type GenerationError = Error & {
  status: number;
  messageDetail: Observable<string>;
};

// Sourced from the GraphQL schema, not openapi: these are only ever fetched via the
// AggregateReportsForAllTargets/AggregateReportForTarget GraphQL queries. Only `score` reflects a
// primitive `double` field on the server (io.cryostat.core.reports.InterruptibleReportGenerator);
// every other field is a plain object/String with no non-null guarantee.
export type AnalysisResult = GqlAnalysisResult;

export type Evaluation = GqlEvaluation;

export type Suggestion = GqlSuggestion;

export enum AutomatedAnalysisScore {
  NA_SCORE = -1,
  ORANGE_SCORE_THRESHOLD = 25,
  RED_SCORE_THRESHOLD = 75,
}

// ======================================
// Discovery/Target resources
// ======================================
export type Target = components['schemas']['Target'];

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

export interface LineageNode {
  readonly name: string;
  readonly nodeType: NodeType;
}

interface _AbstractNode extends LineageNode {
  readonly id: number;
  readonly labels: KeyValue[];
}

export interface EnvironmentNode extends _AbstractNode {
  readonly children: (EnvironmentNode | TargetNode)[];
}

export interface TargetNode extends _AbstractNode {
  readonly target: Target;
}

// ======================================
// async-profiler resources
// ======================================

export type AsyncProfile = components['schemas']['AsyncProfile'];

export type AsyncProfilerSession = components['schemas']['StartProfileRequest'];

export type ProfilerStatus = components['schemas']['ProfilerStatus'];

export type AsyncProfilerStatus = components['schemas']['AsyncProfilerStatus'];

// ======================================
// Unified Logging resources
// ======================================

export type UnifiedLoggingStatus = components['schemas']['UnifiedLogStatus'];

// `downloadUrl` and `logId` are null for a live logging session with no archived artifact yet;
// they are only populated when listing or pulling archived logs.
export type UnifiedLog = components['schemas']['UnifiedLog'];

export type UnifiedLogDirectory = components['schemas']['ArchivedUnifiedLogDirectory'];

// ======================================
// Notification resources
// ======================================

export interface NotificationMessage {
  meta: MessageMeta;
  // Should a message be any type? Try T?
  message: any;
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
  ArchiveRecordingSuccess = 'ArchiveRecordingSuccess',
  ArchiveRecordingFail = 'ArchiveRecordingFailure',
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
  GrafanaUploadSuccess = 'GrafanaUploadSuccess',
  GrafanaUploadFail = 'GrafanaUploadFailure',
  GrafanaConfiguration = 'GrafanaConfiguration', // generated client-side
  LayoutTemplateCreated = 'LayoutTemplateCreated', // generated client-side
  HeapDumpSuccess = 'HeapDumpSuccess',
  HeapDumpUploaded = 'HeapDumpUploaded',
  HeapDumpFailure = 'HeapDumpFailure',
  HeapDumpDeleted = 'HeapDumpDeleted',
  HeapDumpMetadataUpdated = 'HeapDumpMetadataUpdated',
  HeapDumpAnalysisSuccess = 'HeapDumpAnalysisSuccess',
  ThreadDumpSuccess = 'ThreadDumpSuccess',
  ThreadDumpFailure = 'ThreadDumpFailure',
  ThreadDumpDeleted = 'ThreadDumpDeleted',
  ThreadDumpMetadataUpdated = 'ThreadDumpMetadataUpdated',
  TriggerCreated = 'TriggerCreated',
  TriggerDeleted = 'TriggerDeleted',
  CredentialsStored = 'CredentialsStored',
  CredentialsDeleted = 'CredentialsDeleted',
  CredentialsUpdated = 'CredentialsUpdated',
  ExpressionCreated = 'ExpressionCreated',
  ExpressionDeleted = 'ExpressionDeleted',
  ExpressionUpdated = 'ExpressionUpdated',
  ReportSuccess = 'ReportSuccess',
  ReportFail = 'ReportFailure',
  AsyncProfileCreated = 'AsyncProfilerCreated',
  AsyncProfileStopped = 'AsyncProfilerStopped',
  AsyncProfileDeleted = 'AsyncProfilerDeleted',
  UnifiedLogUploaded = 'UnifiedLogUploaded',
  UnifiedLogDeleted = 'UnifiedLogDeleted',
  UnifiedLogMetadataUpdated = 'UnifiedLogMetadataUpdated',
  RecordingSynthesisComplete = 'RecordingSynthesisComplete',
  RecordingSynthesisFailure = 'RecordingSynthesisFailure',
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

// ======================================
// Audit Log Resources
// ======================================

/**
 * Revision information from REVINFO table
 */
export type AuditRevision = components['schemas']['RevisionSummary'];

/**
 * Revision type enum matching Hibernate Envers values
 */
export enum RevisionType {
  /** Entity was added */
  ADD = 0,
  /** Entity was modified */
  MODIFY = 1,
  /** Entity was deleted */
  DELETE = 2,
}

/**
 * Generic audit entity structure
 * All _AUD tables follow this pattern with additional entity-specific fields
 */
export interface AuditEntity {
  /** Entity ID */
  id: number;
  /** Revision number when this change occurred */
  rev: number;
  /** Type of operation (ADD/MODIFY/DELETE) */
  revtype: RevisionType;
  /** Revision number when this entity version ended (optional) */
  revend?: number;
  /** Timestamp when this entity version ended (optional) */
  revend_tstmp?: number;
  /** Additional entity-specific fields */
  [key: string]: any;
}

/**
 * Revision with detailed entity changes
 */
export interface AuditRevisionDetail extends AuditRevision {
  /** Map of entity type name to array of entities changed in this revision */
  entities: {
    [entityType: string]: AuditEntity[];
  };
}

/**
 * Query parameters for audit log search
 */
export interface AuditQueryParams {
  /** Start of time range (timestamp in milliseconds) */
  startTime: number;
  /** End of time range (timestamp in milliseconds) */
  endTime: number;
  /** Page number for pagination (optional, 0-based) */
  page?: number;
  /** Number of results per page (optional, default 50) */
  pageSize?: number;
}

/**
 * Response from audit revisions query
 */
export interface AuditRevisionsResponse {
  /** Array of revisions matching the query */
  revisions: AuditRevision[];
  /** Total count of revisions (for pagination) */
  totalCount: number;
}

/**
 * Helper function to get human-readable operation name
 */
export const getRevisionTypeName = (revtype: RevisionType): string => {
  switch (revtype) {
    case RevisionType.ADD:
      return 'Add';
    case RevisionType.MODIFY:
      return 'Modify';
    case RevisionType.DELETE:
      return 'Delete';
    default:
      return 'Unknown';
  }
};
