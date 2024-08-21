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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Target } from '@app/Shared/Services/api.types';
import { includesTarget, isEqualTarget } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NoTargetSelected } from '@app/TargetView/NoTargetSelected';
import { SerializedTarget } from '@app/TargetView/SerializedTarget';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getFromLocalStorage } from '@app/utils/LocalStorage';
import { getAnnotation } from '@app/utils/utils';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Dropdown,
  MenuToggle,
  SearchInput,
  MenuSearch,
  MenuSearchInput,
  DropdownGroup,
  MenuToggleElement,
  Divider,
  DropdownList,
  DropdownItem,
} from '@patternfly/react-core';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';

export interface TargetSelectProps {
  simple?: boolean; // Display a simple, non-expandable component
  onSelect?: (target?: Target) => void;
}

export const TargetSelect: React.FC<TargetSelectProps> = ({ onSelect, simple, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const firstLoadRef = React.useRef(false);

  const [isExpanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState<Target>();
  const [targets, setTargets] = React.useState<Target[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleToggle = React.useCallback(() => setIsDropdownOpen((v) => !v), [setIsDropdownOpen]);

  const handleExpand = React.useCallback(() => setExpanded((v) => !v), [setExpanded]);

  const _refreshTargetList = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.targets.queryForTargets().subscribe(() => {
        // Reset loading and context.targets.targets will emit
        setLoading(false);
      }),
    );
  }, [addSubscription, context.targets, setLoading]);

  const handleSelect = React.useCallback(
    (_, target) => {
      setIsDropdownOpen(false);
      if (!isEqualTarget(target, selected)) {
        onSelect && onSelect(target);
        setSelected(target);
      }
    },
    [setIsDropdownOpen, onSelect, setSelected, selected],
  );

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => _refreshTargetList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, _refreshTargetList]);

  React.useEffect(() => {
    if (!!selected && !includesTarget(targets, selected)) {
      handleSelect(undefined, undefined);
    }
    if (targets.length && !firstLoadRef.current) {
      firstLoadRef.current = true;
      const cachedUrl = getFromLocalStorage('TARGET', undefined);
      const matched = targets.find((tn) => tn.connectUrl === cachedUrl);
      if (matched) {
        handleSelect(undefined, matched);
      }
    }
  }, [handleSelect, targets, selected, firstLoadRef]);

  const selectOptions = React.useMemo(() => {
    const matchExp = new RegExp(_.escapeRegExp(searchTerm), 'i');
    const filteredTargets = targets.filter((t) =>
      [t.alias, t.connectUrl, getAnnotation(t.annotations.cryostat, 'REALM') ?? ''].some((v) => matchExp.test(v)),
    );

    const groupNames = new Set<string>();
    filteredTargets.forEach((t) => groupNames.add(getAnnotation(t.annotations.cryostat, 'REALM') || 'Others'));

    if (filteredTargets.length === 0) {
      return [
        <DropdownItem itemId={undefined} key={'no-target-found'} isDisabled>
          No target found
        </DropdownItem>,
      ];
    }

    return Array.from(groupNames)
      .map((name) => (
        <DropdownGroup key={name} label={name}>
          {filteredTargets
            .filter((t) => getAnnotation(t.annotations.cryostat, 'REALM') === name)
            .map((t: Target) => (
              <DropdownItem itemId={t} key={t.connectUrl} description={t.connectUrl}>
                {t.alias}
              </DropdownItem>
            ))}
        </DropdownGroup>
      ))
      .sort((a, b) => `${a.props['label']}`.localeCompare(`${b.props['label']}`));
  }, [targets, searchTerm]);

  const cardHeaderProps = React.useMemo(
    () =>
      simple
        ? {}
        : {
            onExpand: handleExpand,
            toggleButtonProps: {
              id: 'target-select-expand-button',
              'aria-label': 'Details',
              'aria-labelledby': 'expandable-card-title target-select-expand-button',
              'aria-expanded': isExpanded,
            },
          },
    [simple, handleExpand, isExpanded],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        aria-label="Select Target"
        ref={toggleRef}
        onClick={handleToggle}
        isExpanded={isDropdownOpen}
        icon={<ContainerNodeIcon />}
        isFullWidth
      >
        {selected?.alias || selected?.connectUrl}
      </MenuToggle>
    ),
    [isDropdownOpen, selected, handleToggle],
  );

  return (
    <Card {...props} isRounded isCompact isFlat isExpanded={isExpanded}>
      <CardHeader {...cardHeaderProps}>
        <CardTitle>Target JVM</CardTitle>
      </CardHeader>
      {isLoading ? (
        <LoadingView />
      ) : (
        <>
          <CardBody>
            <Dropdown
              isScrollable
              placeholder="Select a Target"
              isOpen={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
              onOpenChangeKeys={['Escape']}
              onSelect={handleSelect}
              toggle={toggle}
              popperProps={{
                enableFlip: true,
              }}
            >
              <MenuSearch>
                <MenuSearchInput>
                  <SearchInput
                    placeholder="Filter by URL, alias, or discovery group..."
                    value={searchTerm}
                    onChange={(_, v) => setSearchTerm(v)}
                  />
                </MenuSearchInput>
              </MenuSearch>
              <Divider />
              <DropdownList>{selectOptions}</DropdownList>
            </Dropdown>
          </CardBody>
          <CardExpandableContent>
            <CardBody>{!selected ? <NoTargetSelected /> : <SerializedTarget target={selected} />}</CardBody>
          </CardExpandableContent>
        </>
      )}
    </Card>
  );
};
