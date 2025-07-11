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
import { Card, CardBody, CardTitle, Text, TextVariants } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans } from 'react-i18next';

export const NoTargetSelected: React.FC = () => {
  const { t } = useCryostatTranslation();

  return (
    <>
      <Card>
        <CardTitle>
          <Trans t={t} components={[<DisconnectedIcon />]}>
            NoTargetSelected.TITLE
          </Trans>
        </CardTitle>
        <CardBody>
          <Text component={TextVariants.p}>{t('NoTargetSelected.BODY')}</Text>
        </CardBody>
      </Card>
    </>
  );
};
