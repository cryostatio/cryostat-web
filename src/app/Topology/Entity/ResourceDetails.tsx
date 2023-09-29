/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { EmptyText } from '@app/Shared/Components/EmptyText';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/api.types';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTermHelpText,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Label,
  LabelProps,
  Bullseye,
} from '@patternfly/react-core';
import { RunningIcon, BanIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { ResourceTypes } from './types';

export const ActiveRecDetail: React.FC<{ resources: ActiveRecording[] }> = ({ resources, ...props }) => {
  const stateGroupConfigs = React.useMemo(
    () => [
      {
        groupLabel: 'Running',
        color: 'green',
        icon: <RunningIcon color="green" />,
        items: resources.filter((rec) => rec.state === RecordingState.RUNNING),
      },
      {
        groupLabel: 'Stopped',
        color: 'orange',
        icon: <BanIcon color="orange" />,
        items: resources.filter((rec) => rec.state === RecordingState.STOPPED),
      },
    ],
    [resources],
  );

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTermHelpText>Recording Status</DescriptionListTermHelpText>
        <DescriptionListDescription>
          <Flex {...props}>
            {stateGroupConfigs.map(({ groupLabel, items, color, icon }) => (
              <Flex key={groupLabel}>
                <FlexItem spacer={{ default: 'spacerSm' }}>
                  <span style={{ fontSize: '1.1em' }}>{items.length}</span>
                </FlexItem>
                <FlexItem>
                  <Label icon={icon} color={color as LabelProps['color']}>
                    {groupLabel}
                  </Label>
                </FlexItem>
              </Flex>
            ))}
          </Flex>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export const Nothing: React.FC<{ resources: ResourceTypes[] }> = () => {
  return (
    <Bullseye>
      <EmptyText text={'Nothing to show.'} />
    </Bullseye>
  );
};
