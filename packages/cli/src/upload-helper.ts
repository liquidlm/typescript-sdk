import { uploadFile, type RequestOptions } from "@liquidlm/sdk";
import { apiClient } from "./client.js";

export async function uploadOne(
  dirId: string,
  fileName: string,
  body: Buffer,
  contentType?: string,
): Promise<{ s3Key: string; knowledgeId: string }> {
  const result = await uploadFile(
    {
      fetch: globalThis.fetch,
      async post<T>(
        path: string,
        data?: unknown,
        options?: RequestOptions,
      ): Promise<T> {
        const response = await apiClient.post<T>(path, data, options);
        if (!response.ok || response.data === undefined)
          throw new Error(`Upload API request failed (${response.status})`);
        return response.data;
      },
    },
    dirId,
    fileName,
    body,
    { contentType },
  );
  return { s3Key: result.s3Key, knowledgeId: result.knowledgeId };
}
