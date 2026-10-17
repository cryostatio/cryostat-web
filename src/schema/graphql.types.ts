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
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  BigInteger: { input: number; output: number };
  Map: { input: Record<string, unknown>; output: Record<string, unknown> };
  Upload: { input: unknown; output: unknown };
};

export type ActiveRecording = {
  __typename?: 'ActiveRecording';
  archiveOnStop: Scalars['Boolean']['output'];
  continuous: Scalars['Boolean']['output'];
  /** Archive the specified Flight Recording */
  doArchive?: Maybe<ArchivedRecording>;
  /** Delete the specified Flight Recording */
  doDelete?: Maybe<ActiveRecording>;
  /** Updates the metadata labels for an existing Flight Recording. */
  doPutMetadata?: Maybe<ActiveRecording>;
  /** Stop the specified Flight Recording */
  doStop?: Maybe<ActiveRecording>;
  /** URL for GET request to retrieve the JFR binary file content of this recording */
  downloadUrl?: Maybe<Scalars['String']['output']>;
  duration: Scalars['BigInteger']['output'];
  id: Scalars['String']['output'];
  maxAge: Scalars['BigInteger']['output'];
  maxSize: Scalars['BigInteger']['output'];
  metadata: Metadata;
  name: Scalars['String']['output'];
  remoteId: Scalars['BigInteger']['output'];
  /** URL for GET request to retrieve a JSON formatted Automated Analysis Report of this recording */
  reportUrl?: Maybe<Scalars['String']['output']>;
  startTime: Scalars['BigInteger']['output'];
  state: RecordingState;
  target: Target;
  toDisk: Scalars['Boolean']['output'];
};

export type ActiveRecordingDoPutMetadataArgs = {
  metadataInput?: InputMaybe<MetadataLabelsInput>;
};

export type ActiveRecordings = {
  __typename?: 'ActiveRecordings';
  aggregate: RecordingAggregateInfo;
  data: Array<Maybe<ActiveRecording>>;
};

export type ActiveRecordingsFilterInput = {
  continuous?: InputMaybe<Scalars['Boolean']['input']>;
  durationMsGreaterThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  durationMsLessThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  startTimeMsAfterEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  startTimeMsBeforeEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  state?: InputMaybe<RecordingState>;
  toDisk?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AnalysisResult = {
  __typename?: 'AnalysisResult';
  evaluation?: Maybe<Evaluation>;
  name?: Maybe<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
  topic?: Maybe<Scalars['String']['output']>;
};

export type Annotations = {
  __typename?: 'Annotations';
  cryostat?: Maybe<Array<Maybe<Entry_String_String>>>;
  platform?: Maybe<Array<Maybe<Entry_String_String>>>;
};

export type AnnotationsCryostatArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type AnnotationsPlatformArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type ArchivedRecording = {
  __typename?: 'ArchivedRecording';
  archivedTime: Scalars['BigInteger']['output'];
  /** Delete an archived recording */
  doDelete: ArchivedRecording;
  /** Update the metadata associated with an archived recording */
  doPutMetadata: ArchivedRecording;
  downloadUrl?: Maybe<Scalars['String']['output']>;
  jvmId?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Metadata>;
  name?: Maybe<Scalars['String']['output']>;
  reportUrl?: Maybe<Scalars['String']['output']>;
  size: Scalars['BigInteger']['output'];
};

export type ArchivedRecordingDoPutMetadataArgs = {
  metadataInput?: InputMaybe<MetadataLabelsInput>;
};

export type ArchivedRecordings = {
  __typename?: 'ArchivedRecordings';
  aggregate: RecordingAggregateInfo;
  data: Array<Maybe<ArchivedRecording>>;
};

export type ArchivedRecordingsFilterInput = {
  archivedTimeAfterEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  archivedTimeBeforeEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  sizeBytesGreaterThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sizeBytesLessThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sourceTarget?: InputMaybe<Scalars['String']['input']>;
};

export type AsyncProfile = {
  __typename?: 'AsyncProfile';
  duration: Scalars['BigInteger']['output'];
  id?: Maybe<Scalars['String']['output']>;
  size: Scalars['BigInteger']['output'];
  startTime: Scalars['BigInteger']['output'];
};

export type AsyncProfileAggregateInfo = {
  __typename?: 'AsyncProfileAggregateInfo';
  /** The number of elements in this collection */
  count: Scalars['BigInteger']['output'];
  /** The sum of sizes of elements in this collection, or 0 if not applicable */
  size: Scalars['BigInteger']['output'];
};

export type AsyncProfilerFilterInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  sizeBytesGreaterThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sizeBytesLessThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
};

export type AsyncProfiles = {
  __typename?: 'AsyncProfiles';
  aggregate: AsyncProfileAggregateInfo;
  data: Array<Maybe<AsyncProfile>>;
};

export type DiscoveryNode = {
  __typename?: 'DiscoveryNode';
  children?: Maybe<Array<Maybe<DiscoveryNode>>>;
  /** Get target nodes that are descendants of this node. That is, get the set of leaf nodes from anywhere below this node's subtree. */
  descendantTargets?: Maybe<Array<Maybe<DiscoveryNode>>>;
  id: Scalars['String']['output'];
  labels: Array<Maybe<Entry_String_String>>;
  name: Scalars['String']['output'];
  nodeType: Scalars['String']['output'];
  target?: Maybe<Target>;
};

export type DiscoveryNodeDescendantTargetsArgs = {
  filter?: InputMaybe<DiscoveryNodeFilterInput>;
};

export type DiscoveryNodeLabelsArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type DiscoveryNodeFilterInput = {
  alias?: InputMaybe<Scalars['String']['input']>;
  aliases?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  annotations?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  id?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  jvmId?: InputMaybe<Scalars['String']['input']>;
  jvmIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  nodeTypes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  targetId?: InputMaybe<Scalars['String']['input']>;
  targetIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Entry_String_AnalysisResult = {
  __typename?: 'Entry_String_AnalysisResult';
  key?: Maybe<Scalars['String']['output']>;
  value?: Maybe<AnalysisResult>;
};

export type Entry_String_String = {
  __typename?: 'Entry_String_String';
  key?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Entry_String_StringInput = {
  key?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type Evaluation = {
  __typename?: 'Evaluation';
  explanation?: Maybe<Scalars['String']['output']>;
  solution?: Maybe<Scalars['String']['output']>;
  suggestions?: Maybe<Array<Maybe<Suggestion>>>;
  summary?: Maybe<Scalars['String']['output']>;
};

export type HeapDump = {
  __typename?: 'HeapDump';
  /** Delete a heap dump */
  doDelete: HeapDump;
  /** Update the metadata for a heap dump */
  doPutMetadata: HeapDump;
  downloadUrl?: Maybe<Scalars['String']['output']>;
  heapDumpId?: Maybe<Scalars['String']['output']>;
  jvmId?: Maybe<Scalars['String']['output']>;
  lastModified: Scalars['BigInteger']['output'];
  metadata?: Maybe<Metadata>;
  size: Scalars['BigInteger']['output'];
};

export type HeapDumpDoPutMetadataArgs = {
  metadataInput?: InputMaybe<MetadataLabelsInput>;
};

export type HeapDumpAggregateInfo = {
  __typename?: 'HeapDumpAggregateInfo';
  /** The number of elements in this collection */
  count: Scalars['BigInteger']['output'];
  /** The sum of sizes of elements in this collection, or 0 if not applicable */
  size: Scalars['BigInteger']['output'];
};

export type HeapDumps = {
  __typename?: 'HeapDumps';
  aggregate: HeapDumpAggregateInfo;
  data: Array<Maybe<HeapDump>>;
};

export type HeapDumpsFilterInput = {
  archivedTimeAfterEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  archivedTimeBeforeEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  sizeBytesGreaterThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sizeBytesLessThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sourceTarget?: InputMaybe<Scalars['String']['input']>;
};

export type MBeanMetrics = {
  __typename?: 'MBeanMetrics';
  jvmId?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<MemoryMetrics>;
  os?: Maybe<OperatingSystemMetrics>;
  runtime?: Maybe<RuntimeMetrics>;
  thread?: Maybe<ThreadMetrics>;
};

export type MemoryMetrics = {
  __typename?: 'MemoryMetrics';
  freeHeapMemory: Scalars['BigInteger']['output'];
  freeNonHeapMemory: Scalars['BigInteger']['output'];
  heapMemoryUsage?: Maybe<MemoryUtilization>;
  heapMemoryUsagePercent: Scalars['Float']['output'];
  nonHeapMemoryUsage?: Maybe<MemoryUtilization>;
  objectPendingFinalizationCount: Scalars['BigInteger']['output'];
  verbose: Scalars['Boolean']['output'];
};

export type MemoryUtilization = {
  __typename?: 'MemoryUtilization';
  committed: Scalars['BigInteger']['output'];
  init: Scalars['BigInteger']['output'];
  max: Scalars['BigInteger']['output'];
  used: Scalars['BigInteger']['output'];
};

export type Metadata = {
  __typename?: 'Metadata';
  labels?: Maybe<Array<Maybe<Entry_String_String>>>;
};

export type MetadataLabelsArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type MetadataLabelsInput = {
  labels?: InputMaybe<Array<InputMaybe<Entry_String_StringInput>>>;
};

/** Mutation root */
export type Mutation = {
  __typename?: 'Mutation';
  /** Archive an existing Flight Recording matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  archiveRecording?: Maybe<Array<Maybe<ArchivedRecording>>>;
  /** Trigger an async profiler request on all Targets under the subtrees of the discovery nodes matching the given filter */
  createAsyncProfile?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Trigger a heap dump on all Targets under the subtrees of the discovery nodes matching the given filter */
  createHeapDump?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Start a new Flight Recording on all Targets under the subtrees of the discovery nodes matching the given filter */
  createRecording?: Maybe<Array<Maybe<ActiveRecording>>>;
  /** Create a Flight Recorder Snapshot on all Targets under the subtrees of the discovery nodes matching the given filter */
  createSnapshot?: Maybe<Array<Maybe<ActiveRecording>>>;
  /** Trigger a thread dump on all Targets under the subtrees of the discovery nodes matching the given filter */
  createThreadDump?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Delete an existing Async Profile matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  deleteAsyncProfiles?: Maybe<Array<Maybe<AsyncProfile>>>;
  /** Delete an existing Heap Dump matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  deleteHeapDump?: Maybe<Array<Maybe<HeapDump>>>;
  /** Delete an existing Flight Recording matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  deleteRecording?: Maybe<Array<Maybe<ActiveRecording>>>;
  /** Delete an existing Thread Dump matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  deleteThreadDump?: Maybe<Array<Maybe<ThreadDump>>>;
  /** Stop an existing Flight Recording matching the given filter, on all Targets under the subtrees of the discovery nodes matching the given filter */
  stopRecording?: Maybe<Array<Maybe<ActiveRecording>>>;
};

/** Mutation root */
export type MutationArchiveRecordingArgs = {
  nodes: DiscoveryNodeFilterInput;
  recordings?: InputMaybe<ActiveRecordingsFilterInput>;
};

/** Mutation root */
export type MutationCreateAsyncProfileArgs = {
  duration: Scalars['BigInteger']['input'];
  events: Array<InputMaybe<Scalars['String']['input']>>;
  id: Scalars['String']['input'];
  nodes: DiscoveryNodeFilterInput;
  startTime: Scalars['BigInteger']['input'];
};

/** Mutation root */
export type MutationCreateHeapDumpArgs = {
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationCreateRecordingArgs = {
  nodes: DiscoveryNodeFilterInput;
  recording: RecordingSettingsInput;
};

/** Mutation root */
export type MutationCreateSnapshotArgs = {
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationCreateThreadDumpArgs = {
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationDeleteAsyncProfilesArgs = {
  filter?: InputMaybe<AsyncProfilerFilterInput>;
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationDeleteHeapDumpArgs = {
  filter?: InputMaybe<HeapDumpsFilterInput>;
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationDeleteRecordingArgs = {
  nodes: DiscoveryNodeFilterInput;
  recordings?: InputMaybe<ActiveRecordingsFilterInput>;
};

/** Mutation root */
export type MutationDeleteThreadDumpArgs = {
  filter?: InputMaybe<ThreadDumpsFilterInput>;
  nodes: DiscoveryNodeFilterInput;
};

/** Mutation root */
export type MutationStopRecordingArgs = {
  nodes: DiscoveryNodeFilterInput;
  recordings?: InputMaybe<ActiveRecordingsFilterInput>;
};

export type OperatingSystemMetrics = {
  __typename?: 'OperatingSystemMetrics';
  arch?: Maybe<Scalars['String']['output']>;
  availableProcessors: Scalars['Int']['output'];
  committedVirtualMemorySize: Scalars['BigInteger']['output'];
  freePhysicalMemorySize: Scalars['BigInteger']['output'];
  freeSwapSpaceSize: Scalars['BigInteger']['output'];
  name?: Maybe<Scalars['String']['output']>;
  processCpuLoad: Scalars['Float']['output'];
  processCpuTime: Scalars['BigInteger']['output'];
  systemCpuLoad: Scalars['Float']['output'];
  systemLoadAverage: Scalars['Float']['output'];
  totalPhysicalMemorySize: Scalars['BigInteger']['output'];
  totalSwapSpaceSize: Scalars['BigInteger']['output'];
  version?: Maybe<Scalars['String']['output']>;
};

/** Query root */
export type Query = {
  __typename?: 'Query';
  /** List archived recordings */
  archivedRecordings?: Maybe<ArchivedRecordings>;
  /** Get all environment nodes in the discovery tree with optional filtering */
  environmentNodes?: Maybe<Array<Maybe<DiscoveryNode>>>;
  /** List archived heap dumps */
  heapDumps?: Maybe<HeapDumps>;
  /** Get the root target discovery node */
  rootNode?: Maybe<DiscoveryNode>;
  /** Get the Target discovery nodes, i.e. the leaf nodes of the discovery tree */
  targetNodes?: Maybe<Array<Maybe<DiscoveryNode>>>;
  /** List archived thread dumps */
  threadDumps?: Maybe<ThreadDumps>;
};

/** Query root */
export type QueryArchivedRecordingsArgs = {
  filter?: InputMaybe<ArchivedRecordingsFilterInput>;
};

/** Query root */
export type QueryEnvironmentNodesArgs = {
  filter?: InputMaybe<DiscoveryNodeFilterInput>;
};

/** Query root */
export type QueryHeapDumpsArgs = {
  filter?: InputMaybe<HeapDumpsFilterInput>;
};

/** Query root */
export type QueryTargetNodesArgs = {
  filter?: InputMaybe<DiscoveryNodeFilterInput>;
  useAuditLog?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Query root */
export type QueryThreadDumpsArgs = {
  filter?: InputMaybe<ThreadDumpsFilterInput>;
};

export type RecordingAggregateInfo = {
  __typename?: 'RecordingAggregateInfo';
  /** The number of elements in this collection */
  count: Scalars['BigInteger']['output'];
  /** The sum of sizes of elements in this collection, or 0 if not applicable */
  size: Scalars['BigInteger']['output'];
};

export type RecordingMetadataInput = {
  labels?: InputMaybe<Array<InputMaybe<Entry_String_StringInput>>>;
};

export type RecordingSettingsInput = {
  archiveOnStop?: InputMaybe<Scalars['Boolean']['input']>;
  continuous?: InputMaybe<Scalars['Boolean']['input']>;
  duration?: InputMaybe<Scalars['BigInteger']['input']>;
  maxAge?: InputMaybe<Scalars['BigInteger']['input']>;
  maxSize?: InputMaybe<Scalars['BigInteger']['input']>;
  metadata?: InputMaybe<RecordingMetadataInput>;
  name: Scalars['String']['input'];
  replace?: InputMaybe<Scalars['String']['input']>;
  template: Scalars['String']['input'];
  templateType: Scalars['String']['input'];
  toDisk?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Running state of an active Flight Recording */
export enum RecordingState {
  /** CLOSED */
  Closed = 'CLOSED',
  /** DELAYED */
  Delayed = 'DELAYED',
  /** NEW */
  New = 'NEW',
  /** RUNNING */
  Running = 'RUNNING',
  /** STOPPED */
  Stopped = 'STOPPED',
}

export type Recordings = {
  __typename?: 'Recordings';
  /** List and optionally filter active recordings belonging to a Target */
  active?: Maybe<ActiveRecordings>;
  /** List and optionally filter archived recordings belonging to a Target */
  archived?: Maybe<ArchivedRecordings>;
};

export type RecordingsActiveArgs = {
  filter?: InputMaybe<ActiveRecordingsFilterInput>;
};

export type RecordingsArchivedArgs = {
  filter?: InputMaybe<ArchivedRecordingsFilterInput>;
};

export type Report = {
  __typename?: 'Report';
  aggregate: ReportAggregateInfo;
  data: Array<Maybe<Entry_String_AnalysisResult>>;
  lastUpdated: Scalars['BigInteger']['output'];
};

export type ReportDataArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type ReportAggregateInfo = {
  __typename?: 'ReportAggregateInfo';
  /** The number of elements in this collection */
  count: Scalars['BigInteger']['output'];
  /** The maximum value in this collection */
  max: Scalars['Float']['output'];
};

export type ReportFilterInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notId?: InputMaybe<Scalars['String']['input']>;
  notIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notTopic?: InputMaybe<Scalars['String']['input']>;
  notTopics?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  topic?: InputMaybe<Scalars['String']['input']>;
  topics?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type RuntimeMetrics = {
  __typename?: 'RuntimeMetrics';
  bootClassPath?: Maybe<Scalars['String']['output']>;
  bootClassPathSupported: Scalars['Boolean']['output'];
  classPath?: Maybe<Scalars['String']['output']>;
  inputArguments?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  libraryPath?: Maybe<Scalars['String']['output']>;
  managementSpecVersion?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  specName?: Maybe<Scalars['String']['output']>;
  specVendor?: Maybe<Scalars['String']['output']>;
  specVersion?: Maybe<Scalars['String']['output']>;
  startTime: Scalars['BigInteger']['output'];
  systemProperties?: Maybe<Array<Maybe<Entry_String_String>>>;
  uptime: Scalars['BigInteger']['output'];
  vmName?: Maybe<Scalars['String']['output']>;
  vmVendor?: Maybe<Scalars['String']['output']>;
  vmVersion?: Maybe<Scalars['String']['output']>;
};

export type RuntimeMetricsSystemPropertiesArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Suggestion = {
  __typename?: 'Suggestion';
  name?: Maybe<Scalars['String']['output']>;
  setting?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Target = {
  __typename?: 'Target';
  /** Retrieve a list of active recordings currently available on the target */
  activeRecordings?: Maybe<ActiveRecordings>;
  agent: Scalars['Boolean']['output'];
  alias: Scalars['String']['output'];
  annotations: Annotations;
  /** Retrieve a list of archived recordings belonging to the target */
  archivedRecordings?: Maybe<ArchivedRecordings>;
  /** Retrieve a list of async profiles belonging to the target */
  asyncProfiles?: Maybe<AsyncProfiles>;
  connectUrl: Scalars['String']['output'];
  /** Create a new Flight Recorder Snapshot on the specified Target */
  doSnapshot?: Maybe<ActiveRecording>;
  /** Start a new Flight Recording on the specified Target */
  doStartRecording?: Maybe<ActiveRecording>;
  /** Retrieve a list of heap dumps belonging to the target */
  heapDumps?: Maybe<HeapDumps>;
  id: Scalars['String']['output'];
  jvmId?: Maybe<Scalars['String']['output']>;
  labels: Array<Maybe<Entry_String_String>>;
  /** Get live MBean metrics snapshot from the specified Target */
  mbeanMetrics?: Maybe<MBeanMetrics>;
  /** Get the active and archived recordings belonging to this target */
  recordings?: Maybe<Recordings>;
  /**
   * Retrieve an automated analysis report from the selected target(s). If there is no report currently
   * available then this request will not cause a report to be generated, and instead it will return an empty
   * result. Report generation may be an expensive operation, especially if many reports are to be generated at
   * once, and should not be triggered by broad GraphQL selections.
   */
  report?: Maybe<Report>;
  /** Retrieve a list of thread dumps belonging to the target */
  threadDumps?: Maybe<ThreadDumps>;
};

export type TargetActiveRecordingsArgs = {
  filter?: InputMaybe<ActiveRecordingsFilterInput>;
};

export type TargetArchivedRecordingsArgs = {
  filter?: InputMaybe<ArchivedRecordingsFilterInput>;
};

export type TargetAsyncProfilesArgs = {
  filter?: InputMaybe<AsyncProfilerFilterInput>;
};

export type TargetDoStartRecordingArgs = {
  recording: RecordingSettingsInput;
};

export type TargetHeapDumpsArgs = {
  filter?: InputMaybe<HeapDumpsFilterInput>;
};

export type TargetLabelsArgs = {
  key?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type TargetReportArgs = {
  filter?: InputMaybe<ReportFilterInput>;
};

export type TargetThreadDumpsArgs = {
  filter?: InputMaybe<ThreadDumpsFilterInput>;
};

export type ThreadDump = {
  __typename?: 'ThreadDump';
  /** Delete a thread dump */
  doDelete: ThreadDump;
  /** Update the metadata for a thread dump */
  doPutMetadata: ThreadDump;
  downloadUrl?: Maybe<Scalars['String']['output']>;
  jvmId?: Maybe<Scalars['String']['output']>;
  lastModified: Scalars['BigInteger']['output'];
  metadata?: Maybe<Metadata>;
  size: Scalars['BigInteger']['output'];
  threadDumpId?: Maybe<Scalars['String']['output']>;
};

export type ThreadDumpDoPutMetadataArgs = {
  metadataInput?: InputMaybe<MetadataLabelsInput>;
};

export type ThreadDumpAggregateInfo = {
  __typename?: 'ThreadDumpAggregateInfo';
  /** The number of elements in this collection */
  count: Scalars['BigInteger']['output'];
  /** The sum of sizes of elements in this collection, or 0 if not applicable */
  size: Scalars['BigInteger']['output'];
};

export type ThreadDumps = {
  __typename?: 'ThreadDumps';
  aggregate: ThreadDumpAggregateInfo;
  data: Array<Maybe<ThreadDump>>;
};

export type ThreadDumpsFilterInput = {
  archivedTimeAfterEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  archivedTimeBeforeEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  names?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  sizeBytesGreaterThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sizeBytesLessThanEqual?: InputMaybe<Scalars['BigInteger']['input']>;
  sourceTarget?: InputMaybe<Scalars['String']['input']>;
};

export type ThreadMetrics = {
  __typename?: 'ThreadMetrics';
  allThreadIds?: Maybe<Array<Scalars['BigInteger']['output']>>;
  currentThreadCpuTime: Scalars['BigInteger']['output'];
  currentThreadCpuTimeSupported: Scalars['Boolean']['output'];
  currentThreadUserTime: Scalars['BigInteger']['output'];
  daemonThreadCount: Scalars['Int']['output'];
  objectMonitorUsageSupported: Scalars['Boolean']['output'];
  peakThreadCount: Scalars['Int']['output'];
  synchronizerUsageSupported: Scalars['Boolean']['output'];
  threadContentionMonitoringEnabled: Scalars['Boolean']['output'];
  threadContentionMonitoringSupported: Scalars['Boolean']['output'];
  threadCount: Scalars['Int']['output'];
  threadCpuTimeEnabled: Scalars['Boolean']['output'];
  threadCpuTimeSupported: Scalars['Boolean']['output'];
  totalStartedThreadCount: Scalars['BigInteger']['output'];
};
