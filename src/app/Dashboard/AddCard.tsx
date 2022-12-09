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
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import { Wizard, WizardStep } from '@patternfly/react-core/dist/js/next';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useDispatch } from 'react-redux';
import { StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { addCardIntent } from '@app/Shared/Redux/DashboardConfigActions';
import { DashboardCards, getConfigByTitle } from './Dashboard';

interface AddCardProps {}

export const AddCard: React.FunctionComponent<AddCardProps> = (props: AddCardProps) => {
  const [showWizard, setShowWizard] = React.useState(false);
  const [selection, setSelection] = React.useState(DashboardCards[0].title);
  const [selectOpen, setSelectOpen] = React.useState(false);
  const dispatch = useDispatch<StateDispatch>();

  const options = React.useMemo(() => {
    return [
      ...DashboardCards.map((choice, idx) => (
        <SelectOption key={idx} value={choice.component.name}>
          {choice.title}
        </SelectOption>
      )),
    ];
  }, [DashboardCards]);

  const handleToggle = React.useCallback(
    (isOpen) => {
      setSelectOpen(isOpen);
    },
    [setSelectOpen]
  );

  const handleSelect = React.useCallback(
    (_, selection) => {
      setSelection(selection);
      setSelectOpen(false);
    },
    [setSelection, setSelectOpen]
  );

  const handleAdd = React.useCallback(() => {
    setShowWizard(false);
    dispatch(addCardIntent(getConfigByTitle(selection).component.name));
  }, [dispatch, selection]);

  const handleStart = React.useCallback(() => {
    setShowWizard(true);
  }, [setShowWizard]);

  const handleStop = React.useCallback(() => {
    setShowWizard(false);
  }, [setShowWizard]);

  return (
    <>
      <Card isRounded isLarge>
        {showWizard ? (
          <Wizard onClose={handleStop} onSave={handleAdd}>
            <WizardStep id="card-type-select" name="Card Type" footer={{ nextButtonText: 'Finish' }}>
              <Select onToggle={handleToggle} isOpen={selectOpen} onSelect={handleSelect} selections={selection}>
                {options}
              </Select>
            </WizardStep>
          </Wizard>
        ) : (
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.large}>
              <EmptyStateIcon icon={PlusCircleIcon} />
              <Title headingLevel="h2" size="md">
                Add a new card
              </Title>
              <EmptyStateBody>
                Cards added to this Dashboard layout present information at a glance about the selected target. The
                layout is preserved for all targets viewed on this client.
              </EmptyStateBody>
              <Button variant="primary" onClick={handleStart}>
                Add
              </Button>
            </EmptyState>
          </Bullseye>
        )}
      </Card>
    </>
  );
};
