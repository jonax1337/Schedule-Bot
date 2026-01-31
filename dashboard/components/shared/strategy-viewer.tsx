'use client';

import { type JSONContent } from '@tiptap/react';
import { StrategyEditor } from './strategy-editor';

interface StrategyViewerProps {
  content: JSONContent;
}

export function StrategyViewer({ content }: StrategyViewerProps) {
  return <StrategyEditor content={content} onChange={() => {}} editable={false} />;
}
