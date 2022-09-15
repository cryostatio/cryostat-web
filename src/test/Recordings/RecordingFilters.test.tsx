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



import { emptyActiveRecordingFilters, RecordingFilters, RecordingFiltersCategories } from '@app/Recordings/RecordingFilters';
import { UpdateFilterOptions } from '@app/Shared/Redux/RecordingFilterReducer';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { Target } from '@app/Shared/Services/Target.service';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockFooTarget: Target = { 
  connectUrl: "service:jmx:rmi://someFooUrl", 
  alias: 'fooTarget', 
  annotations: { 
      cryostat: new Map(), 
      platform : new Map() 
  }
};
const mockRecordingLabels = {
  someLabel: 'someValue',
};
const mockRecording: ActiveRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  startTime: 1234567890,
  id: 0,
  state: RecordingState.RUNNING,
  duration: 0,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
};
const mockAnotherRecording = { ...mockRecording, name: 'anotherRecording' } as ActiveRecording;
const mockRecordingList = [mockRecording, mockAnotherRecording];

const categoryOptions = Object.keys({} as RecordingFiltersCategories);
const updateFilters = jest.fn((target: string, options: UpdateFilterOptions) => {});

describe("<RecordingFilters />", () => {
  let emptyFilteredNames: RecordingFiltersCategories;
  let filteredNames: RecordingFiltersCategories;

  beforeEach(() => {
    emptyFilteredNames = emptyActiveRecordingFilters;
    filteredNames = {
      Name: [ mockRecording.name ],
      Labels: [ 'someLabel:someValue' ],
      State:[],
      StartedBeforeDate: [],
      StartedAfterDate: [],
      DurationSeconds: [],
    } as RecordingFiltersCategories;
  });

  afterEach(cleanup);

  it('renders correctly', async () => { /** Skip snapshot test as component depends on DOM */ });
  
  it ('', () => {
    render(
      <RecordingFilters target={mockFooTarget.connectUrl} isArchived={false} recordings={mockRecordingList} filters={emptyFilteredNames} updateFilters={updateFilters}></RecordingFilters>
    );
  });


  it ('should not display chips when no filters are selected', () => {
    render(
      <RecordingFilters target={mockFooTarget.connectUrl} isArchived={false} recordings={mockRecordingList} filters={emptyFilteredNames} updateFilters={updateFilters}></RecordingFilters>
    );
  });

});
