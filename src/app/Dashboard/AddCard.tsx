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
  Bullseye,
  Button,
  Card,
  EmptyState,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { DashboardCards } from './Dashboard';

interface AddCardProps {
  onAdd(name: string): void;
}

export const AddCard: React.FunctionComponent<AddCardProps> = (props: AddCardProps) => {
  const [selection, setSelection] = React.useState('None');
  const [selectOpen, setSelectOpen] = React.useState(false);

  const options = React.useMemo(() => {
    return [
      <SelectOption key={0} isPlaceholder value="None" />,
      ...DashboardCards.map((choice, idx) => <SelectOption key={idx + 1} value={choice.component.name} />),
    ];
  }, [DashboardCards]);

  const handleToggle = React.useCallback(
    (isOpen) => {
      setSelectOpen(isOpen);
    },
    [setSelectOpen]
  );

  const handleSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (isPlaceholder) {
        setSelection('None');
      } else {
        setSelection(selection);
      }
      setSelectOpen(false);
    },
    [setSelection, setSelectOpen]
  );

  const handleAdd = React.useCallback(() => {
    if (selection === 'None') {
      return;
    }
    props.onAdd(selection);
  }, [selection]);

  return (
    <>
      <Card>
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.large}>
            <EmptyStateIcon icon={PlusCircleIcon} />
            <Title headingLevel="h2" size="md">
              Add a new card
            </Title>
            <EmptyStateSecondaryActions>
              <Select onToggle={handleToggle} isOpen={selectOpen} onSelect={handleSelect} selections={selection}>
                {options}
              </Select>
              <Button variant="link" isDisabled={selection === 'None'} onClick={handleAdd}>
                Add
              </Button>
            </EmptyStateSecondaryActions>
          </EmptyState>
        </Bullseye>
      </Card>
    </>
  );
};
