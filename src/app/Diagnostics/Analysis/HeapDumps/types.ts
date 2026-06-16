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

export interface ObjectHistogramEntry {
  class: string;
  instances: number;
  inclusiveSize: number;
  shallowSize: number;
}

export interface ProblemFieldsEntry {
  class: string;
  numInstances: number;
  problemFieldNames: string[];
  problemFieldDeclaringClasses: string[];
  perFieldOvhd: number[];
  allProblemFieldsOvhd: number;
  status: string; // SOME_FIELDS_EMPTY, ALL_FIELDS_EMPTY, NO_FIELDS, SOME_FIELDS_UNUSED_HI_BYTES;
}

export interface ClassAndSizeCombo {
  clazz: string;
  numInstances: number;
  sizeOrOvhd: number;
}

export interface ClassAndOvhdCombo {
  clazz: string;
  problemKind: string;
  instances: number;
  overhead: number;
}

export interface PrimitiveArrayWrapper {
  elementType: string;
  size: number;
}

export interface WeakHashMaps {
  numInstances: number;
  colClasses: string[];
  valueTypeAndFieldSamples: string[];
}

export interface HighSizeObjects {
  classAndSizeList: ClassAndSizeCombo[];
  clazz: string;
  numInstances: number;
  sizeOrOvhd: number;
}

export interface DupArrays {
  numNonDupArrays: number;
  entries: PrimitiveArrayWrapper[];
}

export interface DupStrings {
  printLongStrings: boolean;
  printAllStrings: boolean;
  numDupBackingCharArrays: number;
  numNonDupStrings: number;
  entries: string[];
}

export interface Collections {
  classAndOvhdList: ClassAndOvhdCombo[];
  numGoodCollections: number;
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
  collectionClusters: Collections[][];
  duplicateArrayClusters: DupArrays[][];
  duplicateStringClusters: DupStrings[][];
  highSizeObjectClusters: HighSizeObjects[][];

  // Object Histogram
  objectHistogram: ObjectHistogramEntry[];

  // Problem Fields
  nullProblemFields: ProblemFieldsEntry[];
  nearNullProblemFields: ProblemFieldsEntry[];
  fullBytesFields: ProblemFieldsEntry[];
  highBytesFields: ProblemFieldsEntry[];

  // Classloader Stats
  classLoaderInstanceStats: AggregateValue[];
  classLoaderClassStats: AggregateValue[];

  // General Stats
  compressibleStringStats: CompressibleStringStats;
  duplicateStringStats: DuplicateStringStats;
  histogramStats: HistogramStats;
  fundamentalStats: FundamentalStats;
}
