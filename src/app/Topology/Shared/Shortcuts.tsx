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
import { TableComposable, Tbody, Td, Tr } from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';

export interface IShortcut {
  id: string;
  shortcut: React.ReactNode;
  description: React.ReactNode;
}

export interface ShortcutsProps {
  shortcuts: IShortcut[];
}

export const Shortcuts: React.FC<ShortcutsProps> = ({ shortcuts, ...props }) => {
  return (
    <TableComposable borders={false} aria-label={'Shortcuts table'} variant={'compact'} {...props}>
      <Tbody>
        {shortcuts.map((sc) => (
          <Tr key={sc.id}>
            <Td key={`${sc.id}-keyboard-shortcuts`}>{sc.shortcut}</Td>
            <Td key={`${sc.id}-keyboard-shortcuts-description`}>{sc.description}</Td>
          </Tr>
        ))}
      </Tbody>
    </TableComposable>
  );
};

export interface IShortcutCommand {
  id: string;
  icon?: React.ReactNode;
  command: string;
}

export const ShortcutCommand: React.FC<{ commands: IShortcutCommand[] }> = ({ commands, ...props }) => {
  const content = React.useMemo(() => {
    const _content = commands.map((command) => (
      <span className={'topology__shortcut-command'} key={command.id}>
        {command.icon ? (
          <span key={`${command.id}-icon`} className="topology__shortcut-command-icon">
            {command.icon}
          </span>
        ) : null}
        <kbd key={`${command.id}-command`}>{command.command}</kbd>
      </span>
    ));
    // Put + in between
    return _.flatMap(_content, (val, index) => {
      if (index < _content.length - 1) {
        return [
          val,
          <span className={'topology__shortcut-command-plus'} key={`${index}-plus`}>
            +
          </span>,
        ];
      }
      return [val];
    });
  }, [commands]);
  return <div {...props}>{content}</div>;
};

export default Shortcuts;
