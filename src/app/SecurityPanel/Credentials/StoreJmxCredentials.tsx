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
import { Target } from '@app/Shared/Services/Target.service';
import { StoredCredential } from '@app/Shared/Services/Api.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { forkJoin, Observable } from 'rxjs';

import { ExpandableRowContent, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CreateJmxCredentialModal } from './CreateJmxCredentialModal';
import { SecurityCard } from '../SecurityPanel';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

import _ from 'lodash';
import { MatchedTargetsTable } from './MatchedTargetsTable';

export const StoreJmxCredentials = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [credentials, setCredentials] = React.useState([] as StoredCredential[]);
  const [expandedCredentials, setExpandedCredentials] = React.useState([] as StoredCredential[]);
  const [checkedCredentials, setCheckedCredentials] = React.useState([] as StoredCredential[]);
  const [counts, setCounts] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const tableColumns: string[] = ['Match Expression', 'Count'];
  const tableTitle = 'Stored Credentials';

  const handleTargetNotification = React.useCallback((target: Target, kind: string) => {
    setCounts(old => {
      let updated = [...old];
      for (let i = 0; i < credentials.length; i++) {
        let match: boolean = eval(credentials[i].matchExpression);
        if (match) {
          updated[i] += (kind === 'FOUND' ? 1 : -1);
        }
      }
      return updated;
    });
  }, [credentials, setCounts]);

  const refreshStoredCredentialsAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(context.api.getCredentials().subscribe((credentials: StoredCredential[]) => {
      let counts: number[] = [];
      for (const c of credentials) {
        counts.push(c.numMatchingTargets);
      }
      setCredentials(credentials);
      setCounts(counts);
      setIsLoading(false);
    }));
  }, [addSubscription, context, context.api, setIsLoading, setCredentials, setCounts]);

  React.useEffect(() => {
    refreshStoredCredentialsAndCounts();
  }, []);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshStoredCredentialsAndCounts(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshStoredCredentialsAndCounts]);

  React.useEffect(() => {
    addSubscription(context.notificationChannel.messages(NotificationCategory.CredentialsStored).subscribe((v) => {
      setCredentials(old => old.concat([v.message]));
      setCounts(old => old.concat([v.message.numMatchingTargets]));
    }));
  }, [addSubscription, context, context.notificationChannel, setCredentials, setCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.CredentialsDeleted).subscribe((v) => {
        const credential: StoredCredential = v.message;
        let idx;
        setCredentials(old => {
          for (idx = 0; idx < old.length; idx++) {
            if (_.isEqual(credential, old[idx])) break;
          }
          return old.filter(o => !_.isEqual(o, credential));
        });
        setExpandedCredentials(old => old.filter(o => !_.isEqual(o, credential)));
        setCounts(old => {
          let updated = [...old];
          updated.splice(idx, 1);
          return updated;
        });
      })
    );
  }, [addSubscription, context, context.notificationChannel, setCredentials, setExpandedCredentials, setCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery)
      .subscribe(
        v => {
          const evt: TargetDiscoveryEvent = v.message.event;
          const target: Target = evt.serviceRef;
          if (evt.kind === 'FOUND' || evt.kind === 'LOST') {
            handleTargetNotification(target, evt.kind);
          }
        }
      )
    );
  }, [addSubscription, context, context.notificationChannel, handleTargetNotification]);

  const handleRowCheck = React.useCallback(
    (checked, credential) => {
      if (checked) {
        setCheckedCredentials(old => old.concat(credential));
      } else {
        setHeaderChecked(false);
        setCheckedCredentials(old => old.filter(o => !_.isEqual(o, credential)));
      }
    },
    [setCheckedCredentials, setHeaderChecked]
  );

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedCredentials(checked ? credentials : []);
    },
    [setHeaderChecked, setCheckedCredentials, credentials]
  );

  const handleDeleteCredentials = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    credentials.forEach((credential) => {
      if (checkedCredentials.includes(credential)) {
        handleRowCheck(false, credential);
        tasks.push(context.api.deleteCredentials(credential.id));
      }
    });
    addSubscription(forkJoin(tasks).subscribe());
  }, [credentials, checkedCredentials, handleRowCheck, context, context.api, addSubscription]);

  const handleAuthModalOpen = React.useCallback(() => {
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  const handleAuthModalClose = React.useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteJMXCredentials)) {
      setWarningModalOpen(true);
    }
    else {
      handleDeleteCredentials();
    }
  }, [context, context.settings, setWarningModalOpen, handleDeleteCredentials]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const TargetCredentialsToolbar = () => {
    const buttons = React.useMemo(() => {
      const arr = [
        <Button variant="primary" aria-label="add-jmx-credential" onClick={handleAuthModalOpen}>
          Add
        </Button>,
        <Button key="delete" variant="danger" aria-label="delete-selected-jmx-credential" onClick={handleDeleteButton} isDisabled={!checkedCredentials.length}>
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
    }, [checkedCredentials]);

    const deleteCredentialModal = React.useMemo(() => {
      return <DeleteWarningModal
        warningType={DeleteWarningType.DeleteJMXCredentials}
        visible={warningModalOpen}
        onAccept={handleDeleteCredentials}
        onClose={handleWarningModalClose}
      />
    }, [checkedCredentials]);

    return (
      <Toolbar id="target-credentials-toolbar">
        <ToolbarContent>{buttons}</ToolbarContent>
        { deleteCredentialModal }
      </Toolbar>
    );
  };

  const toggleExpanded = React.useCallback((credential) => {
    const idx = expandedCredentials.indexOf(credential);
    setExpandedCredentials(expandedCredentials => idx >= 0 ? [...expandedCredentials.slice(0, idx), ...expandedCredentials.slice(idx + 1, expandedCredentials.length)] : [...expandedCredentials, credential]);
  }, [expandedCredentials])

  const matchExpressionRows = React.useMemo(() => {
    return credentials.map((credential, idx) => {
      let isExpanded: boolean = expandedCredentials.includes(credential);
      let isChecked: boolean = checkedCredentials.includes(credential);

      const handleToggle = () => {
        if (counts[idx] !== 0 || isExpanded) {
          toggleExpanded(credential);
        }
      };

      const handleCheck = (checked: boolean) => {
        handleRowCheck(checked, credential)
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
              onToggle: handleToggle,
            }}
          />
          <Td key={`credentials-table-row-${idx}_1`}>
            <Checkbox
              name={`credentials-table-row-${idx}-check`}
              onChange={handleCheck}
              isChecked={isChecked}
              id={`credentials-table-row-${idx}-check`}
              aria-label={`credentials-table-row-${idx}-check`}
            />
          </Td>
          <Td key={`credentials-table-row-${idx}_2`} dataLabel={tableColumns[0]}>
            {credential.matchExpression}
          </Td>
          <Td key={`credentials-table-row-${idx}_3`} dataLabel={tableColumns[1]}>
            <Badge key={`${idx}_count`}>
              {counts[idx]}
            </Badge>
          </Td>
        </Tr>
      );
    });
  }, [credentials, expandedCredentials, checkedCredentials, counts]);

  const targetRows = React.useMemo(() => {
    return credentials.map((credential, idx) => {
      let isExpanded: boolean = expandedCredentials.includes(credential);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded}>
          <Td
            key={`credentials-ex-expand-${idx}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 2}
          >
            {isExpanded ?
              <ExpandableRowContent>
                <MatchedTargetsTable id={credential.id} matchExpression={credential.matchExpression}/>
              </ExpandableRowContent>
            :
              null
            }
          </Td>
        </Tr>
      );
    })
  }, [credentials, expandedCredentials]);

  const rowPairs = React.useMemo(() => {
    let rowPairs: JSX.Element[] = [];
    for (let i = 0; i < matchExpressionRows.length; i++) {
      rowPairs.push(matchExpressionRows[i]);
      rowPairs.push(targetRows[i]);
    } 
    return rowPairs;
  }, [matchExpressionRows, targetRows]);

  let content: JSX.Element;
  if (isLoading) {
    content = (<>
      <LoadingView />
    </>);
  } else if (credentials.length === 0) {
    content = (<>
      <EmptyState>
        <EmptyStateIcon icon={SearchIcon} />
        <Title headingLevel="h4" size="lg">
          No {tableTitle}
        </Title>
      </EmptyState>
    </>);
  } else {
    content = (<>
      <TableComposable aria-label={tableTitle}>
        <Thead>
          <Tr>
            <Th key="table-header-expand"/>
            <Th
              key="table-header-check-all"
              select={{
                onSelect: handleHeaderCheck,
                  isSelected: headerChecked,
              }}
            />
            {tableColumns.map((key, idx) => (
              <Th key={`table-header-${key}`} width={key === 'Match Expression' ? 90 : 15}>{key}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rowPairs}
        </Tbody>
      </TableComposable>
    </>);
  }

  return (<>
    <TargetCredentialsToolbar />
    { content }
    <CreateJmxCredentialModal visible={showAuthModal} onClose={handleAuthModalClose} />
  </>);
};

export const StoreJmxCredentialsCard: SecurityCard = {
  title: 'Store JMX Credentials',
  description: `Credentials that Cryostat uses to connect to target JVMs over JMX are stored here.`,
  content: StoreJmxCredentials,
};
