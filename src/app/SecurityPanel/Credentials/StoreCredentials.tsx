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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { JmxAuthDescription } from '@app/Shared/Components/JmxAuthDescription';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { StoredCredential, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, sortResources } from '@app/utils/utils';
import {
  Badge,
  Button,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownToggleCheckbox,
  EmptyState,
  EmptyStateIcon,
  Popover,
  Text,
  TextContent,
  TextVariants,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, SearchIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { forkJoin } from 'rxjs';
import { SecurityCard } from '../types';
import { CreateCredentialModal } from './CreateCredentialModal';
import { MatchedTargetsTable } from './MatchedTargetsTable';

export const includesCredential = (credentials: StoredCredential[], credential: StoredCredential): boolean => {
  return credentials.some((cred) => cred.id === credential.id);
};

const enum Actions {
  HANDLE_REFRESH,
  HANDLE_CREDENTIALS_STORED_NOTIFICATION,
  HANDLE_CREDENTIALS_DELETED_NOTIFICATION,
  HANDLE_ROW_CHECK,
  HANDLE_HEADER_CHECK,
  HANDLE_NO_MATCH_ROW_CHECK,
  HANDLE_ATLEAST_ONE_MATCH_ROW_CHECK,
  HANDLE_TOGGLE_EXPANDED,
}

interface State {
  credentials: StoredCredential[];
  expandedCredentials: StoredCredential[];
  checkedCredentials: StoredCredential[];
  isHeaderChecked: boolean;
}

const reducer = (state: State, action) => {
  switch (action.type) {
    case Actions.HANDLE_REFRESH: {
      const credentials: StoredCredential[] = action.payload.credentials;
      const updatedCheckedCredentials = state.checkedCredentials.filter((cred) =>
        includesCredential(credentials, cred),
      );
      const updatedExpandedCredentials = state.expandedCredentials.filter((cred) =>
        includesCredential(credentials, cred),
      );

      return {
        ...state,
        credentials: credentials,
        expandedCredentials: updatedExpandedCredentials,
        checkedCredentials: updatedCheckedCredentials,
        isHeaderChecked:
          updatedCheckedCredentials.length > 0 && updatedCheckedCredentials.length === credentials.length,
      };
    }
    case Actions.HANDLE_CREDENTIALS_STORED_NOTIFICATION: {
      return {
        ...state,
        credentials: state.credentials.concat(action.payload.credential),
        isHeaderChecked: false,
      };
    }
    case Actions.HANDLE_CREDENTIALS_DELETED_NOTIFICATION: {
      const deletedCredential: StoredCredential = action.payload.credential;
      const updatedCheckedCredentials = state.checkedCredentials.filter((o) => o.id !== deletedCredential.id);

      return {
        ...state,
        credentials: state.credentials.filter((o) => o.id !== deletedCredential.id),
        expandedCredentials: state.expandedCredentials.filter((o) => o.id !== deletedCredential.id),
        checkedCredentials: updatedCheckedCredentials,
        isHeaderChecked: updatedCheckedCredentials.length > 0 && state.isHeaderChecked,
      };
    }
    case Actions.HANDLE_ROW_CHECK: {
      if (action.payload.checked) {
        const checkedCredentials = state.checkedCredentials.concat(action.payload.credential);
        return {
          ...state,
          checkedCredentials,
          isHeaderChecked: checkedCredentials.length === state.credentials.length,
        };
      } else {
        return {
          ...state,
          checkedCredentials: state.checkedCredentials.filter((o) => o.id !== action.payload.credential.id),
          isHeaderChecked: false,
        };
      }
    }
    case Actions.HANDLE_HEADER_CHECK: {
      return {
        ...state,
        checkedCredentials: action.payload.checked ? [...state.credentials] : [],
        isHeaderChecked: action.payload.checked,
      };
    }
    case Actions.HANDLE_ATLEAST_ONE_MATCH_ROW_CHECK:
    case Actions.HANDLE_NO_MATCH_ROW_CHECK: {
      const noMatch = action.payload.noMatch;
      const checkedCredentials = state.credentials.filter(({ numMatchingTargets }) =>
        noMatch ? numMatchingTargets === 0 : numMatchingTargets > 0,
      );
      return {
        ...state,
        checkedCredentials,
        isHeaderChecked: checkedCredentials.length === state.credentials.length,
      };
    }
    case Actions.HANDLE_TOGGLE_EXPANDED: {
      const credential: StoredCredential = action.payload.credential;
      const matched = state.expandedCredentials.some((o) => o.id === credential.id);
      const updated = state.expandedCredentials.filter((o) => o.id !== credential.id);
      if (!matched) {
        updated.push(credential);
      }
      return {
        ...state,
        expandedCredentials: updated,
      };
    }
    default: {
      return state;
    }
  }
};

const tableColumns: TableColumn[] = [
  {
    title: 'Match Expression',
    keyPaths: ['matchExpression'],
    sortable: true,
  },
  {
    title: 'Matches',
    keyPaths: ['numMatchingTargets'],
    sortable: true,
  },
];

const tableTitle = 'Stored Credentials';

export const StoreCredentials = () => {
  const context = React.useContext(ServiceContext);
  const [state, dispatch] = React.useReducer(reducer, {
    credentials: [] as StoredCredential[],
    expandedCredentials: [] as StoredCredential[],
    checkedCredentials: [] as StoredCredential[],
    isHeaderChecked: false,
  } as State);
  const [sortBy, getSortParams] = useSort();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const refreshStoredCredentialsAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getCredentials().subscribe((credentials: StoredCredential[]) => {
        dispatch({ type: Actions.HANDLE_REFRESH, payload: { credentials: credentials } });
        setIsLoading(false);
      }),
    );
  }, [addSubscription, context.api, setIsLoading]);

  React.useEffect(() => {
    refreshStoredCredentialsAndCounts();
  }, [refreshStoredCredentialsAndCounts]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshStoredCredentialsAndCounts(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshStoredCredentialsAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.CredentialsStored).subscribe((v) => {
        dispatch({ type: Actions.HANDLE_CREDENTIALS_STORED_NOTIFICATION, payload: { credential: v.message } });
      }),
    );
  }, [addSubscription, context, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.CredentialsDeleted)
        .subscribe((v) =>
          dispatch({ type: Actions.HANDLE_CREDENTIALS_DELETED_NOTIFICATION, payload: { credential: v.message } }),
        ),
    );
  }, [addSubscription, context, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe((_) => refreshStoredCredentialsAndCounts()),
    );
  }, [addSubscription, refreshStoredCredentialsAndCounts, context, context.notificationChannel, context.api]);

  const handleHeaderCheck = React.useCallback(
    (checked: boolean) => {
      dispatch({ type: Actions.HANDLE_HEADER_CHECK, payload: { checked: checked } });
    },
    [dispatch],
  );

  const handleDeleteCredentials = React.useCallback(() => {
    addSubscription(
      forkJoin(state.checkedCredentials.map((credential) => context.api.deleteCredentials(credential.id))).subscribe(),
    );
  }, [state.checkedCredentials, context.api, addSubscription]);

  const handleAuthModalOpen = React.useCallback(() => {
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  const handleAuthModalClose = React.useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteCredentials)) {
      setWarningModalOpen(true);
    } else {
      handleDeleteCredentials();
    }
  }, [context.settings, setWarningModalOpen, handleDeleteCredentials]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const TargetCredentialsToolbar = () => {
    const buttons = React.useMemo(() => {
      const arr = [
        <Button key="add" variant="primary" aria-label="add-credential" onClick={handleAuthModalOpen}>
          Add
        </Button>,
        <Button
          key="delete"
          variant="danger"
          aria-label="delete-selected-credential"
          onClick={handleDeleteButton}
          isDisabled={!state.checkedCredentials.length}
        >
          Delete
        </Button>,
      ];
      return (
        <>
          {arr.map((btn, idx) => (
            <ToolbarItem key={idx}>{btn}</ToolbarItem>
          ))}
        </>
      );
    }, []);

    const deleteCredentialModal = React.useMemo(() => {
      return (
        <DeleteWarningModal
          warningType={DeleteOrDisableWarningType.DeleteCredentials}
          visible={warningModalOpen}
          onAccept={handleDeleteCredentials}
          onClose={handleWarningModalClose}
        />
      );
    }, []);

    return (
      <Toolbar id="target-credentials-toolbar">
        <ToolbarContent>{buttons}</ToolbarContent>
        {deleteCredentialModal}
      </Toolbar>
    );
  };

  const matchExpressionRows = React.useMemo(() => {
    return sortResources(sortBy, state.credentials, tableColumns).map((credential, idx) => {
      const isExpanded = includesCredential(state.expandedCredentials, credential);
      const isChecked = includesCredential(state.checkedCredentials, credential);

      const handleToggleExpanded = () => {
        dispatch({ type: Actions.HANDLE_TOGGLE_EXPANDED, payload: { credential: credential } });
      };

      const handleRowCheck = (checked: boolean) => {
        dispatch({ type: Actions.HANDLE_ROW_CHECK, payload: { checked: checked, credential: credential } });
      };

      return (
        <Tr key={`${idx}_parent`}>
          <Td
            key={`credentials-table-row-${idx}_0`}
            id={`credentials-ex-toggle-${idx}`}
            aria-controls={`credentials-ex-expand-${idx}`}
            expand={{
              rowIndex: idx,
              isExpanded: isExpanded,
              onToggle: handleToggleExpanded,
            }}
          />
          <Td key={`credentials-table-row-${idx}_1`}>
            <Checkbox
              name={`credentials-table-row-${idx}-check`}
              onChange={handleRowCheck}
              isChecked={isChecked}
              id={`credentials-table-row-${idx}-check`}
              aria-label={`credentials-table-row-${idx}-check`}
            />
          </Td>
          <Td key={`credentials-table-row-${idx}_2`} dataLabel={tableColumns[0].title}>
            {credential.matchExpression}
          </Td>
          <Td key={`credentials-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Badge key={`${idx}_count`}>{credential.numMatchingTargets}</Badge>
          </Td>
        </Tr>
      );
    });
  }, [state.credentials, state.expandedCredentials, state.checkedCredentials, sortBy]);

  const targetRows = React.useMemo(() => {
    return state.credentials.map((credential, idx) => {
      const isExpanded: boolean = includesCredential(state.expandedCredentials, credential);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded}>
          <Td key={`credentials-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 2}>
            {isExpanded ? (
              <ExpandableRowContent>
                <MatchedTargetsTable id={credential.id} matchExpression={credential.matchExpression} />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>
      );
    });
  }, [state.credentials, state.expandedCredentials]);

  const rowPairs = React.useMemo(() => {
    const rowPairs: JSX.Element[] = [];
    for (let i = 0; i < matchExpressionRows.length; i++) {
      rowPairs.push(matchExpressionRows[i]);
      rowPairs.push(targetRows[i]);
    }
    return rowPairs;
  }, [matchExpressionRows, targetRows]);

  const handleNoMatchSelect = React.useCallback(() => {
    dispatch({ type: Actions.HANDLE_NO_MATCH_ROW_CHECK, payload: { noMatch: true } });
  }, [dispatch]);

  const handleAtLeatOneSelect = React.useCallback(() => {
    dispatch({ type: Actions.HANDLE_ATLEAST_ONE_MATCH_ROW_CHECK, payload: { noMatch: false } });
  }, []);

  let content: JSX.Element;
  if (isLoading) {
    content = (
      <>
        <LoadingView />
      </>
    );
  } else if (state.credentials.length === 0) {
    content = (
      <>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No {tableTitle}
          </Title>
        </EmptyState>
      </>
    );
  } else {
    content = (
      <>
        <TableComposable aria-label={tableTitle}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              <Th key="table-header-check-all">
                <CheckBoxActions
                  isSelectAll={state.isHeaderChecked}
                  onSelectAll={handleHeaderCheck}
                  onAtLeastOneMatchSelect={handleAtLeatOneSelect}
                  onNoMatchSelect={handleNoMatchSelect}
                />
              </Th>
              {tableColumns.map(({ title }, index) => (
                <Th
                  key={`table-header-${title}`}
                  width={title === 'Match Expression' ? 80 : 10}
                  sort={getSortParams(index)}
                >
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{rowPairs}</Tbody>
        </TableComposable>
      </>
    );
  }

  return (
    <>
      <TargetCredentialsToolbar />
      {content}
      <CreateCredentialModal
        visible={showAuthModal}
        onDismiss={handleAuthModalClose}
        onPropsSave={handleAuthModalClose}
      />
    </>
  );
};

interface CheckBoxActionsProps {
  onNoMatchSelect?: () => void;
  onAtLeastOneMatchSelect?: () => void;
  onSelectAll?: (selected: boolean) => void;
  isSelectAll?: boolean;
}

export const CheckBoxActions: React.FC<CheckBoxActionsProps> = ({
  onNoMatchSelect,
  onAtLeastOneMatchSelect,
  onSelectAll,
  isSelectAll,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = React.useCallback(() => setIsOpen((old) => !old), [setIsOpen]);

  const dropdownItems = React.useMemo(() => {
    return [
      <DropdownItem key="action" onClick={onNoMatchSelect}>
        No Match Only
      </DropdownItem>,
      <DropdownItem key="action" onClick={onAtLeastOneMatchSelect}>{`>= 1 Match Only`}</DropdownItem>,
    ];
  }, [onNoMatchSelect, onAtLeastOneMatchSelect]);

  return (
    <Dropdown
      {...props}
      onSelect={() => {
        setIsOpen(false);
      }}
      toggle={
        <DropdownToggle
          splitButtonItems={[
            <DropdownToggleCheckbox
              id="select-all-credentials"
              key="select-all-credentials"
              aria-label="Select all"
              isChecked={isSelectAll}
              onChange={onSelectAll}
            />,
          ]}
          onToggle={handleToggle}
          id="select-all-toggle"
        />
      }
      isOpen={isOpen}
      dropdownItems={dropdownItems}
      menuAppendTo={document.body}
    />
  );
};

export const StoreCredentialsCard: SecurityCard = {
  key: 'credentials',
  title: (
    <Text>
      Store Credentials
      <Popover maxWidth="40rem" headerContent="JMX Authentication" bodyContent={<JmxAuthDescription />}>
        <Button variant="plain">
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </Text>
  ),
  description: (
    <TextContent>
      <Text component={TextVariants.small}>
        Credentials that Cryostat uses to connect to Cryostat agents or target JVMs over JMX are stored in encrypted
        storage.
      </Text>
      <Text component={TextVariants.small}>
        The locally-stored client credentials held by your browser session are not displayed here. See{' '}
        <Link to="/settings?tab=advanced">Settings</Link> to configure locally-stored credentials.
      </Text>
    </TextContent>
  ),
  content: StoreCredentials,
};
