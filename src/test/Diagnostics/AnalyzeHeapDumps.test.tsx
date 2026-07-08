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

import { HeapDumpAnalysis } from '@app/Diagnostics/Analysis/HeapDumps/HeapDumpAnalysis';
import { HeapDumpAnalysisResult } from '@app/Diagnostics/Analysis/HeapDumps/types';
import { ThemeSetting } from '@app/Settings/types';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { HeapDump, Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { basePreloadedState, DEFAULT_DIMENSIONS, mockMediaQueryList, render, resize } from '@test/utils';
import { act, screen, cleanup, waitFor, within } from '@testing-library/react';
import { BehaviorSubject, of, Subject } from 'rxjs';

const mockNewConnectUrl = 'service:jmx:rmi://someNewUrl';
const mockNewAlias = 'target';
const mockTarget: Target = {
  agent: false,
  jvmId: 'target',
  connectUrl: mockNewConnectUrl,
  alias: mockNewAlias,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockOtherTarget: Target = {
  agent: false,
  jvmId: 'otherTarget',
  connectUrl: 'service:jmx:rmi://someOtherUrl',
  alias: 'other target',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockHeapDump: HeapDump = {
  downloadUrl: 'someDownloadUrl',
  heapDumpId: 'someUuid',
  jvmId: mockTarget.jvmId,
  size: 1,
  metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
};

const mockOtherHeapDump: HeapDump = {
  downloadUrl: 'someOtherDownloadUrl',
  heapDumpId: 'someOtherUuid',
  jvmId: mockOtherTarget.jvmId,
  size: 1,
  metadata: { labels: [{ key: 'someLabel', value: 'someOtherValue' }] },
};

const mockHeapDumpAnalysis: HeapDumpAnalysisResult = {
  problemCollections: [
    {
      classAndField: 'someClass-->someField',
      definingClass: 'someClass',
      overhead: 1,
      badObjs: 2,
      goodCollections: 3,
      classAndOvhds: [
        {
          clazz: 'someClass',
          problemKind: 'PROBLEM',
          numInstances: 1,
          overhead: 1,
        },
      ],
    },
  ],
  duplicateArrays: [
    {
      classAndField: 'someOtherClass-->someOtherField',
      definingClass: 'someOtherClass',
      overhead: 4,
      badObjs: 5,
      nonDupArrays: 6,
      aggregates: [
        {
          value: 'someArray',
          count: 7,
        },
      ],
    },
  ],
  duplicateStrings: [
    {
      classAndField: 'someDupStringClass-->someDupStringField',
      definingClass: 'someDupStringClass',
      overhead: 8,
      badObjs: 9,
      dupBackingCharArrays: 10,
      nonDupStrings: 11,
      aggregates: [
        {
          value: 'someString',
          count: 12,
        },
      ],
    },
  ],
  highSizeObjects: [
    {
      classAndField: 'someHighSizeObjClass-->someHighSizeObjField',
      definingClass: 'someHighSizeObjClass',
      overhead: 13,
      badObjs: 14,
      classAndSizeCombos: [
        {
          clazz: 'someClazz',
          numInstances: 1,
          overhead: 15,
        },
      ],
    },
  ],
  weakHashMapClusters: [
    {
      classAndField: 'someWeakHashMapClass-->someWeakHashMapField',
      definingClass: 'someWeakHashMapClass',
      overhead: 16,
      badObjs: 17,
      classes: ['fooClass'],
    },
  ],
  objectHistogram: [
    {
      clazz: 'histoClass1',
      numInstances: 1,
      inclusiveSize: 123,
      shallowSize: 456,
    },
    {
      clazz: 'histoClass2',
      numInstances: 2,
      inclusiveSize: 321,
      shallowSize: 654,
    },
  ],
  nullProblemFields: [
    {
      clazz: 'NullProblemClass',
      numInstances: 1,
      fields: [
        {
          clazz: 'NullClass',
          field: 'NullField',
          overhead: 1,
        },
      ],
      overhead: 1,
      problemKind: 'SOME OTHER PROBLEM',
    },
  ],
  nearNullProblemFields: [],
  fullBytesFields: [],
  highBytesFields: [],
  classLoaderInstanceStats: [],
  classLoaderClassStats: [],
  compressibleStringStats: {
    stringObjects: 18,
    backingArrayBytes: 19,
    compressedStrings: 20,
    compressedStringBytes: 21,
    asciiStrings: 22,
    asciiStringBytes: 23,
  },
  duplicateStringStats: {
    totalStrings: 24,
    uniqueStrings: 25,
    duplicateStrings: 26,
    overhead: 27,
  },
  histogramStats: {
    totalClasses: 28,
    totalObjects: 29,
    zeroInstances: 30,
    singleInstances: 31,
  },
  fundamentalStats: {
    pointerSize: 32,
    narrowPointers: false,
    objectHeaderSize: 33,
    objectHeaderAlignment: 34,
    numObjects: 35,
    objectInstances: 36,
    objectArrays: 37,
    primitiveArrays: 38,
    objectSize: 39,
    instanceSize: 40,
    objArraySize: 41,
    primitiveSize: 42,
  },
};

jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump]));

jest.spyOn(defaultServices.api, 'getHeapDumps').mockReturnValue(of([mockHeapDump]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

describe('<HeapDumpAnalysis />', () => {
  let preloadedState: RootState;
  let setTargetSpy: jest.SpyInstance | undefined;

  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  beforeEach(() => {
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump]));
    jest.spyOn(defaultServices.api, 'getHeapDumps').mockReturnValue(of([mockHeapDump]));
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
    jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));
    preloadedState = {
      ...basePreloadedState,
    };
  });

  afterEach(() => {
    setTargetSpy?.mockRestore();
    setTargetSpy = undefined;
    cleanup();
  });

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('renders empty state', async () => {
    jest.spyOn(defaultServices.api, 'analyzeHeapDump').mockReturnValue(of());

    render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
  });

  it('prefills the selected heap dump from location state', async () => {
    const analyzeSpy = jest.spyOn(defaultServices.api, 'getHeapDumpReport').mockReturnValue(of(mockHeapDumpAnalysis));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [
            {
              pathname: '/analyze-heap-dumps',
              state: { jvmId: mockTarget.jvmId, id: mockHeapDump.heapDumpId },
            },
          ],
        },
      },
      preloadedState: preloadedState,
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
      expect(screen.getByRole('button', { name: 'heap dump selector toggle' })).toHaveTextContent(
        mockHeapDump.heapDumpId,
      );
    });
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
  });

  it('prefills the selected heap dump from query params', async () => {
    const analyzeSpy = jest.spyOn(defaultServices.api, 'getHeapDumpReport').mockReturnValue(of(mockHeapDumpAnalysis));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [`/analyze-heap-dumps?jvmId=${mockTarget.jvmId}&heapDumpId=${mockHeapDump.heapDumpId}`],
        },
      },
      preloadedState: preloadedState,
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
      expect(screen.getByRole('button', { name: 'heap dump selector toggle' })).toHaveTextContent(
        mockHeapDump.heapDumpId,
      );
    });
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
  });

  it('updates the target context for a prefilled archived thread dump from another target', async () => {
    const analyzeSpy = jest.spyOn(defaultServices.api, 'getHeapDumpReport').mockReturnValue(of(mockHeapDumpAnalysis));
    const target$ = new BehaviorSubject<Target | undefined>(mockTarget);
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(target$);
    setTargetSpy = jest.spyOn(defaultServices.target, 'setTarget').mockImplementation((target) => target$.next(target));
    jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget, mockOtherTarget]));
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockImplementation((target) => {
      return of(target.connectUrl === mockOtherTarget.connectUrl ? [mockOtherHeapDump] : [mockHeapDump]);
    });

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [
            {
              pathname: '/analyze-heap-dumps',
              state: { jvmId: mockOtherTarget.jvmId, id: mockOtherHeapDump.heapDumpId },
            },
          ],
        },
      },
      preloadedState: preloadedState,
    });

    await waitFor(() => {
      expect(setTargetSpy).toHaveBeenCalledWith(mockOtherTarget);
      expect(analyzeSpy).toHaveBeenCalledWith(mockOtherTarget.jvmId, mockOtherHeapDump.heapDumpId);
      expect(screen.getByRole('button', { name: 'heap dump selector toggle' })).toHaveTextContent(
        mockOtherHeapDump.heapDumpId,
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'heap dump selector toggle' }));
    });
    expect(within(await screen.findByRole('menu')).getByText(mockOtherHeapDump.heapDumpId)).toBeInTheDocument();
  });

  it('shows a loading state while prefilled heap dump analysis is pending', async () => {
    const analysis$ = new Subject<HeapDumpAnalysisResult>();
    jest.spyOn(defaultServices.api, 'getHeapDumpReport').mockReturnValue(analysis$);

    render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [
            {
              pathname: '/analyze-heap-dumps',
              state: { jvmId: mockTarget.jvmId, id: mockHeapDump.heapDumpId },
            },
          ],
        },
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Select a Heap Dump to Analyze' })).not.toBeInTheDocument();

    await act(async () => {
      analysis$.next(mockHeapDumpAnalysis);
      analysis$.complete();
    });

    await waitFor(() => {
      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });
  });

  it('should render the page correctly', async () => {
    jest.spyOn(defaultServices.api, 'getHeapDumpReport').mockReturnValue(of(mockHeapDumpAnalysis));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-heap-dumps',
            element: <HeapDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const dropDownArrow = screen.getByRole('button', { name: 'heap dump selector toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('menu');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const option = within(selectMenu).getByText(mockHeapDump.heapDumpId);
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(screen.getByText(mockHeapDump.heapDumpId));
    });

    // Tab 1 - Statistics
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    expect(screen.getByText('Duplicate String Stats')).toBeInTheDocument();
    expect(screen.getByText('Object Histogram Stats')).toBeInTheDocument();
    expect(screen.getByText('Compressible String Stats')).toBeInTheDocument();
    expect(screen.getByText('Class Loader Instances')).toBeInTheDocument();
    expect(screen.getByText('Class Loader Classes')).toBeInTheDocument();

    // Change Tabs
    const fieldsTab = screen.getByRole('tab', { name: 'Null Problem Fields' });
    expect(fieldsTab).toBeInTheDocument();
    expect(fieldsTab).toBeVisible();
    await act(async () => {
      await user.click(fieldsTab);
    });
    // Problem Fields
    ['Class', 'Instances', 'Overhead', 'Problem Type'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const histogramTab = screen.getByRole('tab', { name: 'Object Histogram' });
    expect(histogramTab).toBeInTheDocument();
    expect(histogramTab).toBeVisible();
    await act(async () => {
      await user.click(histogramTab);
    });
    // Object Histogram
    ['Class', 'Instances', 'Shallow Size', 'Inclusive Size'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const collectionsTab = screen.getByRole('tab', { name: 'Collections' });
    expect(collectionsTab).toBeInTheDocument();
    expect(collectionsTab).toBeVisible();
    await act(async () => {
      await user.click(collectionsTab);
    });
    // Collections
    ['Class', 'Defining Class', 'Overhead', 'Bad Objects', 'Good Collections'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const arraysTab = screen.getByRole('tab', { name: 'Duplicate Arrays' });
    expect(arraysTab).toBeInTheDocument();
    expect(arraysTab).toBeVisible();
    await act(async () => {
      await user.click(arraysTab);
    });
    // Duplicate Arrays
    ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects', 'Non Duplicate Arrays'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const objectsTab = screen.getByRole('tab', { name: 'High Size Objects' });
    expect(objectsTab).toBeInTheDocument();
    expect(objectsTab).toBeVisible();
    await act(async () => {
      await user.click(objectsTab);
    });
    // High Size Objects
    ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const stringsTab = screen.getByRole('tab', { name: 'Duplicate Strings' });
    expect(stringsTab).toBeInTheDocument();
    expect(stringsTab).toBeVisible();
    await act(async () => {
      await user.click(stringsTab);
    });
    // Duplicate Strings
    [
      'Class and Field',
      'Defining Class',
      'Overhead',
      'Bad Objects',
      'Backing Char Array Memory',
      'Non Duplicate Strings',
    ].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Change Tabs
    const weakHashMapsTab = screen.getByRole('tab', { name: 'Weak HashMaps' });
    expect(weakHashMapsTab).toBeInTheDocument();
    expect(weakHashMapsTab).toBeVisible();
    await act(async () => {
      await user.click(weakHashMapsTab);
    });
    // Weak HashMaps
    ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects'].map((text) => {
      const header = screen.getByRole('columnheader', { name: text });
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });
  });
});
