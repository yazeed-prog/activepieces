import { isNil } from '@activepieces/core-utils';

const STORAGE_KEY = 'ap-chat-split-last-section';

const SUPPORTED_SECTIONS = [
  'automations',
  'runs',
  'connections',
  'variables',
  'releases',
] as const;

const PROJECT_SECTION_REGEX = /^\/projects\/[^/]+\/([^/]+)/;

function isSupportedSection(segment: string): segment is ChatSplitSection {
  return (SUPPORTED_SECTIONS as readonly string[]).includes(segment);
}

function recordVisit({ pathname }: { pathname: string }): void {
  const segment = PROJECT_SECTION_REGEX.exec(pathname)?.[1];
  if (segment && isSupportedSection(segment)) {
    sessionStorage.setItem(STORAGE_KEY, segment);
  }
}

function getLastSection(): ChatSplitSection {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored && isSupportedSection(stored) ? stored : 'automations';
}

function hasLastSection(): boolean {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return !isNil(stored) && isSupportedSection(stored);
}

export const chatSplitPage = { recordVisit, getLastSection, hasLastSection };

export type ChatSplitSection = (typeof SUPPORTED_SECTIONS)[number];
