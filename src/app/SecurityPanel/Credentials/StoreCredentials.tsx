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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { StoredCredential } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { evaluateTargetWithExpr, sortResources } from '@app/utils/utils';
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
  Text,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { concatMap, forkJoin, Observable, of } from 'rxjs';
import { SecurityCard } from '../SecurityPanel';
import { CreateCredentialModal } from './CreateCredentialModal';
import { MatchedTargetsTable } from './MatchedTargetsTable';

const enum Actions {
  HANDLE_REFRESH,
  HANDLE_TARGET_NOTIFICATION,
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
      return {
        ...state,
        credentials: credentials,
      };
    }
    case Actions.HANDLE_TARGET_NOTIFICATION: {
      return {
        ...state,
        credentials: state.credentials.map((credential) => {
          let matched = false;
          try {
            const res = evaluateTargetWithExpr(action.payload.target, credential.matchExpression);
            if (typeof res === 'boolean') {
              matched = res;
            }
          } catch (_error) {
            matched = false;
          }
          if (matched) {
            const delta = action.payload.kind === 'FOUND' ? 1 : -1;
            return {
              ...credential,
              numMatchingTargets: credential.numMatchingTargets + delta,
            };
          }
          return credential;
        }),
      };
    }
    case Actions.HANDLE_CREDENTIALS_STORED_NOTIFICATION: {
      return {
        ...state,
        credentials: state.credentials.concat(action.payload.credential),
      };
    }
    case Actions.HANDLE_CREDENTIALS_DELETED_NOTIFICATION: {
      const deletedCredential: StoredCredential = action.payload.credential;
      let deletedIdx;
      for (deletedIdx = 0; deletedIdx < state.credentials.length; deletedIdx++) {
        if (_.isEqual(deletedCredential, state.credentials[deletedIdx])) break;
      }
      const updatedCheckedCredentials = state.checkedCredentials.filter((o) => !_.isEqual(o, deletedCredential));

      return {
        ...state,
        credentials: state.credentials.filter((o) => !_.isEqual(o, deletedCredential)),
        expandedCredentials: state.expandedCredentials.filter((o) => !_.isEqual(o, deletedCredential)),
        checkedCredentials: updatedCheckedCredentials,
        isHeaderChecked: updatedCheckedCredentials.length === 0 ? false : state.isHeaderChecked,
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
          checkedCredentials: state.checkedCredentials.filter((o) => !_.isEqual(o, action.payload.credential)),
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
        noMatch ? numMatchingTargets === 0 : numMatchingTargets > 0
      );
      return {
        ...state,
        checkedCredentials,
        isHeaderChecked: checkedCredentials.length === state.credentials.length,
      };
    }
    case Actions.HANDLE_TOGGLE_EXPANDED: {
      const credential: StoredCredential = action.payload.credential;
      const idx = state.expandedCredentials.indexOf(credential);
      const updated =
        idx >= 0
          ? [
              ...state.expandedCredentials.slice(0, idx),
              ...state.expandedCredentials.slice(idx + 1, state.expandedCredentials.length),
            ]
          : [...state.expandedCredentials, credential];

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

const tableColumns = [
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

const mapper = (index?: number) => {
  if (index !== undefined) {
    return tableColumns[index].keyPaths;
  }
  return undefined;
};

const getTransform = (_index?: number) => undefined;

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
      })
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
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshStoredCredentialsAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.CredentialsStored).subscribe((v) => {
        dispatch({ type: Actions.HANDLE_CREDENTIALS_STORED_NOTIFICATION, payload: { credential: v.message } });
      })
    );
  }, [addSubscription, context, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.CredentialsDeleted)
        .pipe(
          concatMap((v) =>
            of(dispatch({ type: Actions.HANDLE_CREDENTIALS_DELETED_NOTIFICATION, payload: { credential: v.message } }))
          )
        )
        .subscribe(() => undefined /* do nothing - dispatch will have already handled updating state */)
    );
  }, [addSubscription, context, context.notificationChannel]);

  const handleTargetNotification = (evt: TargetDiscoveryEvent) => {
    dispatch({ type: Actions.HANDLE_TARGET_NOTIFICATION, payload: { target: evt.serviceRef, kind: evt.kind } });
  };

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .pipe(concatMap((v) => of(handleTargetNotification(v.message.event))))
        .subscribe(() => undefined /* do nothing - dispatch will have already handled updating state */)
    );
  }, [addSubscription, context, context.notificationChannel]);

  const handleHeaderCheck = React.useCallback((checked: boolean) => {
    dispatch({ type: Actions.HANDLE_HEADER_CHECK, payload: { checked: checked } });
  }, []);

  const handleDeleteCredentials = React.useCallback(() => {
    const tasks: Observable<boolean>[] = [];
    state.credentials.forEach((credential) => {
      if (state.checkedCredentials.includes(credential)) {
        tasks.push(context.api.deleteCredentials(credential.id));
      }
    });
    addSubscription(forkJoin(tasks).subscribe());
  }, [state.credentials, state.checkedCredentials, context.api, addSubscription]);

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
    return sortResources(sortBy, state.credentials, mapper, getTransform).map((credential, idx) => {
      const isExpanded: boolean = state.expandedCredentials.includes(credential);
      const isChecked: boolean = state.checkedCredentials.includes(credential);

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
      const isExpanded: boolean = state.expandedCredentials.includes(credential);

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
  title: 'Store Credentials',
  description: (
    <Text>
      Credentials that Cryostat uses to connect to Cryostat agents or target JVMs over JMX are stored here. These are
      stored in encrypted storage managed by the Cryostat backend. These credentials may be used for manually managing
      recordings and event templates on target JVMs, as well as for Automated Rules which run in the background and open
      unattended target connections. Any locally-stored client credentials held by your browser session are not
      displayed here. See <Link to="/settings">Settings</Link> to configure locally-stored credentials.
    </Text>
  ),
  content: StoreCredentials,
};
