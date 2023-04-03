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
import { LinearDotSpinner } from '@app/Shared/LinearDotSpinner';
import { ServiceContext } from '@app/Shared/Services/Services';
import { getTargetRepresentation, isEqualTarget, NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { getFromLocalStorage, removeFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Divider, Select, SelectGroup, SelectOption, SelectVariant } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

export const TargetContextSelector: React.FC<{ className?: string }> = ({ className, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [targets, setTargets] = React.useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<Target>(NO_TARGET);
  const [favorites, setFavorites] = React.useState<string[]>(getFromLocalStorage('TARGET_FAVORITES', []));
  const [isTargetOpen, setIsTargetOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);

  const handleSelectToggle = React.useCallback(() => setIsTargetOpen((old) => !old), [setIsTargetOpen]);

  const handleTargetSelect = React.useCallback(
    (_, { target }, isPlaceholder) => {
      setIsTargetOpen(false);
      const toSelect: Target = isPlaceholder ? NO_TARGET : target;
      if (!isEqualTarget(toSelect, selectedTarget)) {
        context.target.setTarget(toSelect);
      }
    },
    [setIsTargetOpen, selectedTarget, context.target]
  );

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        setSelectedTarget(target);
        if (target !== NO_TARGET) {
          // Only save to local storage when target is valid
          // NO_TARGET will clear storage
          saveToLocalStorage('TARGET', target.connectUrl);
        }
      })
    );
  }, [addSubscription, context.target, setSelectedTarget]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    if (!targets.length) {
      return;
    }
    const cachedTargetUrl = getFromLocalStorage('TARGET', NO_TARGET);
    const matchedTarget = targets.find((t) => t.connectUrl === cachedTargetUrl);

    if (matchedTarget) {
      context.target.setTarget(matchedTarget);
    } else {
      context.target.setTarget(NO_TARGET);
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
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshTargetList]);

  const noOptions = React.useMemo(() => targets.length === 0, [targets]);

  const selectOptions = React.useMemo(() => {
    if (noOptions) {
      return [
        <SelectOption key={'no-target-found'} isPlaceholder isDisabled>
          No target found
        </SelectOption>,
      ];
    }

    const favSet = new Set(favorites);

    const groupNames = new Set<string>();
    targets.forEach((t) => groupNames.add(t.annotations?.cryostat['REALM'] || 'Others'));

    const options = Array.from(groupNames)
      .map((name) => (
        <SelectGroup key={name} label={name}>
          {targets
            .filter((t) => (t.annotations?.cryostat['REALM'] || 'Others') === name)
            .map((t: Target) => (
              <SelectOption
                isFavorite={favSet.has(t.connectUrl)}
                id={t.connectUrl}
                key={t.connectUrl}
                value={{
                  toString: () => getTargetRepresentation(t),
                  compareTo: (other) => other.target.connectUrl === t.connectUrl,
                  ...{ target: t }, // Bypassing type checks
                }}
              />
            ))}
        </SelectGroup>
      ))
      .sort((a, b) => `${a.props['label']}`.localeCompare(`${b.props['label']}`));

    const favGroup = favorites.length
      ? [
          <SelectGroup key={'Favorites'} label={'Favorites'}>
            {favorites
              .map((f) => targets.find((t) => t.connectUrl === f))
              .filter((t) => t !== undefined)
              .map((t: Target) => (
                <SelectOption
                  isFavorite
                  id={t.connectUrl}
                  key={`favorited-${t.connectUrl}`}
                  value={{
                    toString: () => getTargetRepresentation(t),
                    compareTo: (other) => other.target.connectUrl === t.connectUrl,
                    ...{ target: t },
                  }}
                />
              ))}
          </SelectGroup>,
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
          })
        )
        .filter((grp) => grp.props.children.length > 0);
    },
    [selectOptions, noOptions]
  );

  const handleFavorite = React.useCallback(
    (itemId: string, isFavorite: boolean) => {
      setFavorites((old) => {
        const toUpdate = !isFavorite ? [...old, itemId] : old.filter((f) => f !== itemId);
        saveToLocalStorage('TARGET_FAVORITES', toUpdate);
        return toUpdate;
      });
    },
    [setFavorites]
  );

  const selectionPrefix = React.useMemo(
    () => (selectedTarget !== NO_TARGET ? <span style={{ fontWeight: 700 }}>Target:</span> : undefined),
    [selectedTarget]
  );

  const selectFooter = React.useMemo(
    () => (
      <Link to={'/topology/create-custom-target'}>
        <Button variant="secondary">Create Target</Button>
      </Link>
    ),
    []
  );

  return (
    <>
      <div className="target-context-selector__wrapper" {...props} data-quickstart-id={'target-select'}>
        {isLoading ? (
          <LinearDotSpinner className="target-context-selector__linear-dot-spinner" />
        ) : (
          <Select
            className={className}
            isPlain
            variant={SelectVariant.single}
            aria-label="Select Target"
            maxHeight="30em"
            isFlipEnabled={true}
            menuAppendTo={'parent'}
            placeholderText={'Select a target'}
            isOpen={isTargetOpen}
            onToggle={handleSelectToggle}
            onSelect={handleTargetSelect}
            hasInlineFilter
            inlineFilterPlaceholderText="Filter by target..."
            toggleIcon={selectionPrefix}
            onFilter={handleTargetFilter}
            isGrouped={!noOptions}
            selections={
              selectedTarget !== NO_TARGET
                ? {
                    toString: () => getTargetRepresentation(selectedTarget),
                    compareTo: (other) => other.target.connectUrl === selectedTarget.connectUrl,
                    ...{ target: selectedTarget },
                  }
                : undefined
            }
            footer={selectFooter}
            favorites={favorites}
            onFavorite={handleFavorite}
          >
            {selectOptions}
          </Select>
        )}
      </div>
      <Divider />
    </>
  );
};
