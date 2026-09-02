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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Label } from '@patternfly/react-core';
import * as React from 'react';

export interface FeatureLevelBadgeProps {
  level?: FeatureLevel;
}

export const FeatureLevelBadge: React.FC<FeatureLevelBadgeProps> = ({ level: levelProp }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [useCompactLabels, setUseCompactLabels] = React.useState(true);
  const [activeLevel, setActiveLevel] = React.useState(FeatureLevel.PRODUCTION);

  React.useEffect(() => {
    addSubscription(context.settings.largeUi().subscribe((v) => setUseCompactLabels(!v)));
  }, [addSubscription, context.settings]);

  React.useLayoutEffect(() => {
    if (levelProp === undefined) {
      addSubscription(context.settings.featureLevel().subscribe(setActiveLevel));
    }
  }, [addSubscription, context.settings, levelProp]);

  const level = levelProp ?? activeLevel;

  return (
    level !== FeatureLevel.PRODUCTION && (
      <Label
        isCompact={useCompactLabels}
        style={{ marginLeft: '2ch', paddingTop: '0.125ch', paddingBottom: '0.125ch' }}
        color={level === FeatureLevel.BETA ? 'teal' : 'red'}
      >
        {t(FeatureLevel[level])}
      </Label>
    )
  );
};
