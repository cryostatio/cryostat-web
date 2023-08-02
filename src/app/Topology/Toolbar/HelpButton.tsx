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
import { Button, Icon, Popover } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { action, Visualization } from '@patternfly/react-topology';
import * as React from 'react';

export interface HelpButtonProps {
  visualization?: Visualization;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ visualization, ...props }) => {
  const onClick = React.useCallback(() => {
    action(() => {
      visualization && visualization.getGraph().fit(120);
    })();
  }, [visualization]);

  const content = React.useMemo(
    () => (
      <>
        Search results may appear outside of the visible area.{' '}
        <Button onClick={onClick} variant="link" isInline>
          Click here
        </Button>{' '}
        to fit to the screen.
      </>
    ),
    [onClick]
  );

  return (
    <Popover bodyContent={content} position={'left'} {...props}>
      <Button variant="plain" className="topology__help-icon-button">
        <Icon status="info">
          <InfoCircleIcon className="topology__help-icon" />
        </Icon>
      </Button>
    </Popover>
  );
};
