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
import { LinearDotSpinner } from '@app/Shared/Components/LinearDotSpinner';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, portalRoot, sortResources } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Label,
  LabelProps,
  Popover,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
  ValidatedOptions,
  EmptyStateHeader,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, SearchIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import {
  InnerScrollContainer,
  OuterScrollContainer,
  SortByDirection,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { TestPoolContext, useAuthCredential } from './utils';

const tableColumns: TableColumn[] = [
  {
    title: 'Target',
    keyPaths: ['alias'],
    transform: (_alias: string, target: Target) => {
      return target.alias === target.connectUrl || !target.alias
        ? `${target.connectUrl}`
        : `${target.alias} (${target.connectUrl})`;
    },
    sortable: true,
  },
  {
    title: 'Status',
  },
];

export interface CredentialTestTableProps {}

export const CredentialTestTable: React.FC<CredentialTestTableProps> = ({ ...props }) => {
  const { t } = useTranslation();
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const matchExprService = useMatchExpressionSvc();
  const [sortBy, getSortParams] = useSort();

  const [matchedExpr, setMatchExpr] = React.useState('');
  const [matchedTargets, setMatchedTargets] = React.useState<Target[]>([]);
  const [filters, setFilters] = React.useState<CredentialTestState[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        matchExprService.searchExpression().pipe(tap((exp) => setMatchExpr(exp))),
        context.targets.targets(),
      ])
        .pipe(
          tap(() => setLoading(true)),
          switchMap(([input, targets]) =>
            input ? context.api.matchTargetsWithExpr(input, targets).pipe(catchError((_) => of([]))) : of([]),
          ),
        )
        .subscribe((ts) => {
          setLoading(false);
          setMatchedTargets(ts);
        }),
    );
  }, [matchExprService, context.api, context.targets, setMatchedTargets, setLoading, addSubscription]);

  const rows = React.useMemo(() => {
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      matchedTargets,
      tableColumns,
    ).map((t) => <CredentialTestRow target={t} key={t.connectUrl} filters={filters} searchText={searchText} />);
  }, [matchedTargets, filters, searchText, sortBy]);

  const toolbar = React.useMemo(() => {
    return (
      <CredentialToolbar
        onFilter={setFilters}
        onSearch={setSearchText}
        filters={filters}
        searchText={searchText}
        matchedTargets={matchedTargets}
      />
    );
  }, [setFilters, setSearchText, filters, searchText, matchedTargets]);

  return loading ? (
    <LoadingView />
  ) : rows.length ? (
    <OuterScrollContainer>
      {toolbar}
      <InnerScrollContainer>
        <Table {...props}>
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>{t('TARGET', { ns: 'common' })}</Th>
              <Th textCenter width={20}>
                {t('STATUS', { ns: 'common' })}
              </Th>
            </Tr>
          </Thead>
          <Tbody>{rows}</Tbody>
        </Table>
      </InnerScrollContainer>
    </OuterScrollContainer>
  ) : (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.full}>
        <EmptyStateHeader
          titleText={t('CredentialTestTable.NO_TARGET_MATCHED')}
          icon={<EmptyStateIcon icon={SearchIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{`${
          matchedExpr === '' ? t('CredentialTestTable.ENTER_ANOTHER') : t('CredentialTestTable.CLEAR_AND_TRY_AGAIN')
        }`}</EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};

export enum CredentialTestState {
  NO_STATUS = 'No Status',
  INVALID = 'Invalid',
  VALID = 'Valid',
  NA = 'Not Applicable',
}

const getColor = (state: CredentialTestState): LabelProps['color'] => {
  switch (state) {
    case CredentialTestState.VALID:
      return 'green';
    case CredentialTestState.INVALID:
      return 'red';
    case CredentialTestState.NA:
      return 'orange';
    case CredentialTestState.NO_STATUS:
    default:
      return 'grey';
  }
};

interface TestStatus {
  state: CredentialTestState;
  error?: Error;
}

export interface CredentialTestRowProps {
  target: Target;
  filters?: CredentialTestState[];
  searchText?: string;
}

export const CredentialTestRow: React.FC<CredentialTestRowProps> = ({
  target,
  filters = [],
  searchText = '',
  ...props
}) => {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<TestStatus>({
    state: CredentialTestState.NO_STATUS,
    error: undefined,
  });
  const context = React.useContext(ServiceContext);
  const [loading, setLoading] = React.useState(false);
  const [credential] = useAuthCredential();
  const testPool = React.useContext(TestPoolContext);
  const addSubscription = useSubscriptions();

  const isEmptyCredential = React.useMemo(() => credential.password === '' || credential.username === '', [credential]);

  const isShowed = React.useMemo(() => {
    const regex = new RegExp(_.escapeRegExp(searchText), 'i');
    if (searchText !== '' && !(regex.test(target.alias) || regex.test(target.connectUrl))) {
      return false;
    }
    return !filters.length || filters.includes(status.state);
  }, [target, filters, searchText, status.state]);

  const handleTest = React.useCallback(() => {
    if (loading || isEmptyCredential) {
      return; // Do not repeat request or send when input fields are empty
    }
    setLoading(true);
    const test = {
      id: `test-request-for-${target.connectUrl}`,
      targetUrl: target.connectUrl,
    };
    testPool.add(test);
    addSubscription(
      context.api.checkCredentialForTarget(target, credential).subscribe((err) => {
        setLoading(false);
        testPool.delete(test);
        setStatus({
          error: err?.error,
          state: !err
            ? CredentialTestState.VALID
            : err.severeLevel === ValidatedOptions.warning
              ? CredentialTestState.NA
              : CredentialTestState.INVALID,
        });
      }),
    );
  }, [setStatus, addSubscription, context.api, target, credential, isEmptyCredential, loading, testPool]);

  return isShowed ? (
    <Tr {...props} id={`${target.connectUrl}-test-row`}>
      <Td dataLabel={t('TARGET', { ns: 'common' })}>
        {!target.alias || target.alias === target.connectUrl
          ? target.connectUrl
          : `${target.alias} (${target.connectUrl})`}
      </Td>
      <Td dataLabel={t('STATUS', { ns: 'common' })} textCenter>
        {loading ? (
          <Bullseye>
            <LinearDotSpinner />
          </Bullseye>
        ) : status.state === CredentialTestState.INVALID || status.state === CredentialTestState.NA ? (
          <Popover
            aria-label={t('CredentialTestTable.ARIA_LABELS.STATUS_POPOVER', { connectUrl: target.connectUrl })}
            alertSeverityVariant={status.state === CredentialTestState.INVALID ? 'danger' : 'warning'}
            headerIcon={
              status.state === CredentialTestState.INVALID ? <ExclamationCircleIcon /> : <WarningTriangleIcon />
            }
            headerContent={
              <div>
                {status.state === CredentialTestState.INVALID
                  ? t('CredentialTestTable.TEST_FAILED')
                  : t('CAUTION', { ns: 'common' })}
              </div>
            }
            bodyContent={<div>{status.error?.message || t('UNKNOWN_ERROR', { ns: 'common' })}</div>}
            appendTo={portalRoot}
          >
            <Label style={{ cursor: 'pointer' }} color={getColor(status.state)}>
              {status.state}
            </Label>
          </Popover>
        ) : (
          <Label color={getColor(status.state)}>{status.state}</Label>
        )}
      </Td>
      <Td textCenter>
        <Button
          variant="secondary"
          className="credential__test-button"
          isDisabled={loading || isEmptyCredential}
          onClick={handleTest}
        >
          {t('TEST', { ns: 'common' })}
        </Button>
      </Td>
    </Tr>
  ) : null;
};

interface CredentialToolbarProps {
  matchedTargets: Target[];
  filters: CredentialTestState[];
  searchText: string;
  onFilter?: (filters: CredentialTestState[]) => void;
  onSearch?: (searchText: string) => void;
}

const CredentialToolbar: React.FC<CredentialToolbarProps> = ({
  onFilter,
  onSearch = () => undefined,
  matchedTargets,
  filters,
  searchText,
  ...props
}) => {
  const { t } = useTranslation();
  const [credential] = useAuthCredential();
  const [disableTest, setDisableTest] = React.useState(false);

  const handleTestAll = React.useCallback(() => {
    const buttons = document.getElementsByClassName('credential__test-button');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i] as HTMLElement;
      btn.click();
    }
  }, []);

  React.useEffect(() => {
    const buttons = document.getElementsByClassName('credential__test-button');
    const disabled =
      !matchedTargets.length ||
      ((filters.length || searchText) && (!buttons || !buttons.length)) ||
      credential.username === '' ||
      credential.password === '';
    setDisableTest(disabled);
  }, [filters, searchText, credential, setDisableTest, matchedTargets]);

  return (
    <Toolbar
      {...props}
      isSticky
      id="credential-test-table-toolbar"
      aria-label={t('CredentialTestTable.ARIA_LABELS.TOOLBAR')}
    >
      <ToolbarContent>
        <ToolbarItem variant="search-filter">
          <SearchInput
            onChange={(_, value: string) => onSearch(value)}
            placeholder={t('CredentialTestTable.SEARCH_PLACEHOLDER')}
            value={searchText}
            style={{ minWidth: '27ch' }}
          />
        </ToolbarItem>
        <ToolbarGroup variant="filter-group">
          <StatusFilter onChange={onFilter} filters={filters} />
        </ToolbarGroup>
        <ToolbarItem variant="separator" />
        <ToolbarItem>
          <Tooltip content={t('CredentialTestTable.TEST_ALL_TOOLTIP')} appendTo={portalRoot}>
            <Button variant="primary" onClick={handleTestAll} isAriaDisabled={disableTest}>
              {t('CredentialTestTable.TEST_ALL')}
            </Button>
          </Tooltip>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

interface StatusFilterProps {
  onChange?: (filters: CredentialTestState[]) => void;
  filters: CredentialTestState[];
}

const StatusFilter: React.FC<StatusFilterProps> = ({ onChange, filters, ...props }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const handleToggle = React.useCallback(() => setIsOpen((old) => !old), [setIsOpen]);

  const handleSelect = React.useCallback(
    (_: React.MouseEvent, value: CredentialTestState) => {
      const old = filters;
      onChange && onChange(old.includes(value) ? old.filter((v) => v !== value) : [...old, value]);
    },
    [onChange, filters],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleToggle} isExpanded={isOpen}>
        {t('STATUS', { ns: 'common' })}
      </MenuToggle>
    ),
    [handleToggle, isOpen, t],
  );

  return (
    <Select
      {...props}
      aria-label={t('CredentialTestTable.ARIA_LABELS.STATUS_SELECT')}
      toggle={toggle}
      onSelect={handleSelect}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
    >
      <SelectList>
        {Object.values(CredentialTestState).map((state) => (
          <SelectOption key={state} value={state} hasCheckbox isSelected={filters.includes(state)}>
            <Label color={getColor(state)}>{state}</Label>
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
