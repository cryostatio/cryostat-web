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
import { Checkbox } from '@patternfly/react-core';
import { ExpandableRowContent, Tbody, Td, Tr  } from '@patternfly/react-table';
import { MatchedTargetsTable } from './MatchedTargetsTable';

export interface CredentialsTableRowProps {
  key: number;
  index: number;
  id: number;
  matchExpression: string;
  isChecked: boolean;
  isExpanded: boolean;
  label: string;
  colSpan: number;
  handleCheck: (state: boolean, index: number) => void;
  handleToggleExpanded: (index: number) => void;
}

export const CredentialsTableRow: React.FunctionComponent<CredentialsTableRowProps> = (props: CredentialsTableRowProps) => {

  const handleCheck = React.useCallback((checked: boolean) => {
    props.handleCheck(checked, props.index);
  }, [props, props.handleCheck]);

  const handleToggle = React.useCallback(() => {
    props.handleToggleExpanded(props.index);
  },[props, props.handleToggleExpanded])

  const parentRow = (
    <Tr key={`${props.index}_parent`}>
        <Td
          key={`credentials-table-row-${props.index}_0`}
          id={`credentials-ex-toggle-${props.index}`}
          aria-controls={`credentials-ex-expand-${props.index}`}
          expand={{
            rowIndex: props.index,
            isExpanded: props.isExpanded,
            onToggle: handleToggle,
          }}
        />
        <Td key={`credentials-table-row-${props.index}_1`}>
          <Checkbox
            name={`credentials-table-row-${props.index}-check`}
            onChange={handleCheck}
            isChecked={props.isChecked}
            id={`credentials-table-row-${props.index}-check`}
            aria-label={`credentials-table-row-${props.index}-check`}
          />
        </Td>
        <Td key={`credentials-table-row-${props.index}_2`} dataLabel={props.label}>
          {props.matchExpression}
        </Td>
    </Tr>
  );

  const childRow = (
    <Tr key={`${props.index}_child`} isExpanded={props.isExpanded}>
      <Td
        key={`credentials-ex-expand-${props.index}`}
        dataLabel={"Content Details"}
        colSpan={props.colSpan}
      >
        {props.isExpanded ?
          <ExpandableRowContent>
            <MatchedTargetsTable id={props.id}/>
          </ExpandableRowContent>
        :
          null
        }
      </Td>
    </Tr>
  );

  return (<>
    {parentRow}
    {childRow}
  </>
  );
};
