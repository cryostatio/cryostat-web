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
import { EmptySnapshotWarningModal } from './EmptySnapshotWarningModal';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ActionGroup, Button, Form, Text, TextVariants } from '@patternfly/react-core';
import { useHistory } from 'react-router-dom';
import { filter, concatMap, first } from 'rxjs/operators';
import { Recordings } from '@app/Recordings/Recordings';

export interface SnapshotRecordingFormProps {
  onSubmit: Function;
}

export const SnapshotRecordingForm: React.FunctionComponent<SnapshotRecordingFormProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();
  const snapshotNamingConvention : RegExp = /^snapshot-[0-9]+$/;
  const addSubscription = useSubscriptions();
  const [showWarningModal, setShowWarningModal] = React.useState(false);

  const handleCreateSnapshot = () => {
    addSubscription(
      context.target.target()
      .pipe(
        filter(target => target !== NO_TARGET),
        concatMap(target => context.api.doGet<Recording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)),
        first())
      .subscribe(recordings => {        
        if (!activeRecordingIsPresent(recordings)) {
          setShowWarningModal(true);
        } else {
          props.onSubmit();
        }
      })
    );
  };

  const activeRecordingIsPresent = (recordings: Recording[]): boolean => {
    for (let i = 0; i < recordings.length; i++) {
      if (!snapshotNamingConvention.test(recordings[i].name)) {
        return true;
      }
    }
    return false;
  }

  const dismissWarningModal = () => {
    setShowWarningModal(false);
  }

  const handleCreateEmptySnapshot = () => {
    dismissWarningModal();
    props.onSubmit();
  }

  return (<>
    <Form isHorizontal>
      <Text component={TextVariants.p}>
        A Snapshot recording is one which contains all information about all
        events that have been captured in the current session by <i>other,&nbsp;
        non-snapshot</i> recordings. Snapshots do not themselves define which
        events are enabled, their thresholds, or any other options. A Snapshot
        is only ever in the STOPPED state from the moment it is created.
      </Text>
      <ActionGroup>
        <Button variant="primary" onClick={handleCreateSnapshot}>Create</Button>
        <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
      </ActionGroup>
    </Form>
    <EmptySnapshotWarningModal visible={showWarningModal} onNo={dismissWarningModal} onYes={handleCreateEmptySnapshot}/>
  </>);
}
