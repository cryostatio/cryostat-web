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
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { DualListSelector } from '@patternfly/react-core/deprecated';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as React from 'react';
import { first } from 'rxjs';

const WHAT_OPTIONS = [
  'add',
  'age',
  'alloc',
  'annotation',
  'arguments',
  'attach',
  'barrier',
  'biasedlocking',
  'blocks',
  'bot',
  'breakpoint',
  'bytecode',
  'cds',
  'census',
  'class',
  'classhisto',
  'cleanup',
  'codecache',
  'compaction',
  'compilation',
  'condy',
  'constantpool',
  'constraints',
  'container',
  'coops',
  'cpu',
  'cset',
  'data',
  'datacreation',
  'dcmd',
  'decoder',
  'defaultmethods',
  'director',
  'dump',
  'dynamic',
  'ergo',
  'event',
  'exceptions',
  'exit',
  'fingerprint',
  'free',
  'freelist',
  'gc',
  'handshake',
  'hashtables',
  'heap',
  'humongous',
  'ihop',
  'iklass',
  'indy',
  'init',
  'inlining',
  'install',
  'interpreter',
  'itables',
  'jfr',
  'jit',
  'jni',
  'jvmci',
  'jvmti',
  'lambda',
  'library',
  'liveness',
  'load',
  'loader',
  'logging',
  'malloc',
  'map',
  'mark',
  'marking',
  'membername',
  'memops',
  'metadata',
  'metaspace',
  'methodcomparator',
  'methodhandles',
  'mirror',
  'mmu',
  'module',
  'monitorinflation',
  'monitormismatch',
  'nestmates',
  'nmethod',
  'nmt',
  'normalize',
  'numa',
  'objecttagging',
  'obsolete',
  'oldobject',
  'oom',
  'oopmap',
  'oops',
  'oopstorage',
  'os',
  'owner',
  'pagesize',
  'parser',
  'patch',
  'path',
  'perf',
  'periodic',
  'phases',
  'plab',
  'placeholders',
  'preorder',
  'preview',
  'promotion',
  'protectiondomain',
  'ptrqueue',
  'purge',
  'record',
  'redefine',
  'ref',
  'refine',
  'region',
  'reloc',
  'remset',
  'resolve',
  'safepoint',
  'sampling',
  'scavenge',
  'sealed',
  'setting',
  'smr',
  'stackbarrier',
  'stackmap',
  'stacktrace',
  'stackwalk',
  'start',
  'startup',
  'startuptime',
  'state',
  'stats',
  'streaming',
  'stringdedup',
  'stringtable',
  'subclass',
  'survivor',
  'suspend',
  'sweep',
  'symboltable',
  'system',
  'table',
  'task',
  'thread',
  'throttle',
  'time',
  'timer',
  'tlab',
  'tracking',
  'trimnative',
  'unload',
  'unshareable',
  'update',
  'valuebasedclasses',
  'verification',
  'verify',
  'vmmutex',
  'vmoperation',
  'vmthread',
  'vtables',
  'vtablestubs',
  'workgangtags',
];
const DECORATOR_OPTIONS = [
  'time',
  'utctime',
  'uptime',
  'timemillis',
  'uptimemillis',
  'timenanos',
  'uptimenanos',
  'hostname',
  'pid',
  'tid',
  'level',
  'tags',
];

export interface GcLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'enable' | 'reconfigure';
  currentWhat?: string;
  currentDecorators?: string;
}

export const GcLoggingModal: React.FC<GcLoggingModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentWhat,
  currentDecorators,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setTarget));
  }, [addSubscription, context.target]);

  const initChosenWhat = React.useMemo(
    () => (mode === 'reconfigure' && currentWhat ? currentWhat.split('+').filter(Boolean) : ['gc']),
    [mode, currentWhat],
  );

  const initChosenDecorators = React.useMemo(
    () =>
      mode === 'reconfigure' && currentDecorators ? currentDecorators.split(',').filter(Boolean) : ['time', 'level'],
    [mode, currentDecorators],
  );

  const [enabled, setEnabled] = React.useState(true);
  const [chosenWhat, setChosenWhat] = React.useState<string[]>(initChosenWhat);
  const [chosenDecorators, setChosenDecorators] = React.useState<string[]>(initChosenDecorators);
  const [customWhatInput, setCustomWhatInput] = React.useState('');
  const [customDecoratorInput, setCustomDecoratorInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setEnabled(true);
      setChosenWhat(initChosenWhat);
      setChosenDecorators(initChosenDecorators);
      setCustomWhatInput('');
      setCustomDecoratorInput('');
      setIsSubmitting(false);
    }
  }, [isOpen, initChosenWhat, initChosenDecorators]);

  const availableWhat = React.useMemo(() => WHAT_OPTIONS.filter((o) => !chosenWhat.includes(o)), [chosenWhat]);

  const availableDecorators = React.useMemo(
    () => DECORATOR_OPTIONS.filter((o) => !chosenDecorators.includes(o)),
    [chosenDecorators],
  );

  const handleWhatListChange = React.useCallback(
    (_evt: React.MouseEvent<HTMLElement>, newAvailable: string[], newChosen: string[]) => {
      setChosenWhat(newChosen);
    },
    [],
  );

  const handleDecoratorListChange = React.useCallback(
    (_evt: React.MouseEvent<HTMLElement>, newAvailable: string[], newChosen: string[]) => {
      setChosenDecorators(newChosen);
    },
    [],
  );

  const addCustomWhat = React.useCallback(() => {
    const v = customWhatInput.trim();
    if (v && !chosenWhat.includes(v)) {
      setChosenWhat((prev) => [...prev, v]);
    }
    setCustomWhatInput('');
  }, [customWhatInput, chosenWhat]);

  const addCustomDecorator = React.useCallback(() => {
    const v = customDecoratorInput.trim();
    if (v && !chosenDecorators.includes(v)) {
      setChosenDecorators((prev) => [...prev, v]);
    }
    setCustomDecoratorInput('');
  }, [customDecoratorInput, chosenDecorators]);

  const handleWhatKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomWhat();
      }
    },
    [addCustomWhat],
  );

  const handleDecoratorKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomDecorator();
      }
    },
    [addCustomDecorator],
  );

  const handleSubmit = React.useCallback(() => {
    if (!target) {
      return;
    }
    setIsSubmitting(true);
    let req$;
    if (!enabled) {
      req$ = context.api.disableGcLogging(target);
    } else if (mode === 'enable') {
      req$ = context.api.enableGcLogging(target, chosenWhat.join('+'), chosenDecorators.join(','));
    } else {
      req$ = context.api.reconfigureGcLogging(target, chosenWhat.join('+'), chosenDecorators.join(','));
    }
    addSubscription(
      req$.pipe(first()).subscribe({
        next: () => {
          setIsSubmitting(false);
          onClose();
        },
        error: () => setIsSubmitting(false),
      }),
    );
  }, [addSubscription, context.api, enabled, mode, target, chosenWhat, chosenDecorators, onClose]);

  const title = mode === 'enable' ? t('GcLoggingModal.ENABLE_TITLE') : t('GcLoggingModal.RECONFIGURE_TITLE');
  const submitLabel = mode === 'enable' ? t('GcLoggingModal.ENABLE_SUBMIT') : t('GcLoggingModal.RECONFIGURE_SUBMIT');

  return (
    <Modal appendTo={portalRoot} isOpen={isOpen} onClose={onClose} title={title} variant={ModalVariant.medium}>
      <Form>
        {mode === 'reconfigure' && (
          <FormGroup fieldId="gc-logging-enabled" label={t('GcLoggingModal.ENABLED_LABEL')}>
            <Switch
              id="gc-logging-enabled"
              isChecked={enabled}
              onChange={(_evt: React.FormEvent<HTMLInputElement>, checked: boolean) => setEnabled(checked)}
              label={enabled ? t('GcLoggingModal.ENABLED_ON') : t('GcLoggingModal.ENABLED_OFF')}
            />
          </FormGroup>
        )}
        <FormGroup fieldId="gc-logging-what" label={t('GcLoggingModal.WHAT_LABEL')}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TextInput
              id="gc-logging-what-custom"
              aria-label={t('GcLoggingModal.WHAT_CUSTOM_ARIA')}
              placeholder={t('GcLoggingModal.WHAT_CUSTOM_PLACEHOLDER')}
              value={customWhatInput}
              onChange={(_evt, v) => setCustomWhatInput(v)}
              onKeyDown={handleWhatKeyDown}
            />
            <Button variant="secondary" onClick={addCustomWhat} isDisabled={!customWhatInput.trim()}>
              {t('GcLoggingModal.ADD_CUSTOM')}
            </Button>
          </div>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{t('GcLoggingModal.CUSTOM_HELPER_TEXT')}</HelperTextItem>
            </HelperText>
          </FormHelperText>
          <DualListSelector
            availableOptions={availableWhat}
            chosenOptions={chosenWhat}
            onListChange={handleWhatListChange as any}
            id="gc-logging-what-selector"
          />
        </FormGroup>
        <FormGroup fieldId="gc-logging-decorators" label={t('GcLoggingModal.DECORATORS_LABEL')}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TextInput
              id="gc-logging-decorators-custom"
              aria-label={t('GcLoggingModal.DECORATORS_CUSTOM_ARIA')}
              placeholder={t('GcLoggingModal.DECORATORS_CUSTOM_PLACEHOLDER')}
              value={customDecoratorInput}
              onChange={(_evt, v) => setCustomDecoratorInput(v)}
              onKeyDown={handleDecoratorKeyDown}
            />
            <Button variant="secondary" onClick={addCustomDecorator} isDisabled={!customDecoratorInput.trim()}>
              {t('GcLoggingModal.ADD_CUSTOM')}
            </Button>
          </div>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{t('GcLoggingModal.CUSTOM_HELPER_TEXT')}</HelperTextItem>
            </HelperText>
          </FormHelperText>
          <DualListSelector
            availableOptions={availableDecorators}
            chosenOptions={chosenDecorators}
            onListChange={handleDecoratorListChange as any}
            id="gc-logging-decorators-selector"
          />
        </FormGroup>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={isSubmitting || (enabled && chosenWhat.length === 0)}
          >
            {submitLabel}
          </Button>
          <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
            {t('CANCEL')}
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};

export default GcLoggingModal;
