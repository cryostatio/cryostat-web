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
import { MatchExpressionDisplay } from '@app/Shared/Components/MatchExpression/MatchExpressionDisplay';
import { StoredCredential, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, sortResources, portalRoot } from '@app/utils/utils';
import {
  Button,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  Popover,
  Text,
  TextContent,
  TextVariants,
  EmptyStateHeader,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggleElement,
  MenuToggle,
  MenuToggleCheckbox,
  Icon,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  SearchInput,
  Bullseye,
} from '@patternfly/react-core';
import { ContainerNodeIcon, OutlinedQuestionCircleIcon, SearchIcon } from '@patternfly/react-icons';
import {
  ExpandableRowContent,
  InnerScrollContainer,
  OuterScrollContainer,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { TFunction } from 'i18next';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
    width: 80,
  },
  {
    title: 'Matches',
    keyPaths: ['numMatchingTargets'],
    sortable: true,
    width: 10,
  },
];

export const StoredCredentials = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
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
  const [searchText, setSearchText] = React.useState('');

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

  const targetCredentialsToolbar = React.useMemo(() => {
    const buttons = [
      <Button
        key="add"
        variant="primary"
        aria-label={t('StoredCredentials.ARIA_LABELS.Add')}
        onClick={handleAuthModalOpen}
      >
        {t('ADD', { ns: 'common' })}
      </Button>,
      <Button
        key="delete"
        variant="danger"
        aria-label={t('StoredCredentials.ARIA_LABELS.Delete')}
        onClick={handleDeleteButton}
        isDisabled={!state.checkedCredentials.length}
      >
        {t('DELETE', { ns: 'common' })}
      </Button>,
    ];

    return (
      <>
        <Toolbar id="all-targets-toolbar">
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <SearchInput
                  placeholder={t('StoredCredentials.SEARCH_PLACEHOLDER')}
                  value={searchText}
                  onChange={(_, val) => setSearchText(val)}
                  onClear={() => setSearchText('')}
                />
              </ToolbarItem>
            </ToolbarGroup>
            <ToolbarItem variant="separator" />
            <ToolbarGroup variant="button-group">
              {buttons.map((btn, idx) => (
                <ToolbarItem key={idx}>{btn}</ToolbarItem>
              ))}
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
        <DeleteWarningModal
          warningType={DeleteOrDisableWarningType.DeleteCredentials}
          visible={warningModalOpen}
          onAccept={handleDeleteCredentials}
          onClose={handleWarningModalClose}
        />
      </>
    );
  }, [
    t,
    handleAuthModalOpen,
    handleDeleteButton,
    warningModalOpen,
    handleDeleteCredentials,
    handleWarningModalClose,
    state.checkedCredentials.length,
    searchText,
  ]);

  const filteredCredentials = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(searchText), 'i');
    return state.credentials.filter((c) => reg.test(c.matchExpression));
  }, [searchText, state.credentials]);

  const matchExpressionRows = React.useMemo(() => {
    return sortResources(sortBy, filteredCredentials, tableColumns).map((credential, idx) => {
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
              onChange={(_event, checked: boolean) => handleRowCheck(checked)}
              isChecked={isChecked}
              id={`credentials-table-row-${idx}-check`}
              aria-label={t('StoredCredentials.ARIA_LABELS.ROW_CHECKBOX', { index: idx })}
            />
          </Td>
          <Td key={`credentials-table-row-${idx}_2`} dataLabel={tableColumns[0].title}>
            <MatchExpressionDisplay matchExpression={credential.matchExpression} />
          </Td>
          <Td key={`credentials-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Button variant="plain" onClick={() => handleToggleExpanded()}>
              <Icon iconSize="md">
                <ContainerNodeIcon />
              </Icon>
              <span style={{ marginLeft: 'var(--pf-v5-global--spacer--sm)' }}>{credential.numMatchingTargets}</span>
            </Button>
          </Td>
        </Tr>
      );
    });
  }, [filteredCredentials, state.expandedCredentials, state.checkedCredentials, sortBy, t]);

  const targetRows = React.useMemo(() => {
    return filteredCredentials.map((credential, idx) => {
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
  }, [filteredCredentials, state.expandedCredentials]);

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
  } else if (matchExpressionRows.length === 0) {
    content = (
      <>
        <Bullseye>
          <EmptyState>
            <EmptyStateHeader
              titleText={<>{t('StoredCredentials.NO_CREDENTIAL_TITLE')}</>}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        </Bullseye>
      </>
    );
  } else {
    content = (
      <>
        <Table aria-label={t('StoredCredentials.ARIA_LABELS.TABLE')} isStickyHeader>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              <Th key="table-header-check-all" width={10}>
                <CheckBoxActions
                  isSelectAll={matchExpressionRows.length > 0 && state.isHeaderChecked}
                  onSelectAll={handleHeaderCheck}
                  onAtLeastOneMatchSelect={handleAtLeatOneSelect}
                  onNoMatchSelect={handleNoMatchSelect}
                />
              </Th>
              {tableColumns.map(({ title, width }, index) => (
                <Th key={`table-header-${title}`} width={width} sort={getSortParams(index)}>
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{rowPairs}</Tbody>
        </Table>
      </>
    );
  }

  return (
    <>
      {targetCredentialsToolbar}
      <OuterScrollContainer className="credentials-table-outer-container">
        <InnerScrollContainer className="credentials-table-inner-container">{content}</InnerScrollContainer>
      </OuterScrollContainer>
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
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = React.useCallback(() => setIsOpen((isOpen) => !isOpen), [setIsOpen]);

  const dropdownItems = React.useMemo(() => {
    return [
      <DropdownItem key="action" onClick={onNoMatchSelect}>
        {t('StoredCredentials.NO_MATCH')}
      </DropdownItem>,
      <DropdownItem key="action" onClick={onAtLeastOneMatchSelect}>
        {t('StoredCredentials.AT_LEAST_ONE_MATCH')}
      </DropdownItem>,
    ];
  }, [onNoMatchSelect, onAtLeastOneMatchSelect, t]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={handleToggle}
        splitButtonOptions={{
          items: [
            <MenuToggleCheckbox
              id={'select-all-credentials'}
              key={'select-all-credentials'}
              aria-label={t('StoredCredentials.ARIA_LABELS.FILTER_CHECKBOX')}
              isChecked={isSelectAll}
              onChange={onSelectAll}
            />,
          ],
        }}
      />
    ),
    [handleToggle, isSelectAll, onSelectAll, t],
  );

  return (
    <Dropdown
      onSelect={() => setIsOpen(false)}
      toggle={toggle}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
      popperProps={{
        enableFlip: true,
        appendTo: portalRoot,
      }}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};

export const StoredCredentialsCard: SecurityCard = {
  key: 'credentials',
  title: (t: TFunction) => (
    <Text>
      {t('StoredCredentials.CARD_TITLE')}
      <Popover
        maxWidth="40rem"
        headerContent={t('StoredCredentials.CARD_TITLE_POPOVER_HEADER')}
        bodyContent={<JmxAuthDescription />}
      >
        <Button variant="plain">
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </Text>
  ),
  description: (t: TFunction) => (
    <TextContent>
      <Text component={TextVariants.small}>{t('StoredCredentials.CARD_DESCRIPTION')}</Text>
    </TextContent>
  ),
  content: StoredCredentials,
  isFilled: true,
};
