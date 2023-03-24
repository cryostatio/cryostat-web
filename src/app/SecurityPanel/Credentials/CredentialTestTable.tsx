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
import { LinearDotSpinner } from '@app/Shared/LinearDotSpinner';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSearchExpression } from '@app/Topology/Shared/utils';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { evaluateTargetWithExpr } from '@app/utils/utils';
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
  Select,
  SelectOption,
  SelectVariant,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, SearchIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import {
  InnerScrollContainer,
  OuterScrollContainer,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import * as React from 'react';
import { TestPoolContext, useAuthCredential } from './utils';

export interface CredentialTestTableProps {}

export const CredentialTestTable: React.FC<CredentialTestTableProps> = ({ ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);

  const [targets, setTargets] = React.useState<Target[]>([]);
  const [matchExpression] = useSearchExpression();
  const [filters, setFilters] = React.useState<TestState[]>([]);
  const [searchText, setSearchText] = React.useState('');

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  const matchedTargets = React.useMemo(() => {
    try {
      return targets.filter((t) => {
        const res = evaluateTargetWithExpr(t, matchExpression);
        if (typeof res === 'boolean') {
          return res;
        }
        throw new Error('Invalid match expression');
      });
    } catch (err) {
      return [];
    }
  }, [targets, matchExpression]);

  const rows = React.useMemo(
    () =>
      matchedTargets.map((t) => (
        <CredentialTestRow target={t} key={t.connectUrl} filters={filters} searchText={searchText} />
      )),
    [matchedTargets, filters, searchText]
  );

  const toolbar = React.useMemo(
    () => <CredentialToolbar onFilter={setFilters} onSearch={setSearchText} />,
    [setFilters, setSearchText]
  );

  return (
    <>
      {matchedTargets.length ? (
        rows.length ? (
          <OuterScrollContainer>
            {toolbar}
            <InnerScrollContainer>
              <TableComposable {...props}>
                <Thead>
                  <Tr>
                    <Th>Target</Th>
                    <Th textCenter width={20}>
                      Status
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>{rows}</Tbody>
              </TableComposable>
            </InnerScrollContainer>
          </OuterScrollContainer>
        ) : (
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.full}>
              <EmptyStateIcon variant="container" component={SearchIcon} />
              <Title headingLevel="h3" size="lg">
                No Targets Found
              </Title>
              <EmptyStateBody>Clear filters and try again.</EmptyStateBody>
            </EmptyState>
          </Bullseye>
        )
      ) : (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon variant="container" component={SearchIcon} />
            <Title headingLevel="h3" size="lg">
              No Targets Matched
            </Title>
            <EmptyStateBody>{`${
              matchExpression === '' ? 'Enter another' : 'Clear'
            } Match Expression and try again.`}</EmptyStateBody>
          </EmptyState>
        </Bullseye>
      )}
    </>
  );
};

enum TestState {
  NO_STATUS = 'No Status',
  INVALID = 'Invalid',
  VALID = 'Valid',
  NOT_APPLICABLE = 'Not Applicable',
}

const getColor = (state: TestState): LabelProps['color'] => {
  switch (state) {
    case TestState.VALID:
      return 'green';
    case TestState.INVALID:
      return 'red';
    case TestState.NOT_APPLICABLE:
      return 'orange';
    case TestState.NO_STATUS:
    default:
      return 'grey';
  }
};

interface TestStatus {
  state: TestState;
  error?: Error;
}

export interface CredentialTestRowProps {
  target: Target;
  filters?: TestState[];
  searchText?: string;
}

export const CredentialTestRow: React.FC<CredentialTestRowProps> = ({
  target,
  filters = [],
  searchText = '',
  ...props
}) => {
  const [status, setStatus] = React.useState<TestStatus>({
    state: TestState.NO_STATUS,
    error: undefined,
  });
  const context = React.useContext(ServiceContext);
  const [loading, setLoading] = React.useState(false);
  const [credential] = useAuthCredential();
  const testPool = React.useContext(TestPoolContext);
  const addSubscription = useSubscriptions();

  const isEmptyCredential = React.useMemo(() => credential.password === '' || credential.username === '', [credential]);

  const isShowed = React.useMemo(() => {
    const regex = new RegExp(searchText, 'i');
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
          state: !err ? TestState.VALID : err.errorType === 'warning' ? TestState.NOT_APPLICABLE : TestState.INVALID,
        });
      })
    );
  }, [setStatus, addSubscription, context.api, target, credential, isEmptyCredential, loading, testPool]);

  return isShowed ? (
    <Tr {...props} id={`${target.connectUrl}-test-row`}>
      <Td dataLabel="Target">{!target.alias ? target.connectUrl : `${target.alias} (${target.connectUrl})`}</Td>
      <Td dataLabel="Status" textCenter>
        {loading ? (
          <Bullseye>
            <LinearDotSpinner />
          </Bullseye>
        ) : status.state === TestState.INVALID || status.state === TestState.NOT_APPLICABLE ? (
          <Popover
            aria-label={`Test Result Details (${target.connectUrl})`}
            alertSeverityVariant={status.state === TestState.INVALID ? 'danger' : 'warning'}
            headerIcon={status.state === TestState.INVALID ? <ExclamationCircleIcon /> : <WarningTriangleIcon />}
            headerContent={<div>{status.state === TestState.INVALID ? 'Test failed' : 'Caution'}</div>}
            bodyContent={<div>{status.error?.message || 'Unknown error'}</div>}
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
          Test
        </Button>
      </Td>
    </Tr>
  ) : null;
};

interface CredentialToolbarProps {
  onFilter?: (filters: TestState[]) => void;
  onSearch?: (searchText: string) => void;
}

const CredentialToolbar: React.FC<CredentialToolbarProps> = ({ onFilter, onSearch, ...props }) => {
  const [credential] = useAuthCredential();

  const handleTestAll = React.useCallback(() => {
    const buttons = document.getElementsByClassName('credential__test-button');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i] as HTMLElement;
      btn.click();
    }
  }, []);

  const disableTestButton = React.useMemo(() => credential.username === '' || credential.password === '', [credential]);

  return (
    <Toolbar {...props} isSticky id="credential-test-table-toolbar" aria-label="credential-test-table-toolbar">
      <ToolbarContent>
        <ToolbarItem variant="search-filter">
          <SearchInput aria-label="Items example search input" onChange={onSearch} />
        </ToolbarItem>
        <ToolbarGroup variant="filter-group">
          <StatusFilter onChange={onFilter} />
        </ToolbarGroup>
        <ToolbarItem>
          <Tooltip content={'Test credentials against all matching targets (ignoring filters).'}>
            <Button variant="primary" onClick={handleTestAll} isAriaDisabled={disableTestButton}>
              Test All
            </Button>
          </Tooltip>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

const StatusFilter: React.FC<{ onChange?: (filters: TestState[]) => void }> = ({ onChange, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<TestState[]>([]);

  const handleToggle = React.useCallback(() => setIsOpen((old) => !old), [setIsOpen]);

  const handleSelect = React.useCallback(
    (_: React.MouseEvent, value: TestState) => {
      setFilters((old) => {
        if (old.includes(value)) {
          return old.filter((v) => v !== value);
        }
        return [...old, value];
      });
    },
    [setFilters]
  );

  React.useEffect(() => onChange && onChange(filters), [filters, onChange]);

  return (
    <Select
      {...props}
      variant={SelectVariant.checkbox}
      aria-label="Status"
      onToggle={handleToggle}
      onSelect={handleSelect}
      selections={filters}
      isOpen={isOpen}
      placeholderText="Status"
    >
      {Object.values(TestState).map((state) => (
        <SelectOption key={state} value={state}>
          <Label color={getColor(state)}>{state}</Label>
        </SelectOption>
      ))}
    </Select>
  );
};
