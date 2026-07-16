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

export interface HistogramEntry {
  clazz: string;
  numInstances: number;
  inclusiveSize: number;
  shallowSize: number;
}

export interface ProblemClass {
  clazz: string;
  problemKind: string;
  numInstances: number;
  overhead: number;
}

export interface ProblemCollection {
  classAndField: string;
  definingClass: string;
  overhead: number;
  badObjs: number;
  goodCollections: number;
  classAndOvhds: ProblemClass[];
}

export interface DuplicateArray {
  classAndField: string;
  definingClass: string;
  overhead: number;
  badObjs: number;
  nonDupArrays: number;
  aggregates: AggregateValue[];
}

export interface DuplicateString {
  classAndField: string;
  definingClass: string;
  overhead: number;
  badObjs: number;
  dupBackingCharArrays: number;
  nonDupStrings: number;
  aggregates: AggregateValue[];
}

export interface ObjectEntry {
  clazz: string;
  numInstances: number;
  overhead: number;
}

export interface HighSizeObjects {
  classAndField: string;
  definingClass: string;
  overhead: number;
  badObjs: number;
  classAndSizeCombos: ObjectEntry[];
}

export interface WeakHashMapEntry {
  classAndField: string;
  definingClass: string;
  overhead: number;
  badObjs: number;
  classes: string[];
}

export interface Field {
  clazz: string;
  field: string;
  overhead: number;
}

export interface ProblemField {
  clazz: string;
  numInstances: number;
  fields: Field[];
  overhead: number;
  problemKind: string; // SOME_FIELDS_EMPTY, ALL_FIELDS_EMPTY, NO_FIELDS, SOME_FIELDS_UNUSED_HI_BYTES;
}

export interface AggregateValue {
  value: string;
  count: number;
}

export interface DuplicateStringStats {
  totalStrings: number;
  uniqueStrings: number;
  duplicateStrings: number;
  overhead: number;
}

export interface HistogramStats {
  totalClasses: number;
  totalObjects: number;
  zeroInstances: number;
  singleInstances: number;
}

export interface CompressibleStringStats {
  stringObjects: number;
  backingArrayBytes: number;
  compressedStrings: number;
  compressedStringBytes: number;
  asciiStrings: number;
  asciiStringBytes: number;
}

export interface FundamentalStats {
  pointerSize: number;
  narrowPointers: boolean;
  objectHeaderSize: number;
  objectHeaderAlignment: number;
  numObjects: number;
  objectInstances: number;
  objectArrays: number;
  primitiveArrays: number;
  objectSize: number;
  instanceSize: number;
  objArraySize: number;
  primitiveSize: number;
}

export interface HeapDumpAnalysisResult {
  // Reference Chains
  problemCollections: ProblemCollection[];
  duplicateArrays: DuplicateArray[];
  duplicateStrings: DuplicateString[];
  highSizeObjects: HighSizeObjects[];
  weakHashMapClusters: WeakHashMapEntry[];

  // Object Histogram
  objectHistogram: HistogramEntry[];

  // Problem Fields
  nullProblemFields: ProblemField[];
  nearNullProblemFields: ProblemField[];
  fullBytesFields: ProblemField[];
  highBytesFields: ProblemField[];

  // Classloader Stats
  classLoaderInstanceStats: AggregateValue[];
  classLoaderClassStats: AggregateValue[];

  // General Stats
  compressibleStringStats: CompressibleStringStats;
  duplicateStringStats: DuplicateStringStats;
  histogramStats: HistogramStats;
  fundamentalStats: FundamentalStats;
}
