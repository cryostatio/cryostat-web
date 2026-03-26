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

import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetAliasService } from '@app/Shared/Services/TargetAlias.service';
import { useAliasCache } from '@app/utils/hooks/useAliasCache';
import { render, waitFor } from '@testing-library/react';
import * as React from 'react';

const mockTargetAliasService = {
  aliasMap: jest.fn(),
  fetchAliases: jest.fn(),
} as unknown as TargetAliasService;

const mockContext = {
  targetAlias: mockTargetAliasService,
} as any;

// Test component that uses the hook
const TestComponent: React.FC<{ jvmIds: string[] }> = ({ jvmIds }) => {
  const aliasMap = useAliasCache(jvmIds);
  return (
    <div>
      <div data-testid="mapSize">{aliasMap.size}</div>
      <div data-testid="mapEntries">{JSON.stringify(Array.from(aliasMap.entries()))}</div>
    </div>
  );
};

describe('useAliasCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty map initially', () => {
    const { BehaviorSubject } = require('rxjs');
    const subject = new BehaviorSubject(new Map());
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={['jvm-1']} />
      </ServiceContext.Provider>
    );

    expect(getByTestId('mapSize').textContent).toBe('0');
  });

  it('should call fetchAliases with provided jvmIds', () => {
    const { BehaviorSubject } = require('rxjs');
    const subject = new BehaviorSubject(new Map());
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const jvmIds = ['jvm-1', 'jvm-2', 'jvm-3'];
    render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={jvmIds} />
      </ServiceContext.Provider>
    );

    expect(mockTargetAliasService.fetchAliases).toHaveBeenCalledWith(jvmIds);
  });

  it('should update when alias map changes', async () => {
    const { BehaviorSubject } = require('rxjs');
    const { act } = require('@testing-library/react');
    const initialMap = new Map();
    const subject = new BehaviorSubject(initialMap);
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={['jvm-1']} />
      </ServiceContext.Provider>
    );

    expect(getByTestId('mapSize').textContent).toBe('0');

    // Simulate alias being fetched
    const updatedMap = new Map([['jvm-1', 'alias-1']]);
    act(() => {
      subject.next(updatedMap);
    });

    await waitFor(() => {
      expect(getByTestId('mapSize').textContent).toBe('1');
    });

    const entries = JSON.parse(getByTestId('mapEntries').textContent || '[]');
    expect(entries).toEqual([['jvm-1', 'alias-1']]);
  });

  it('should handle multiple aliases', async () => {
    const { BehaviorSubject } = require('rxjs');
    const { act } = require('@testing-library/react');
    const initialMap = new Map();
    const subject = new BehaviorSubject(initialMap);
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={['jvm-1', 'jvm-2', 'jvm-3']} />
      </ServiceContext.Provider>
    );

    // Simulate multiple aliases being fetched
    const updatedMap = new Map([
      ['jvm-1', 'alias-1'],
      ['jvm-2', 'alias-2'],
      ['jvm-3', 'alias-3'],
    ]);
    act(() => {
      subject.next(updatedMap);
    });

    await waitFor(() => {
      expect(getByTestId('mapSize').textContent).toBe('3');
    });

    const entries = JSON.parse(getByTestId('mapEntries').textContent || '[]');
    expect(entries).toEqual([
      ['jvm-1', 'alias-1'],
      ['jvm-2', 'alias-2'],
      ['jvm-3', 'alias-3'],
    ]);
  });

  it('should sort jvmIds before fetching to ensure stable key', () => {
    const { BehaviorSubject } = require('rxjs');
    const subject = new BehaviorSubject(new Map());
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const jvmIds = ['jvm-3', 'jvm-1', 'jvm-2'];
    render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={jvmIds} />
      </ServiceContext.Provider>
    );

    // Should be called with sorted array
    expect(mockTargetAliasService.fetchAliases).toHaveBeenCalledWith(['jvm-1', 'jvm-2', 'jvm-3']);
  });

  it('should not refetch when jvmIds array reference changes but content is same', () => {
    const { BehaviorSubject } = require('rxjs');
    const subject = new BehaviorSubject(new Map());
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const { rerender } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={['jvm-1', 'jvm-2']} />
      </ServiceContext.Provider>
    );

    expect(mockTargetAliasService.fetchAliases).toHaveBeenCalledTimes(1);

    // Rerender with new array reference but same content
    rerender(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={['jvm-1', 'jvm-2']} />
      </ServiceContext.Provider>
    );

    // Should still only be called once due to memoization
    expect(mockTargetAliasService.fetchAliases).toHaveBeenCalledTimes(1);
  });

  it('should handle empty jvmIds array', () => {
    const { BehaviorSubject } = require('rxjs');
    const subject = new BehaviorSubject(new Map());
    (mockTargetAliasService.aliasMap as jest.Mock).mockReturnValue(subject.asObservable());

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmIds={[]} />
      </ServiceContext.Provider>
    );

    expect(getByTestId('mapSize').textContent).toBe('0');
    // fetchAliases is not called when jvmIdsKey is empty string
    expect(mockTargetAliasService.fetchAliases).not.toHaveBeenCalled();
  });
});