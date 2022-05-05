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
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardHeaderMain,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextVariants,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { includesLabel, parseLabels, RecordingLabel } from './RecordingLabel';
import { first, forkJoin, Observable } from 'rxjs';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { RecordingLabelFields } from './RecordingLabelFields';

export interface BulkEditLabelsProps {
  isTargetRecording: boolean;
  checkedIndices: number[];
  recordings: ArchivedRecording[];
  editing: boolean;
  setEditing: (editing: boolean) => void;
}

export const BulkEditLabels: React.FunctionComponent<BulkEditLabelsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [commonLabels, setCommonLabels] = React.useState([] as RecordingLabel[]);
  const [prevCommonLabels, setPrevCommonLabels] = React.useState([] as RecordingLabel[]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const addSubscription = useSubscriptions();

  const handleUpdateLabelsForSelected = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    const toDelete = prevCommonLabels.filter((label) => !includesLabel(commonLabels, label));

    props.recordings.forEach((r: ArchivedRecording, idx) => {
      if (props.checkedIndices.includes(idx)) {
        let updatedLabels = [...parseLabels(r.metadata.labels), ...commonLabels];
        updatedLabels = updatedLabels.filter((label) => {
          return !includesLabel(toDelete, label);
        });

        tasks.push(
          props.isTargetRecording
            ? context.api.postTargetRecordingMetadata(r.name, updatedLabels).pipe(first())
            : context.api.postRecordingMetadata(r.name, updatedLabels).pipe(first())
        );
      }
    });
    addSubscription(forkJoin(tasks).subscribe(() => props.setEditing(!props.editing)));
  }, [
    props.recordings,
    props.checkedIndices,
    props.isTargetRecording,
    props.editing,
    props.setEditing,
    commonLabels,
    parseLabels,
    context,
    context.api,
  ]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: RecordingLabel[]) => void) => {
      let allRecordingLabels = [] as RecordingLabel[][];
      props.recordings.forEach((r: ArchivedRecording, idx) => {
        if (props.checkedIndices.includes(idx)) {
          allRecordingLabels.push(parseLabels(r.metadata.labels));
        }
      });

      const updatedCommonLabels = allRecordingLabels.reduce(
        (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
        allRecordingLabels[0]
      );
      setLabels(updatedCommonLabels);
    },
    [props.recordings, props.checkedIndices]
  );

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setPrevCommonLabels);
  }, [props.recordings, props.checkedIndices, setCommonLabels]);

  return (
    <Card>
      <CardHeader>
        <CardHeaderMain>
          <Text>Labels present on all selected recordings</Text>
          <Text component={TextVariants.small}>Editing the labels below will affect all selected recordings.</Text>
        </CardHeaderMain>
      </CardHeader>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            {props.editing ? (
              <>
                <RecordingLabelFields
                  labels={commonLabels}
                  setLabels={setCommonLabels}
                  valid={valid}
                  setValid={setValid}
                />
                <Split hasGutter>
                  <SplitItem>
                    <Button
                      variant="primary"
                      onClick={handleUpdateLabelsForSelected}
                      isDisabled={valid != ValidatedOptions.success}
                    >
                      Save
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <Button variant="secondary" onClick={() => props.setEditing(false)}>
                      Cancel
                    </Button>
                  </SplitItem>
                </Split>
              </>
            ) : (
              <LabelCell labels={commonLabels} />
            )}
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};
