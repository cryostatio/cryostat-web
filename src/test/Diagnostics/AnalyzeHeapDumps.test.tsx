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
import { HeapDumpAnalysisResponse } from '@app/Shared/Services/HeapDumpReport.service';
import { ThemeSetting } from '@app/Settings/types';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { HeapDump, Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { basePreloadedState, DEFAULT_DIMENSIONS, mockMediaQueryList, render, resize } from '@test/utils';
import { act, screen, cleanup, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

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
  jvmId: mockTarget.jvmId!,
  lastModified: 1700000000,
  size: 1,
  metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
};

const mockSecondHeapDump: HeapDump = {
  ...mockHeapDump,
  heapDumpId: 'someSecondUuid',
};

const ANALYSIS_ROUTE = '/analyze-heap-dumps';

const mockOtherHeapDump: HeapDump = {
  downloadUrl: 'someOtherDownloadUrl',
  heapDumpId: 'someOtherUuid',
  jvmId: mockOtherTarget.jvmId!,
  lastModified: 1700000000,
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

const mockHeapDumpAnalysisResponse: HeapDumpAnalysisResponse = {
  jobId: 'mock-job-id',
  result: mockHeapDumpAnalysis,
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
    jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValue(of());

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

  const prefillState = (heapDump: HeapDump) => ({ jvmId: heapDump.jvmId, heapDumpId: heapDump.heapDumpId });

  const Remountable = () => {
    const [generation, setGeneration] = useState(0);
    return (
      <>
        <button onClick={() => setGeneration((g) => g + 1)}>remount analysis</button>
        <HeapDumpAnalysis key={generation} />
      </>
    );
  };

  const selectorToggle = () => screen.getByRole('button', { name: 'heap dump selector toggle' });

  const spyOnReport = () =>
    jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValue(of(mockHeapDumpAnalysisResponse));

  it('prefills the selected heap dump from location state', async () => {
    const analyzeSpy = spyOnReport();

    render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [
            {
              pathname: ANALYSIS_ROUTE,
              state: prefillState(mockHeapDump),
            },
          ],
        },
      },
      preloadedState: preloadedState,
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
      expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId);
    });
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
  });

  it('prefills the selected heap dump from Redux state when router state is absent', async () => {
    const analyzeSpy = spyOnReport();

    render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [ANALYSIS_ROUTE] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: prefillState(mockHeapDump) },
      },
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
      expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId);
    });
  });

  it('ignores query params', async () => {
    const analyzeSpy = spyOnReport();

    render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: {
          initialEntries: [`${ANALYSIS_ROUTE}?jvmId=${mockTarget.jvmId}&heapDumpId=${mockHeapDump.heapDumpId}`],
        },
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  it('ignores a Redux slot that belongs to another route', async () => {
    const analyzeSpy = spyOnReport();

    render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [ANALYSIS_ROUTE] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { '/recordings': prefillState(mockHeapDump) },
      },
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  it('retains the Redux slot and router state after applying the prefill', async () => {
    const analyzeSpy = spyOnReport();
    const state = prefillState(mockHeapDump);

    const { store, router } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: state });
    expect(router.state.location.state).toEqual(state);
    expect(router.state.location.search).toEqual('');
  });

  it('re-applies the prefill when the analysis view is remounted', async () => {
    const analyzeSpy = spyOnReport();
    const state = prefillState(mockHeapDump);

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <Remountable />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'remount analysis' }));
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(2);
      expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId);
      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });
    expect(analyzeSpy).toHaveBeenLastCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
  });

  it('re-applies the prefill when remounted while the analysis request is still in flight', async () => {
    const pending$ = new Subject<HeapDumpAnalysisResult>();
    const analyzeSpy = jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValueOnce(pending$);
    analyzeSpy.mockReturnValue(of(mockHeapDumpAnalysisResponse));
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <Remountable />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: state });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'remount analysis' }));
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });
    expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId);
  });

  it('restores the previously analysed heap dump after navigating away and back', async () => {
    const analyzeSpy = spyOnReport();
    const state = prefillState(mockHeapDump);

    const { router } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
          {
            path: '/elsewhere',
            element: <>Elsewhere</>,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await router.navigate('/elsewhere');
    });
    expect(screen.getByText('Elsewhere')).toBeInTheDocument();

    await act(async () => {
      await router.navigate(ANALYSIS_ROUTE);
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(2);
      expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId);
      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });
  });

  it('writes a manual selection to the Redux slot and prefers it over router state on remount', async () => {
    const analyzeSpy = spyOnReport();
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump, mockSecondHeapDump]));
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <Remountable />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId));

    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText(mockSecondHeapDump.heapDumpId));
    });

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenLastCalledWith(mockTarget.jvmId, mockSecondHeapDump.heapDumpId);
    });
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: prefillState(mockSecondHeapDump) });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'remount analysis' }));
    });

    await waitFor(() => {
      expect(selectorToggle()).toHaveTextContent(mockSecondHeapDump.heapDumpId);
      expect(analyzeSpy).toHaveBeenLastCalledWith(mockTarget.jvmId, mockSecondHeapDump.heapDumpId);
    });
  });

  it('does not re-apply the prefill over a manual selection when the target or dump list refreshes', async () => {
    const analyzeSpy = spyOnReport();
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump, mockSecondHeapDump]));
    const target$ = new BehaviorSubject<Target | undefined>(mockTarget);
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(target$);
    const state = prefillState(mockHeapDump);

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId));

    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText(mockSecondHeapDump.heapDumpId));
    });
    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      target$.next({ ...mockTarget });
    });

    expect(selectorToggle()).toHaveTextContent(mockSecondHeapDump.heapDumpId);
    expect(analyzeSpy).toHaveBeenCalledTimes(2);
  });

  it('offers a Clear Selection option that resets the view and records an explicitly empty Redux slot', async () => {
    const analyzeSpy = spyOnReport();
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(screen.getByText('Fundamental Stats')).toBeInTheDocument());

    await act(async () => {
      await user.click(selectorToggle());
    });
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Clear Selection')).toBeInTheDocument();
    await act(async () => {
      await user.click(within(menu).getByText('Clear Selection'));
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    expect(selectorToggle()).toHaveTextContent('Select a Heap Dump');
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: {} });
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('stays cleared after a remount even though router state still carries the old selection', async () => {
    const analyzeSpy = spyOnReport();
    const state = prefillState(mockHeapDump);

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <Remountable />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => expect(screen.getByText('Fundamental Stats')).toBeInTheDocument());

    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText('Clear Selection'));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'remount analysis' }));
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    expect(selectorToggle()).toHaveTextContent('Select a Heap Dump');
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the selection and the Redux selection when the analysis request fails', async () => {
    jest
      .spyOn(defaultServices.heapDumpReports, 'reportJson')
      .mockReturnValue(throwError(() => new Error('heap dump no longer exists')));
    const state = prefillState(mockHeapDump);

    const { store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: {
        ...preloadedState,
        modalPrefill: { [ANALYSIS_ROUTE]: state },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    });
    expect(selectorToggle()).toHaveTextContent('Select a Heap Dump');
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: {} });
  });
  it('ignores the failure of an analysis request that was superseded by a newer selection', async () => {
    const failing$ = new Subject<HeapDumpAnalysisResult>();
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump, mockSecondHeapDump]));
    jest
      .spyOn(defaultServices.heapDumpReports, 'reportJson')
      .mockImplementation((_jvmId, heapDumpId) =>
        heapDumpId === mockHeapDump.heapDumpId ? failing$ : of(mockHeapDumpAnalysisResponse),
      );
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: preloadedState,
    });

    await waitFor(() => expect(selectorToggle()).toHaveTextContent(mockHeapDump.heapDumpId));
    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText(mockSecondHeapDump.heapDumpId));
    });
    await waitFor(() => expect(screen.getByText('Fundamental Stats')).toBeInTheDocument());

    await act(async () => {
      failing$.error(new Error('heap dump no longer exists'));
    });

    expect(selectorToggle()).toHaveTextContent(mockSecondHeapDump.heapDumpId);
    expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: prefillState(mockSecondHeapDump) });
  });

  it('discards a pending prefill lookup that was superseded by a manual selection', async () => {
    const analyzeSpy = spyOnReport();
    const targets$ = new Subject<Target[]>();
    jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(targets$);
    jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of([mockHeapDump, mockSecondHeapDump]));
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText(mockSecondHeapDump.heapDumpId));
    });
    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledWith(mockTarget.jvmId, mockSecondHeapDump.heapDumpId));

    await act(async () => {
      targets$.next([mockTarget]);
    });

    expect(selectorToggle()).toHaveTextContent(mockSecondHeapDump.heapDumpId);
    expect(analyzeSpy).not.toHaveBeenCalledWith(mockTarget.jvmId, mockHeapDump.heapDumpId);
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: prefillState(mockSecondHeapDump) });
  });

  it('discards a pending prefill lookup that was superseded by Clear Selection', async () => {
    const analyzeSpy = spyOnReport();
    const targets$ = new Subject<Target[]>();
    jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(targets$);
    const state = prefillState(mockHeapDump);

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: ANALYSIS_ROUTE,
            element: <HeapDumpAnalysis />,
          },
        ],
        options: { initialEntries: [{ pathname: ANALYSIS_ROUTE, state }] },
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(selectorToggle());
    });
    await act(async () => {
      await user.click(within(await screen.findByRole('menu')).getByText('Clear Selection'));
    });

    await act(async () => {
      targets$.next([mockTarget]);
    });

    expect(screen.getByRole('heading', { name: 'Select a Heap Dump to Analyze' })).toBeInTheDocument();
    expect(selectorToggle()).toHaveTextContent('Select a Heap Dump');
    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(store.getState().modalPrefill).toEqual({ [ANALYSIS_ROUTE]: {} });
  });

  it('updates the target context for a prefilled archived thread dump from another target', async () => {
    const analyzeSpy = jest
      .spyOn(defaultServices.heapDumpReports, 'reportJson')
      .mockReturnValue(of(mockHeapDumpAnalysisResponse));
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
              state: prefillState(mockOtherHeapDump),
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
    jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValue(analysis$);

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
              state: prefillState(mockHeapDump),
            },
          ],
        },
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Select a Heap Dump to Analyze' })).not.toBeInTheDocument();

    await act(async () => {
      analysis$.next(mockHeapDumpAnalysisResponse);
      analysis$.complete();
    });

    await waitFor(() => {
      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });
  });

  const setupWithSelectedHeapDump = async () => {
    jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValue(of(mockHeapDumpAnalysisResponse));
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
    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('menu');
    const option = within(selectMenu).getByText(mockHeapDump.heapDumpId);
    await act(async () => {
      await user.click(option);
    });

    return { user };
  };

  describe('should render the page correctly', () => {
    it('should render heap dump selector and allow selection', async () => {
      jest.spyOn(defaultServices.heapDumpReports, 'reportJson').mockReturnValue(of(mockHeapDumpAnalysisResponse));
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
        await user.click(option);
      });

      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
    });

    it('should display statistics tab correctly', async () => {
      await setupWithSelectedHeapDump();

      expect(screen.getByText('Fundamental Stats')).toBeInTheDocument();
      expect(screen.getByText('Duplicate String Stats')).toBeInTheDocument();
      expect(screen.getByText('Object Histogram Stats')).toBeInTheDocument();
      expect(screen.getByText('Compressible String Stats')).toBeInTheDocument();
      expect(screen.getByText('Class Loader Instances')).toBeInTheDocument();
      expect(screen.getByText('Class Loader Classes')).toBeInTheDocument();
    });

    it('should display null problem fields tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const fieldsTab = screen.getByRole('tab', { name: 'Null Problem Fields' });
      expect(fieldsTab).toBeInTheDocument();
      expect(fieldsTab).toBeVisible();

      await act(async () => {
        await user.click(fieldsTab);
      });

      ['Class', 'Instances', 'Overhead', 'Problem Type'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display object histogram tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const histogramTab = screen.getByRole('tab', { name: 'Object Histogram' });
      expect(histogramTab).toBeInTheDocument();
      expect(histogramTab).toBeVisible();

      await act(async () => {
        await user.click(histogramTab);
      });

      ['Class', 'Instances', 'Shallow Size', 'Inclusive Size'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display collections tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const collectionsTab = screen.getByRole('tab', { name: 'Collections' });
      expect(collectionsTab).toBeInTheDocument();
      expect(collectionsTab).toBeVisible();

      await act(async () => {
        await user.click(collectionsTab);
      });

      ['Class', 'Defining Class', 'Overhead', 'Bad Objects', 'Good Collections'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display duplicate arrays tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const arraysTab = screen.getByRole('tab', { name: 'Duplicate Arrays' });
      expect(arraysTab).toBeInTheDocument();
      expect(arraysTab).toBeVisible();

      await act(async () => {
        await user.click(arraysTab);
      });

      ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects', 'Non Duplicate Arrays'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display high size objects tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const objectsTab = screen.getByRole('tab', { name: 'High Size Objects' });
      expect(objectsTab).toBeInTheDocument();
      expect(objectsTab).toBeVisible();

      await act(async () => {
        await user.click(objectsTab);
      });

      ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display duplicate strings tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const stringsTab = screen.getByRole('tab', { name: 'Duplicate Strings' });
      expect(stringsTab).toBeInTheDocument();
      expect(stringsTab).toBeVisible();

      await act(async () => {
        await user.click(stringsTab);
      });

      [
        'Class and Field',
        'Defining Class',
        'Overhead',
        'Bad Objects',
        'Backing Char Array Memory',
        'Non Duplicate Strings',
      ].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });

    it('should display weak hash maps tab correctly', async () => {
      const { user } = await setupWithSelectedHeapDump();

      const weakHashMapsTab = screen.getByRole('tab', { name: 'Weak HashMaps' });
      expect(weakHashMapsTab).toBeInTheDocument();
      expect(weakHashMapsTab).toBeVisible();

      await act(async () => {
        await user.click(weakHashMapsTab);
      });

      ['Class and Field', 'Defining Class', 'Overhead', 'Bad Objects'].forEach((text) => {
        const header = screen.getByRole('columnheader', { name: text });
        expect(header).toBeInTheDocument();
        expect(header).toBeVisible();
      });
    });
  });
});
