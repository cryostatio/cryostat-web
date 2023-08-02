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
import { topologyConfigSetViewModeIntent, topologyDeleteAllFiltersIntent } from '@app/Shared/Redux/ReduxStore';
import { portalRoot } from '@app/utils/utils';
import { Button, Popover, Toolbar, ToolbarContent, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { TopologyIcon, ListIcon, MouseIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import { Visualization } from '@patternfly/react-topology';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { QuickSearchModal } from '../Actions/QuickSearchPanel';
import Shortcuts, { ShortcutCommand } from '../Shared/Shortcuts';
import { DisplayOptions } from './DisplayOptions';
import { FindByMatchExpression } from './FindByMatchExpression';
import { HelpButton } from './HelpButton';
import { QuickSearchButton } from './QuickSearchButton';
import { TopologyFilterChips } from './TopologyFilterChips';
import { TopologyFilters } from './TopologyFilters';

export enum TopologyToolbarVariant {
  Graph = 'graph',
  List = 'list',
}

export interface TopologyToolbarProps {
  variant: TopologyToolbarVariant;
  visualization?: Visualization; // Required when variant is graph
  isDisabled?: boolean;
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = ({ variant, visualization, isDisabled, ...props }) => {
  const isGraphView = variant === TopologyToolbarVariant.Graph;
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [quicksearchOpen, setQuicksearchOpen] = React.useState(false);

  const toggleView = React.useCallback(() => {
    dispatch(topologyConfigSetViewModeIntent(isGraphView ? 'list' : 'graph'));
  }, [dispatch, isGraphView]);

  const handleClearAllFilters = React.useCallback(() => {
    dispatch(topologyDeleteAllFiltersIntent());
  }, [dispatch]);

  const handleQuickSearch = React.useCallback(() => {
    setQuicksearchOpen(true);
    // Close the mini menu if open
    const contextMenu = document.getElementById('topology-context-menu');
    if (contextMenu) {
      contextMenu.style.display = 'none';
    }
  }, [setQuicksearchOpen]);

  const modeIcon = React.useMemo(
    () => (
      <Tooltip
        entryDelay={0}
        content={isGraphView ? t('Topology.LIST_VIEW') : t('Topology.GRAPH_VIEW')}
        aria="none"
        aria-live="polite"
        appendTo={portalRoot}
      >
        <Button className="topology__view-switcher" aria-label="Clipboard" variant="plain" onClick={toggleView}>
          {isGraphView ? <ListIcon /> : <TopologyIcon />}
        </Button>
      </Tooltip>
    ),
    [isGraphView, toggleView, t]
  );

  const shortcuts = React.useMemo(() => {
    return isGraphView ? (
      <Popover
        hasAutoWidth
        bodyContent={
          <Shortcuts
            shortcuts={[
              {
                id: 'drag-shortcut',
                description: 'Move',
                shortcut: <ShortcutCommand commands={[{ id: 'drag-command', command: 'Drag', icon: <MouseIcon /> }]} />,
              },
              {
                id: 'click-shortcut',
                description: 'View details in side panel',
                shortcut: (
                  <ShortcutCommand commands={[{ id: 'click-command', command: 'Click', icon: <MouseIcon /> }]} />
                ),
              },
              {
                id: 'right-click-shortcut',
                description: 'Access context menu',
                shortcut: (
                  <ShortcutCommand
                    commands={[{ id: 'right-click-command', command: 'Right click', icon: <MouseIcon /> }]}
                  />
                ),
              },
              {
                id: 'ctrl-space-shortcut',
                description: 'Open quick search modal',
                shortcut: (
                  <ShortcutCommand
                    commands={[
                      { id: 'ctrl-command', command: 'Ctrl' },
                      { id: 'space-command', command: 'Spacebar' },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
        position="left"
      >
        <Button variant="link" icon={<QuestionCircleIcon />}>
          View shortcuts
        </Button>
      </Popover>
    ) : null;
  }, [isGraphView]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space') {
        setQuicksearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setQuicksearchOpen]);

  return (
    <>
      <Toolbar
        {...props}
        id={`${variant}-topology-toolbar`}
        aria-label={`${variant}-topology-toolbar`}
        className="topology__toolbar-container"
        clearAllFilters={handleClearAllFilters}
      >
        <ToolbarContent className="topology__toolbar-main-content" key={'main-content'}>
          <ToolbarItem>
            <QuickSearchButton tooltipContent={'Add to view'} onClick={handleQuickSearch} />
          </ToolbarItem>
          <ToolbarItem>
            <DisplayOptions isGraph={isGraphView} isDisabled={isDisabled} />
          </ToolbarItem>
          <ToolbarItem>
            <TopologyFilters isDisabled={isDisabled} />
          </ToolbarItem>
          <ToolbarItem>
            <FindByMatchExpression isDisabled={isDisabled} />
          </ToolbarItem>
          {isGraphView && !isDisabled ? (
            <ToolbarItem>
              <HelpButton visualization={visualization} />
            </ToolbarItem>
          ) : null}
          {!isDisabled ? <ToolbarItem alignment={{ default: 'alignRight' }}>{shortcuts}</ToolbarItem> : null}
          <ToolbarItem alignment={isDisabled ? { default: 'alignRight' } : undefined}>{modeIcon}</ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <TopologyFilterChips className="topology__toolbar-chip-content" />
      <QuickSearchModal isOpen={quicksearchOpen} onClose={() => setQuicksearchOpen(false)} />
    </>
  );
};
