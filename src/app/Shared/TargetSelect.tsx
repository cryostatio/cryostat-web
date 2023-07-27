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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { SerializedTarget } from '@app/Shared/SerializedTarget';
import { ServiceContext } from '@app/Shared/Services/Services';
import { includesTarget, NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { NoTargetSelected } from '@app/TargetView/NoTargetSelected';
import { getFromLocalStorage } from '@app/utils/LocalStorage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Select,
  SelectGroup,
  SelectOption,
  SelectVariant,
} from '@patternfly/react-core';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface TargetSelectProps {
  // display a simple, non-expandable component. set this if the view elsewhere
  // contains a <SerializedTarget /> or other repeated components
  simple?: boolean;
  onSelect?: (target: Target) => void;
}

export const TargetSelect: React.FC<TargetSelectProps> = ({ onSelect, simple, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const firstLoadRef = React.useRef(false);

  const [isExpanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState<Target>(NO_TARGET);
  const [targets, setTargets] = React.useState([] as Target[]);
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);

  const onExpand = React.useCallback(() => {
    setExpanded((v) => !v);
  }, [setExpanded]);

  const _refreshTargetList = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.targets.queryForTargets().subscribe(() => {
        // Reset loading and context.targets.targets will emit
        setLoading(false);
      })
    );
  }, [addSubscription, context.targets, setLoading]);

  const handleSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      setDropdownOpen(false);
      const toSelect: Target = isPlaceholder ? NO_TARGET : selection;
      onSelect && onSelect(toSelect);
      setSelected(toSelect);
    },
    [setDropdownOpen, onSelect, setSelected]
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
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.settings, _refreshTargetList]);

  React.useEffect(() => {
    if (selected !== NO_TARGET && !includesTarget(targets, selected)) {
      handleSelect(undefined, undefined, true);
    }
    if (targets.length && !firstLoadRef.current) {
      firstLoadRef.current = true;
      const cachedUrl = getFromLocalStorage('TARGET', undefined);
      const matched = targets.find((tn) => tn.connectUrl === cachedUrl);
      if (matched) {
        handleSelect(undefined, matched, false);
      }
    }
  }, [handleSelect, targets, selected, firstLoadRef]);

  const selectOptions = React.useMemo(() => {
    let options = [] as JSX.Element[];

    const groupNames = new Set<string>();
    targets.forEach((t) => groupNames.add(t.annotations?.cryostat['REALM'] || 'Others'));

    options = options.concat(
      Array.from(groupNames)
        .map((name) => (
          <SelectGroup key={name} label={name}>
            {targets
              .filter((t) => (t.annotations?.cryostat['REALM'] || 'Others') === name)
              .map((t: Target) => (
                <SelectOption key={t.connectUrl} value={t} isPlaceholder={false}>
                  {!t.alias || t.alias === t.connectUrl ? `${t.connectUrl}` : `${t.alias} (${t.connectUrl})`}
                </SelectOption>
              ))}
          </SelectGroup>
        ))
        .sort((a, b) => `${a.props['label']}`.localeCompare(`${b.props['label']}`))
    );
    return options;
  }, [targets]);

  const handleTargetFilter = React.useCallback(
    (_, value: string) => {
      if (!value) {
        return selectOptions;
      }
      const matchExp = new RegExp(value, 'i');
      return selectOptions
        .filter((grp) => grp.props.children)
        .map((grp) =>
          React.cloneElement(grp, {
            children: grp.props.children.filter(
              (option) => matchExp.test(option.props.value.connectUrl) || matchExp.test(option.props.value.alias)
            ),
          })
        )
        .filter((grp) => grp.props.children.length > 0);
    },
    [selectOptions]
  );

  const cardHeaderProps = React.useMemo(
    () =>
      simple
        ? {}
        : {
            onExpand: onExpand,
            toggleButtonProps: {
              id: 'target-select-expand-button',
              'aria-label': 'Details',
              'aria-labelledby': 'expandable-card-title target-select-expand-button',
              'aria-expanded': isExpanded,
            },
          },
    [simple, onExpand, isExpanded]
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
            <Select
              placeholderText="Select a target"
              toggleIcon={<ContainerNodeIcon />}
              variant={SelectVariant.single}
              hasInlineFilter
              inlineFilterPlaceholderText="Filter by target"
              isGrouped
              onFilter={handleTargetFilter}
              onSelect={handleSelect}
              onToggle={setDropdownOpen}
              selections={selected.alias || selected.connectUrl}
              isFlipEnabled={true}
              menuAppendTo="parent"
              maxHeight="20em"
              isOpen={isDropdownOpen}
              aria-label="Select Target"
            >
              {selectOptions}
            </Select>
          </CardBody>
          <CardExpandableContent>
            <CardBody>
              {selected === NO_TARGET ? <NoTargetSelected /> : <SerializedTarget target={selected} />}
            </CardBody>
          </CardExpandableContent>
        </>
      )}
    </Card>
  );
};
