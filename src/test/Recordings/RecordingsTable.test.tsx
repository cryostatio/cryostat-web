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
import { RecordingsTable } from '@app/Recordings/RecordingsTable';
import { Button, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tbody, Tr, Td } from '@patternfly/react-table';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { render } from '../utils';

const FakeToolbar = () => {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>
            <Button>Fake Button</Button>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

const fakeTableTitle = 'Test Table';

const fakeColumnConfig = {
  columns: [
    {
      title: 'Column 1',
      keyPaths: ['col1'],
      sortable: true,
    },
    {
      title: 'Column 2',
      keyPaths: ['col2'],
    },
  ],
  onSort: jest.fn(),
};

const fakeTableRows = (
  <Tbody>
    <Tr key="fake-row-1">
      <Td></Td>
      <Td key="data-1">Row 1: Fake Column 1 Data</Td>
      <Td key="data-2">Row 1: Fake Column 2 Data</Td>
    </Tr>
    <Tr key="fake-row-2">
      <Td key="data-3">Row 2: Fake Column 1 Data</Td>
      <Td key="data-4">Row 2: Fake Column 2 Data</Td>
      <Td></Td>
    </Tr>
  </Tbody>
);

const mockHeaderCheckCallback = jest.fn((_event, _checked) => {
  /* do nothing */
});

describe('<RecordingsTable />', () => {
  afterEach(cleanup);

  it('correctly displays the toolbar prop', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    expect(screen.getByText('Fake Button')).toBeInTheDocument();
  });

  it('handles a non-nested table', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    expect(screen.getByLabelText('Test Table')).toBeInTheDocument();
    expect(screen.getByText(fakeColumnConfig.columns[0].title)).toBeInTheDocument();
    expect(screen.getByText(fakeColumnConfig.columns[1].title)).toBeInTheDocument();
    expect(screen.getByText('Row 1: Fake Column 1 Data')).toBeInTheDocument();
    expect(screen.getByText('Row 1: Fake Column 2 Data')).toBeInTheDocument();
    expect(screen.getByText('Row 2: Fake Column 1 Data')).toBeInTheDocument();
    expect(screen.getByText('Row 2: Fake Column 2 Data')).toBeInTheDocument();
  });

  it('handles a nested table with sticky header', async () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={true}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    const table = screen.getByLabelText('Test Table');
    expect(table).toHaveClass('pf-m-sticky-header');
    expect(container.getElementsByClassName('pf-c-scroll-outer-wrapper').length).toBe(1);
    expect(container.getElementsByClassName('pf-c-scroll-inner-wrapper').length).toBe(1);
  });

  it('handles the case where an error occurs', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={false}
                errorMessage="some error"
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    expect(screen.getByText('some error')).toBeInTheDocument();
  });

  it('renders correctly when table data is still loading', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={true}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveAttribute('aria-valuetext', 'Loading...');
  });

  it('handles an empty table', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={true}
                isLoading={false}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    expect(screen.getByText(`No ${fakeTableTitle}`)).toBeInTheDocument();
  });

  it('handles the header checkbox callback correctly', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={false}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    const headerCheckAll = screen.getByLabelText('Select all rows');
    expect(headerCheckAll).not.toHaveAttribute('checked');
    await user.click(headerCheckAll);
    expect(mockHeaderCheckCallback).toHaveBeenCalledTimes(1);
  });

  it('renders the header checkbox as checked if props.isHeaderChecked == true', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingsTable
                toolbar={<FakeToolbar />}
                tableColumns={fakeColumnConfig}
                tableTitle={fakeTableTitle}
                isEmpty={false}
                isLoading={false}
                isNestedTable={false}
                errorMessage=""
                isHeaderChecked={true}
                onHeaderCheck={mockHeaderCheckCallback}
              >
                {fakeTableRows}
              </RecordingsTable>
            ),
          },
        ],
      },
    });

    const headerCheckAll = screen.getByLabelText('Select all rows');
    expect(headerCheckAll).toHaveAttribute('checked');
  });
});
