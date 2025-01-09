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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { QuickStartCatalogPage } from '@patternfly/quickstarts';
import * as React from 'react';

export interface QuickStartsCatalogPageProps {}

const QuickStartsCatalogPage: React.FC<QuickStartsCatalogPageProps> = (_) => {
  const { t } = useCryostatTranslation();

  // TODO: Quick start categories (patternfly/quickstarts supports this through individual components)
  // e.g. Dashboard Quick starts, Topology Quick starts, Recording Quick starts, etc.
  return (
    <QuickStartCatalogPage
      title={t('QuickStarts.CATALOG_PAGE.TITLE')}
      hint={t('QuickStarts.CATALOG_PAGE.HINT')}
      showTitle
      showFilter
      sortFnc={(a, b) => a.metadata.order - b.metadata.order}
    />
  );
};

export default QuickStartsCatalogPage;
