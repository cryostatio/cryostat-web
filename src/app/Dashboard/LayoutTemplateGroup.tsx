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
import { dashboardConfigTemplateHistoryClearIntent } from '@app/Shared/Redux/ReduxStore';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { portalRoot } from '@app/utils/utils';
import { CatalogTile, CatalogTileBadge } from '@patternfly/react-catalog-view-extension';
import {
  Button,
  Gallery,
  Label,
  Split,
  SplitItem,
  Title,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  LayoutTemplateFilter,
  LayoutTemplate,
  SelectedLayoutTemplate,
  SerialCardConfig,
  CardConfig,
  LayoutTemplateVendor,
} from './types';

import { getCardDescriptorByName, iconify, LayoutTemplateContext } from './utils';
export interface LayoutTemplateGroupProps {
  title: LayoutTemplateFilter;
  templates: LayoutTemplate[];
  onTemplateSelect: (template: SelectedLayoutTemplate) => void;
  onTemplateDelete: (templateName: string) => void;
}

export const smallestFeatureLevel = (cards: SerialCardConfig[]): FeatureLevel => {
  return cards.reduce((minFeatureLevel: FeatureLevel, card: CardConfig) => {
    const featureLevel = getCardDescriptorByName(card.name).featureLevel;
    return Math.min(minFeatureLevel, featureLevel);
  }, FeatureLevel.PRODUCTION);
};

export const LayoutTemplateGroup: React.FC<LayoutTemplateGroupProps> = ({
  onTemplateSelect,
  onTemplateDelete,
  ...props
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTemplate, setSelectedTemplate } = React.useContext(LayoutTemplateContext);

  const handleTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      const selected = {
        template: template,
        category: props.title,
      } as SelectedLayoutTemplate;
      setSelectedTemplate(selected);
      onTemplateSelect(selected);
    },
    [setSelectedTemplate, onTemplateSelect, props.title],
  );

  const handleClearRecent = React.useCallback(() => {
    dispatch(dashboardConfigTemplateHistoryClearIntent());
  }, [dispatch]);

  return (
    <>
      <Split>
        <SplitItem>
          <Title headingLevel="h2" size="lg" style={{ padding: '1em' }}>
            {props.title} ({t('LayoutTemplateGroup.ITEMS', { count: props.templates.length })})
          </Title>
        </SplitItem>
        {props.title === t('SUGGESTED', { ns: 'common' }) && props.templates.length !== 1 && (
          <>
            <SplitItem isFilled></SplitItem>
            <SplitItem>
              <Button variant="link" onClick={handleClearRecent}>
                {t('CLEAR_RECENT', { ns: 'common' })}
              </Button>
            </SplitItem>
          </>
        )}
      </Split>
      <Gallery hasGutter className="layout-template-picker">
        {props.templates.map((template) => {
          const level = smallestFeatureLevel(template.cards);
          return (
            <CatalogTile
              featured={
                selectedTemplate &&
                selectedTemplate.template.name === template.name &&
                selectedTemplate.template.vendor == template.vendor &&
                selectedTemplate.category == props.title
              }
              id={template.name}
              key={template.name}
              icon={iconify(template.vendor)}
              title={template.name}
              vendor={template.vendor}
              onClick={() => handleTemplateSelect(template)}
              badges={[
                level !== FeatureLevel.PRODUCTION && (
                  <CatalogTileBadge>
                    <Label key={template.name} isCompact color={level === FeatureLevel.BETA ? 'green' : 'red'}>
                      {t(FeatureLevel[level])}
                    </Label>
                  </CatalogTileBadge>
                ),
                <KebabCatalogTileBadge template={template} onTemplateDelete={onTemplateDelete} key={template.name} />,
              ]}
            >
              {template.description}
            </CatalogTile>
          );
        })}
      </Gallery>
    </>
  );
};

export interface KebabCatalogTileBadgeProps {
  template: LayoutTemplate;
  onTemplateDelete: (templateName: string) => void;
}

export const KebabCatalogTileBadge: React.FC<KebabCatalogTileBadgeProps> = ({ template, onTemplateDelete }) => {
  const serviceContext = React.useContext(ServiceContext);
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, _value: string | number | undefined) => {
    setIsOpen(false);
  };

  const handleTemplateDownload = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      serviceContext.api.downloadLayoutTemplate(template);
    },
    [serviceContext.api, template],
  );

  const handleTemplateDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTemplateDelete(template.name);
    },
    [onTemplateDelete, template.name],
  );

  const dropdownItems = React.useMemo(() => {
    return [
      <DropdownItem key={'download'} onClick={handleTemplateDownload}>
        {t('DOWNLOAD', { ns: 'common' })}
      </DropdownItem>,
      <DropdownItem key={'delete'} onClick={handleTemplateDelete}>
        {t('DELETE', { ns: 'common' })}
      </DropdownItem>,
    ];
  }, [t, handleTemplateDownload, handleTemplateDelete]);

  return (
    <CatalogTileBadge>
      <Dropdown
        onSelect={onSelect}
        onOpenChange={setIsOpen}
        isOpen={isOpen}
        onOpenChangeKeys={['Escape']}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            className={'layout-template-card__action-toggle'}
            variant="plain"
            isDisabled={template.vendor !== LayoutTemplateVendor.USER}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((open) => !open);
            }}
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>{dropdownItems}</DropdownList>
      </Dropdown>
    </CatalogTileBadge>
  );
};
