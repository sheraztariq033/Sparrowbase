import { describe, it, expect } from 'vitest';
import { useSparrowClient, useSession, useFileUpload, useAIChat, useRealtimeChannel } from './index';

describe('@sparrowbase/react Suite', () => {
  it('should export all primary UI hooks', () => {
    expect(useSparrowClient).toBeDefined();
    expect(useSession).toBeDefined();
    expect(useFileUpload).toBeDefined();
    expect(useAIChat).toBeDefined();
    expect(useRealtimeChannel).toBeDefined();
  });
});
