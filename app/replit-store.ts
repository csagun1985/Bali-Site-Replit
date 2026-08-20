export type ReplitMessage = {
  id: string;
  groupId: string;
  authorName: string;
  body: string;
  deleteToken: string;
  createdAt: string;
};

export type ReplitMemory = {
  id: string;
  objectKey: string;
  caption: string;
  uploader: string;
  createdAt: string;
  contentType: string;
  bytes: Uint8Array;
};

type ReplitStore = {
  messages: ReplitMessage[];
  memories: ReplitMemory[];
  likes: Map<string, Set<string>>;
};

type ReplitGlobal = typeof globalThis & {
  __ACM_REPLIT_STORE__?: ReplitStore;
};

export function getReplitStore(): ReplitStore {
  const scope = globalThis as ReplitGlobal;
  if (!scope.__ACM_REPLIT_STORE__) {
    scope.__ACM_REPLIT_STORE__ = {
      messages: [],
      memories: [],
      likes: new Map(),
    };
  }
  return scope.__ACM_REPLIT_STORE__;
}
