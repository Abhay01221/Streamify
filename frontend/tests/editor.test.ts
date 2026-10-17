import { beforeEach, expect, test } from 'vitest';
import { useEditorStore } from '../src/store/editorStore';
beforeEach(() => useEditorStore.setState({ code: {} }));
test('drafts persist independently for each problem', () => {
  useEditorStore.getState().setCode('first', 'python', 'print(1)');
  useEditorStore.getState().setCode('second', 'python', 'print(2)');
  expect(useEditorStore.getState().getCode('first', 'python')).toBe('print(1)');
  expect(useEditorStore.getState().getCode('second', 'python')).toBe('print(2)');
});
test('an intentionally empty draft does not resurrect starter code', () => {
  useEditorStore.getState().setCode('first', 'python', '');
  expect(useEditorStore.getState().getCode('first', 'python')).toBe('');
  useEditorStore.getState().resetCode('first', 'python');
  expect(useEditorStore.getState().getCode('first', 'python')).toBeNull();
});
