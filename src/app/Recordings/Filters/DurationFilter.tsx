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

import { Checkbox, Flex, FlexItem, TextInput } from '@patternfly/react-core';
import React from 'react';

export interface DurationFilterProps {
  durations: string[] | undefined;
  onDurationInput: (e: number) => void;
  onContinuousDurationSelect: (checked: boolean) => void;
}

export const DurationFilter: React.FC<DurationFilterProps> = ({
  durations,
  onDurationInput,
  onContinuousDurationSelect,
}) => {
  const [duration, setDuration] = React.useState(30);
  const isContinuous = React.useMemo(() => durations && durations.includes('continuous'), [durations]);

  const handleContinuousCheckBoxChange = React.useCallback(
    (checked) => {
      onContinuousDurationSelect(checked);
    },
    [onContinuousDurationSelect]
  );

  const handleEnterKey = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }
      onDurationInput(duration);
    },
    [onDurationInput, duration]
  );

  return (
    <Flex>
      <FlexItem flex={{ default: 'flex_1' }}>
        <TextInput
          type="number"
          value={duration}
          id="duration-input"
          aria-label="duration filter"
          onChange={(e) => setDuration(Number(e))}
          min="0"
          onKeyDown={handleEnterKey}
        />
      </FlexItem>
      <FlexItem>
        <Checkbox
          label="Continuous"
          id="continuous-checkbox"
          isChecked={isContinuous}
          onChange={handleContinuousCheckBoxChange}
        />
      </FlexItem>
    </Flex>
  );
};
