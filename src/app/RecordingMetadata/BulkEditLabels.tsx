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
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextVariants,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { includesLabel, parseLabels, RecordingLabel } from './RecordingLabel';
import { first, forkJoin, Observable } from 'rxjs';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { RecordingLabelFields } from './RecordingLabelFields';
import { HelpIcon } from '@patternfly/react-icons';

export interface BulkEditLabelsProps {
  isTargetRecording: boolean;
  checkedIndices: number[];
  recordings: ArchivedRecording[];
}

export const BulkEditLabels: React.FunctionComponent<BulkEditLabelsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [editing, setEditing] = React.useState(false);
  const [commonLabels, setCommonLabels] = React.useState([] as RecordingLabel[]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState([] as RecordingLabel[]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const addSubscription = useSubscriptions();

  const handleUpdateLabels = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));

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
    addSubscription(forkJoin(tasks).subscribe(() => setEditing((editing) => !editing)));
  }, [
    props.recordings,
    props.checkedIndices,
    props.isTargetRecording,
    editing,
    setEditing,
    commonLabels,
    savedCommonLabels,
    parseLabels,
    context,
    context.api,
  ]);

  const handleEditLabels = React.useCallback(() => {
    setEditing(true);
  }, [setEditing]);

  const handleCancel = React.useCallback(() => {
    setEditing(false);
    setCommonLabels(savedCommonLabels);
  }, [setEditing, savedCommonLabels]);

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
    updateCommonLabels(setSavedCommonLabels);
  }, [props.recordings, props.checkedIndices, setCommonLabels, setSavedCommonLabels]);

  React.useEffect(() => {
    if (!props.checkedIndices.length) {
      setEditing(false);
    }
  }, [props.checkedIndices]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Split hasGutter>
            <SplitItem>
              <Text>Edit Recording Labels</Text>
            </SplitItem>
            <SplitItem>
              <Tooltip
                content={
                  <div>
                    Labels present on all selected recordings will appear here. Editing the labels will affect ALL
                    selected recordings.
                  </div>
                }
              >
                <HelpIcon noVerticalAlign />
              </Tooltip>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem>
          <LabelCell labels={savedCommonLabels} />
        </StackItem>
        <StackItem>
          {editing ? (
            <>
              <RecordingLabelFields
                labels={commonLabels}
                setLabels={setCommonLabels}
                valid={valid}
                setValid={setValid}
              />
              <Split hasGutter>
                <SplitItem>
                  <Button variant="primary" onClick={handleUpdateLabels} isDisabled={valid != ValidatedOptions.success}>
                    Save
                  </Button>
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                </SplitItem>
              </Split>
            </>
          ) : (
            <Button
              key="edit labels"
              variant="secondary"
              onClick={handleEditLabels}
              isDisabled={!props.checkedIndices.length}
            >
              Edit
            </Button>
          )}
        </StackItem>
      </Stack>
    </>
  );
};
