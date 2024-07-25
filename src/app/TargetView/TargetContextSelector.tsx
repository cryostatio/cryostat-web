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
import { LinearDotSpinner } from '@app/Shared/Components/LinearDotSpinner';
import { Target } from '@app/Shared/Services/api.types';
import { isEqualTarget, getTargetRepresentation } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getFromLocalStorage, removeFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { getAnnotation } from '@app/utils/utils';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  Divider,
  MenuFooter,
  SearchInput,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuSearch,
  MenuSearchInput,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

export interface TargetContextSelectorProps {
  className?: string;
}

export const TargetContextSelector: React.FC<TargetContextSelectorProps> = ({ className, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [targets, setTargets] = React.useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<Target>();
  const [favorites, setFavorites] = React.useState<string[]>(getFromLocalStorage('TARGET_FAVORITES', []));
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [isTargetOpen, setIsTargetOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);

  const onToggleClick = React.useCallback(() => {
    setIsTargetOpen((v) => !v);
  }, [setIsTargetOpen]);

  const onSelect = React.useCallback(
    (_, target) => {
      setIsTargetOpen(false);
      if (!isEqualTarget(target, selectedTarget)) {
        setSelectedTarget(target);
        context.target.setTarget(target);
      }
    },
    [targets, setSelectedTarget, setIsTargetOpen, context.target],
  );

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        setSelectedTarget(target);
        if (target) {
          // Only save to local storage when target is valid
          // NO_TARGET will clear storage
          saveToLocalStorage('TARGET', target.connectUrl);
        }
      }),
    );
  }, [addSubscription, context.target, setSelectedTarget]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    if (!targets.length) {
      return;
    }
    const cachedTargetUrl = getFromLocalStorage('TARGET', '');
    const matchedTarget = targets.find((t) => t.connectUrl === cachedTargetUrl);

    if (matchedTarget) {
      context.target.setTarget(matchedTarget);
    } else {
      context.target.setTarget(undefined);
      removeFromLocalStorage('TARGET');
    }
    setFavorites((old) => old.filter((f) => targets.some((t) => t.connectUrl === f)));
  }, [targets, context.target, setFavorites]);

  const refreshTargetList = React.useCallback(() => {
    setLoading(true);
    addSubscription(context.targets.queryForTargets().subscribe(() => setLoading(false)));
  }, [addSubscription, context.targets, setLoading]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTargetList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshTargetList]);

  const noOptions = React.useMemo(() => targets.length === 0, [targets]);

  const selectOptions = React.useMemo(() => {
    if (noOptions) {
      return [
        <DropdownItem itemId={undefined} key={'no-target-found'} isDisabled>
          No target found
        </DropdownItem>,
      ];
    }

    const matchExp = new RegExp(searchTerm, 'i');
    const filteredTargets = targets.filter(
      (t) =>
        matchExp.test(t.alias) ||
        matchExp.test(t.connectUrl) ||
        matchExp.test(t.annotations.cryostat.find((kv) => kv.key === 'REALM')?.value || ''),
    );

    const groupNames = new Set<string>();
    filteredTargets.forEach((t) => groupNames.add(getAnnotation(t.annotations.cryostat, 'REALM') || 'Others'));

    const options = Array.from(groupNames)
      .map((name) => (
        <DropdownGroup key={name} label={name}>
          {targets
            .filter((t) => getAnnotation(t.annotations.cryostat, 'REALM') === name)
            .map((t: Target) => (
              <DropdownItem
                isFavorited={favorites.includes(t.connectUrl)}
                itemId={t}
                key={t.connectUrl}
                description={t.connectUrl}
              >
                {t.alias}
              </DropdownItem>
            ))}
        </DropdownGroup>
      ))
      .sort((a, b) => `${a.props['label']}`.localeCompare(`${b.props['label']}`));

    const favGroup =
      !searchTerm && favorites.length
        ? [
            <DropdownGroup key={'Favorites'} label={'Favorites'}>
              {favorites
                .map((f) => targets.find((t) => t.connectUrl === f))
                .filter((t) => t !== undefined)
                .map((t: Target) => (
                  <DropdownItem isFavorited itemId={t} key={`favorited-${t.connectUrl}`} description={t.connectUrl}>
                    {t.alias}
                  </DropdownItem>
                ))}
            </DropdownGroup>,
            <Divider key={'favorite-divider'} />,
          ]
        : [];

    return favGroup.concat(options);
  }, [targets, noOptions, favorites, searchTerm]);

  const onFavoriteClick = React.useCallback(
    (_, item: Target, actionId: string) => {
      if (!actionId) {
        return;
      }
      setFavorites((old) => {
        const prevFav = old.includes(item.connectUrl);
        const toUpdate = prevFav ? old.filter((f) => f !== item.connectUrl) : [...old, item.connectUrl];
        saveToLocalStorage('TARGET_FAVORITES', toUpdate);
        return toUpdate;
      });
    },
    [favorites, setFavorites],
  );

  const onClearSelection = React.useCallback(() => {
    setIsTargetOpen(false);
    removeFromLocalStorage('TARGET');
    setSelectedTarget(undefined);
    context.target.setTarget(undefined);
  }, [setSelectedTarget, setIsTargetOpen, context.target]);

  const selectionPrefix = React.useMemo(
    () => (!selectedTarget ? undefined : <span style={{ fontWeight: 700 }}>Target:</span>),
    [selectedTarget],
  );

  const selectFooter = React.useMemo(
    () => (
      <Split hasGutter>
        <SplitItem>
          <Button variant="secondary" component={(props) => <Link {...props} to={'/topology/create-custom-target'} />}>
            Create target
          </Button>
        </SplitItem>
        <SplitItem>
          <Button variant="tertiary" onClick={onClearSelection}>
            Clear selection
          </Button>
        </SplitItem>
      </Split>
    ),
    [],
  );

  return (
    <>
      <div className="target-context-selector__wrapper" {...props} data-quickstart-id={'target-select'}>
        {isLoading ? (
          <LinearDotSpinner className="target-context-selector__linear-dot-spinner" />
        ) : (
          <Dropdown
            className={className}
            isScrollable
            placeholder="Select a Target"
            isOpen={isTargetOpen}
            onOpenChange={(isOpen) => setIsTargetOpen(isOpen)}
            onOpenChangeKeys={['Escape']}
            onSelect={onSelect}
            onActionClick={onFavoriteClick}
            toggle={(toggleRef) => (
              <MenuToggle
                aria-label="Select Target"
                ref={toggleRef}
                onClick={onToggleClick}
                isExpanded={isTargetOpen}
                variant="plainText"
                icon={selectionPrefix}
              >
                {!selectedTarget ? 'Select a Target' : getTargetRepresentation(selectedTarget)}
              </MenuToggle>
            )}
            popperProps={{
              enableFlip: true,
              appendTo: portalRoot,
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
            <MenuFooter>{selectFooter}</MenuFooter>
          </Dropdown>
        )}
      </div>
      <Divider />
    </>
  );
};
