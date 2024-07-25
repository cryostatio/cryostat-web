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
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
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
  const [isTargetOpen, setIsTargetOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);

  const onToggleClick = () => {
    setIsTargetOpen(!isTargetOpen);
  };

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

    const favSet = new Set(favorites);

    const groupNames = new Set<string>();
    targets.forEach((t) => groupNames.add(getAnnotation(t.annotations.cryostat, 'REALM') || 'Others'));

    const options = Array.from(groupNames)
      .map((name) => (
        <DropdownGroup key={name} label={name}>
          {targets
            .filter((t) => getAnnotation(t.annotations.cryostat, 'REALM') === name)
            .map((t: Target) => (
              <DropdownItem isSelected={favSet.has(t.connectUrl)} itemId={t} key={t.connectUrl}>
                {getTargetRepresentation(t)}
              </DropdownItem>
            ))}
        </DropdownGroup>
      ))
      .sort((a, b) => `${a.props['label']}`.localeCompare(`${b.props['label']}`));

    const favGroup = favorites.length
      ? [
          <DropdownGroup key={'Favorites'} label={'Favorites'}>
            {favorites
              .map((f) => targets.find((t) => t.connectUrl === f))
              .filter((t) => t !== undefined)
              .map((t: Target) => (
                <DropdownItem
                  //isFavorite
                  itemId={t}
                  key={`favorited-${t.connectUrl}`}
                >
                  {getTargetRepresentation(t)}
                </DropdownItem>
              ))}
          </DropdownGroup>,
          <Divider key={'favorite-divider'} />,
        ]
      : [];

    return favGroup.concat(options);
  }, [targets, noOptions, favorites]);

  const handleTargetFilter = React.useCallback(
    (_, value: string) => {
      if (!value || noOptions) {
        // In case of empty options, placeholder is returned.
        return selectOptions;
      }

      const matchExp = new RegExp(value, 'i');
      return selectOptions
        .filter((grp) => grp.props.children)
        .map((grp) =>
          React.cloneElement(grp, {
            children: grp.props.children.filter((option) => {
              const { target } = option.props.value;
              return matchExp.test(target.connectUrl) || matchExp.test(target.alias);
            }),
          }),
        )
        .filter((grp) => grp.props.children.length > 0);
    },
    [selectOptions, noOptions],
  );

  const handleFavorite = React.useCallback(
    (itemId: string, isFavorite: boolean) => {
      setFavorites((old) => {
        const toUpdate = !isFavorite ? [...old, itemId] : old.filter((f) => f !== itemId);
        saveToLocalStorage('TARGET_FAVORITES', toUpdate);
        return toUpdate;
      });
    },
    [setFavorites],
  );

  const selectionPrefix = React.useMemo(
    () => (!selectedTarget ? undefined : <span style={{ fontWeight: 700 }}>Target:</span>),
    [selectedTarget],
  );

  const selectFooter = React.useMemo(
    () => (
      <Link to={'/topology/create-custom-target'}>
        <Button variant="secondary">Create target</Button>
      </Link>
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
            isPlain
            isScrollable
            placeholder="Select Target"
            isOpen={isTargetOpen}
            onOpenChange={(isOpen) => setIsTargetOpen(isOpen)}
            onOpenChangeKeys={['Escape']}
            onSelect={onSelect}
            toggle={(toggleRef) => (
              <MenuToggle
                aria-label="Select Target"
                ref={toggleRef}
                onClick={onToggleClick}
                isExpanded={isTargetOpen}
                variant="plainText"
                icon={selectionPrefix}
              >
                {!selectedTarget ? undefined : getTargetRepresentation(selectedTarget)}
              </MenuToggle>
            )}
            popperProps={{
              enableFlip: true,
              appendTo: portalRoot,
              //maxHeight: '30em',
            }}
          >
            <MenuSearch>
              <MenuSearchInput>
                <SearchIcon />
                <SearchInput placeholder="Filter by target..." onSearch={handleTargetFilter} />
              </MenuSearchInput>
              {favorites}
              {handleFavorite}
            </MenuSearch>
            <DropdownList>{selectOptions}</DropdownList>
            <MenuFooter>{selectFooter}</MenuFooter>
          </Dropdown>
        )}
      </div>
      <Divider />
    </>
  );
};
