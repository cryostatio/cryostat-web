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
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import * as React from 'react';

export interface DynamicFeatureFlagProps {
  levels: FeatureLevel[];
  component: (level: FeatureLevel) => React.ReactNode;
  defaultComponent?: React.ReactNode;
}

export const DynamicFeatureFlag: React.FC<DynamicFeatureFlagProps> = ({ levels, component, defaultComponent }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [activeLevel, setActiveLevel] = React.useState(FeatureLevel.PRODUCTION);

  React.useLayoutEffect(() => {
    addSubscription(context.settings.featureLevel().subscribe((featureLevel) => setActiveLevel(featureLevel)));
  }, [addSubscription, context.settings, setActiveLevel]);

  const toRender = React.useMemo(() => {
    if (levels.includes(activeLevel)) {
      return component(activeLevel);
    }
    return defaultComponent;
  }, [levels, activeLevel, component, defaultComponent]);

  return <>{toRender}</>;
};

export interface FeatureFlagProps {
  strict?: boolean;
  level: FeatureLevel;
  children?: React.ReactNode | undefined;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({ level, strict, children }) => {
  const levels = React.useMemo(
    () => (strict ? [level] : [...Array.from({ length: level + 1 }, (_, i) => i)]),
    [strict, level],
  );
  const component = React.useCallback((_: FeatureLevel) => <>{children}</>, [children]);

  return <DynamicFeatureFlag levels={levels} component={component} />;
};
