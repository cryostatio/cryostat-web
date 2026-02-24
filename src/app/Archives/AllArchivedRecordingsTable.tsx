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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import {
  ArchivedRecording,
  RecordingDirectory,
  Target,
  NotificationCategory,
  EnvironmentNode,
  TargetNode,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import EntityDetails from '@app/Topology/Entity/EntityDetails';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, portalRoot, sortResources } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  SearchInput,
  EmptyState,
  EmptyStateIcon,
  Text,
  Split,
  SplitItem,
  EmptyStateHeader,
  Button,
  Icon,
  Bullseye,
  Modal,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import { FileIcon, InfoCircleIcon, SearchIcon, TopologyIcon } from '@patternfly/react-icons';
import {
  Table,
  Th,
  Thead,
  Tbody,
  Tr,
  Td,
  ExpandableRowContent,
  SortByDirection,
  OuterScrollContainer,
  InnerScrollContainer,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { getTargetFromDirectory, includesDirectory, indexOfDirectory } from './utils';

const tableColumns: TableColumn[] = [
  {
    title: 'Directory',
    keyPaths: ['connectUrl'],
    sortable: true,
    width: 80,
  },
  {
    title: 'Archives',
    keyPaths: ['recordings'],
    transform: (recordings: ArchivedRecording[], _obj: _RecordingDirectory) => {
      return recordings.length;
    },
    sortable: true,
    width: 15,
  },
];

type _RecordingDirectory = RecordingDirectory & { targetAsObs: Observable<Target> };

export interface AllArchivedRecordingsTableProps {}

export const AllArchivedRecordingsTable: React.FC<AllArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();

  const [directories, setDirectories] = React.useState<_RecordingDirectory[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [expandedDirectories, setExpandedDirectories] = React.useState<_RecordingDirectory[]>([]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedJvmId, setSelectedJvmId] = React.useState<string>('');
  const [lineageRoot, setLineageRoot] = React.useState<EnvironmentNode | undefined>(undefined);
  const [loadingLineage, setLoadingLineage] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const findInnermostTargetNode = React.useCallback((node: EnvironmentNode | TargetNode): TargetNode | undefined => {
    if ('target' in node) {
      // This is a TargetNode
      return node as TargetNode;
    }
    // This is an EnvironmentNode, recurse through children
    const envNode = node as EnvironmentNode;
    if (envNode.children && envNode.children.length > 0) {
      // Try to find a TargetNode in children, preferring the last child (innermost)
      for (let i = envNode.children.length - 1; i >= 0; i--) {
        const result = findInnermostTargetNode(envNode.children[i]);
        if (result) return result;
      }
    }
    return undefined;
  }, []);

  // Fetch lineage data when modal opens
  React.useEffect(() => {
    if (!showDetailsModal || !selectedJvmId) {
      return;
    }
    setLoadingLineage(true);
    setLineageRoot(undefined);
    addSubscription(
      context.api.getTargetLineage(selectedJvmId).subscribe({
        next: (root) => {
          setLineageRoot(root);
          setLoadingLineage(false);
        },
        error: (_) => {
          setLineageRoot(undefined);
          setLoadingLineage(false);
        },
      }),
    );
  }, [showDetailsModal, selectedJvmId, addSubscription, context.api]);

  const wrappedTarget = React.useMemo(() => {
    if (!lineageRoot) {
      return undefined;
    }
    const targetNode = findInnermostTargetNode(lineageRoot);
    if (!targetNode) {
      return undefined;
    }
    return {
      getData: () => targetNode,
    };
  }, [lineageRoot, findInnermostTargetNode]);

  const handleDirectoriesAndCounts = React.useCallback(
    (directories: RecordingDirectory[]) => {
      setDirectories(directories.map((dir) => ({ ...dir, targetAsObs: of(getTargetFromDirectory(dir)) })));
      setIsLoading(false);
    },
    [setDirectories, setIsLoading],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshDirectoriesAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet<RecordingDirectory[]>('fs/recordings', 'beta').subscribe({
        next: handleDirectoriesAndCounts,
        error: handleError,
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleDirectoriesAndCounts, handleError]);

  const handleSearchInput = React.useCallback(
    (_, searchInput: string) => {
      setSearchText(searchInput);
    },
    [setSearchText],
  );

  const handleSearchInputClear = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  React.useEffect(() => {
    refreshDirectoriesAndCounts();
  }, [refreshDirectoriesAndCounts]);

  const searchedDirectories = React.useMemo(() => {
    let updatedSearchedDirectories: _RecordingDirectory[];
    if (!searchText) {
      updatedSearchedDirectories = directories;
    } else {
      const reg = new RegExp(_.escape(searchText), 'i');
      updatedSearchedDirectories = directories.filter(
        (d: _RecordingDirectory) => reg.test(d.jvmId) || reg.test(d.connectUrl),
      );
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updatedSearchedDirectories,
      tableColumns,
    );
  }, [directories, searchText, sortBy]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      }),
    );
  }, [context, context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshDirectoriesAndCounts(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated).subscribe((event) => {
        const updatedRecordingInfo = event.message;

        setDirectories((currentDirectories) => {
          const newDirectories = currentDirectories.map((directory) => ({
            ...directory,
            recordings: directory.recordings.map((recording) => {
              if (recording.name === updatedRecordingInfo.recording.name) {
                return {
                  ...recording,
                  metadata: { ...recording.metadata, labels: updatedRecordingInfo?.recording?.metadata?.labels },
                };
              }
              return recording;
            }),
          }));

          return newDirectories;
        });
      }),
    );
  }, [addSubscription, context.notificationChannel, setDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated).subscribe(() => {
        refreshDirectoriesAndCounts();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe(() => {
        refreshDirectoriesAndCounts();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  const toggleExpanded = React.useCallback(
    (dir) => {
      const idx = indexOfDirectory(expandedDirectories, dir);
      setExpandedDirectories((prevExpandedDirectories) =>
        idx >= 0
          ? [
              ...prevExpandedDirectories.slice(0, idx),
              ...prevExpandedDirectories.slice(idx + 1, prevExpandedDirectories.length),
            ]
          : [...prevExpandedDirectories, dir],
      );
    },
    [expandedDirectories, setExpandedDirectories],
  );

  const directoryRows = React.useMemo(() => {
    return searchedDirectories.map((dir, idx) => {
      const isExpanded: boolean = includesDirectory(expandedDirectories, dir);

      return (
        <Tr key={`${idx}_parent`}>
          <Td
            key={`directory-table-row-${idx}_1`}
            id={`directory-ex-toggle-${idx}`}
            aria-controls={`directory-ex-expand-${idx}`}
            expand={{
              rowIndex: idx,
              isExpanded: isExpanded,
              onToggle: () => toggleExpanded(dir),
            }}
          />
          <Td key={`directory-table-row-${idx}_2`} dataLabel={tableColumns[0].title}>
            <Split hasGutter>
              <SplitItem>
                <Text>{dir.connectUrl}</Text>
              </SplitItem>
              <SplitItem>
                <Button
                  variant="plain"
                  onClick={() => {
                    setSelectedJvmId(dir.jvmId);
                    setShowDetailsModal(true);
                  }}
                  isDisabled={!dir.jvmId}
                  aria-label="View target details"
                >
                  <InfoCircleIcon />
                </Button>
              </SplitItem>
            </Split>
          </Td>
          <Td key={`directory-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Button variant="plain" onClick={() => toggleExpanded(dir)}>
              <Icon iconSize="md">
                <FileIcon />
              </Icon>
              <span style={{ marginLeft: 'var(--pf-v5-global--spacer--sm)' }}>{dir.recordings.length || 0}</span>
            </Button>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, searchedDirectories, expandedDirectories]);

  const recordingRows = React.useMemo(() => {
    return searchedDirectories.map((dir, idx) => {
      const isExpanded: boolean = includesDirectory(expandedDirectories, dir);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded}>
          <Td key={`directory-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ArchivedRecordingsTable
                  directory={dir}
                  target={dir.targetAsObs}
                  isUploadsTable={false}
                  isNestedTable={true}
                  directoryRecordings={dir.recordings}
                />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>
      );
    });
  }, [searchedDirectories, expandedDirectories]);

  const rowPairs = React.useMemo(() => {
    const rowPairs: JSX.Element[] = [];
    for (let i = 0; i < directoryRows.length; i++) {
      rowPairs.push(directoryRows[i]);
      rowPairs.push(recordingRows[i]);
    }
    return rowPairs;
  }, [directoryRows, recordingRows]);

  let view: JSX.Element;

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  if (isError) {
    view = (
      <>
        <ErrorView
          title={'Error retrieving Archived Recordings in All Archives View'}
          message={errorMessage}
          retry={isAuthFail(errorMessage) ? authRetry : undefined}
        />
      </>
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (!searchedDirectories.length) {
    view = (
      <>
        <Bullseye>
          <EmptyState>
            <EmptyStateHeader
              titleText={t('RecordingsTable.NO_ARCHIVES')}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        </Bullseye>
      </>
    );
  } else {
    view = (
      <Table aria-label="all-archives-table" isStickyHeader>
        <Thead>
          <Tr>
            <Th key="table-header-expand" screenReaderText="column space" />
            {tableColumns.map(({ title, width }, index) => (
              <Th
                key={`table-header-${title}`}
                width={width as React.ComponentProps<typeof Th>['width']}
                sort={getSortParams(index)}
              >
                {title}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>{rowPairs}</Tbody>
      </Table>
    );
  }

  return (
    <>
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Target Details"
        variant={ModalVariant.large}
        className="target-details-modal"
        appendTo={portalRoot}
      >
        {loadingLineage ? (
          <Bullseye>
            <Spinner />
          </Bullseye>
        ) : wrappedTarget ? (
          <EntityDetails entity={wrappedTarget} className="target-details-modal" hideActions={true} />
        ) : (
          <EmptyState>
            <EmptyStateHeader
              titleText="Target Details Unavailable"
              icon={<EmptyStateIcon icon={TopologyIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        )}
      </Modal>
      <OuterScrollContainer className="archive-table-outer-container">
        <Toolbar id="all-archives-toolbar">
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <SearchInput
                  style={{ minWidth: '30ch' }}
                  placeholder={t('AllArchivedRecordingsTable.SEARCH_PLACEHOLDER')}
                  value={searchText}
                  onChange={handleSearchInput}
                  onClear={handleSearchInputClear}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
        <InnerScrollContainer className="">{view}</InnerScrollContainer>
      </OuterScrollContainer>
    </>
  );
};
