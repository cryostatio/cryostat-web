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
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardHeaderMain,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  Select,
  SelectOption,
  SelectVariant,
  Text,
  TextVariants,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { forkJoin, Observable, of } from 'rxjs';

import _ from 'lodash';
import { Caption, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CreateJmxCredentialModal } from './CreateJmxCredentialModal';

export interface TargetCredentialsTableProps {
}

export const TargetCredentialsTable: React.FunctionComponent<TargetCredentialsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [targets, setTargets] = React.useState([] as Target[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [isEmpty, setIsEmpty] = React.useState(false); //TODO init
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  const tableColumns: string[] = ['Target Alias', 'Connect URL'];
  const tableTitle = 'Stored Credentials';

  // TODO subscribe to "targets that have credentials stored" state
  // or somehow filter targets list
  // and setTargets()
  React.useEffect(() => {
    const sub = context.targets.targets().subscribe((targets) => {
      setTargets(targets);
    });
    return () => sub.unsubscribe();
  }, [context, context.targets, setTargets]);

  const handleRowCheck = React.useCallback(
    (checked, index) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked]
  );

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? Array.from(new Array(targets.length), (x, i) => i) : []);
    },
    [setHeaderChecked, setCheckedIndices, targets]
  );

  const handleDeleteCredentials = () => {
    const tasks: Observable<any>[] = [];
    targets.forEach((t: Target, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(context.api.deleteTargetCredentials(t));
        context.target.deleteCredentials(t.connectUrl);
      }
    });
    addSubscription(forkJoin(tasks).subscribe());
  };

  const TargetCredentialsToolbar = () => {
    const buttons = React.useMemo(() => {
      const arr = [
        <Button variant="primary" aria-label="import" onClick={() => setShowAuthModal(true)}>
          Add
        </Button>,
        <Button
          key="delete"
          variant="danger"
          onClick={handleDeleteCredentials}
          isDisabled={!checkedIndices.length}
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
    }, [checkedIndices]);

    return (
      <Toolbar id="target-credentials-toolbar">
        <ToolbarContent>{buttons}</ToolbarContent>
      </Toolbar>
    );
  };

  const TargetCredentialsTableRow = (props) => {
    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    return (
      <Tbody key={props.index}>
        <Tr key={`${props.index}`}>
          <Td key={`active-table-row-${props.index}_0`}>
            <Checkbox
              name={`active-table-row-${props.index}-check`}
              onChange={handleCheck}
              isChecked={checkedIndices.includes(props.index)}
              id={`active-table-row-${props.index}-check`}
            />
          </Td>
          <Td key={`active-table-row-${props.index}_1`} dataLabel={tableColumns[0]}>
            {props.target.alias}
          </Td>
          <Td key={`active-table-row-${props.index}_2`} dataLabel={tableColumns[1]}>
            {props.target.connectUrl}
          </Td>
        </Tr>
      </Tbody>
    );
  };
  const targetRows = React.useMemo(() => {
    return targets.map((t, idx) => <TargetCredentialsTableRow key={idx} target={t} index={idx} />);
  }, [targets, checkedIndices]);

  return (
    <>
      {isEmpty ? (
        <>
          <TargetCredentialsToolbar />
          <EmptyState>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h4" size="lg">
              No {tableTitle}
            </Title>
          </EmptyState>
        </>
      ) : (
        <>
          <TargetCredentialsToolbar />
          <TableComposable aria-label={tableTitle}>
            <Caption>Targets for which Cryostat has stored JMX credentials. 
              These credentials are used for automated rules processing - if a Target JVM requires JMX authentication, 
              Cryostat will use stored credentials when attempting to open JMX connections to the target.</Caption>
            <Thead>
              <Tr>
                <Th
                  key="table-header-check-all"
                  select={{
                    onSelect: handleHeaderCheck,
                    isSelected: headerChecked,
                  }}
                />
                {tableColumns.map((key, idx) => (
                  <Th key={`table-header-${key}`}>{key}</Th>
                ))}
              </Tr>
            </Thead>
            {targetRows}
          </TableComposable>
        </>
      )}
        <CreateJmxCredentialModal visible={showAuthModal} onClose={() => setShowAuthModal(false)}/>
    </>
  );
};
