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
