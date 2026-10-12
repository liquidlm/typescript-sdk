// Generated from contract/openapi.json (39c9bd00960c130f9c36874d67c8ff81a3d0492fd676c3691136e8c28d8cbb5e); do not edit.
export interface Schemas {
  "ExpandedScopes": { "api": Array<string>; "mcp": Array<string>; [key: string]: unknown; };
  "AccountSelf": { "id": string; "email": string | null; "bearerClass": "session" | "pat"; "activeOrgId": string | null; "scopeBundle": string | null; "expandedScopes": Schemas["ExpandedScopes"]; [key: string]: unknown; };
  "ErrorResponse": { "error": string; "message"?: string; "code"?: string; [key: string]: unknown; };
  "ChatSession": { "id": string; "title": string | null; "created_at": string; "updated_at": string; "scope_vault_ids": Array<string> | null; [key: string]: unknown; };
  "CreateChatSessionBody": { "title"?: string; [key: string]: unknown; };
  "ChatCompletionBody": { "message": string; "vault_ids"?: Array<string> | null; "has_attachments"?: boolean; "attachment_knowledge_ids"?: Array<string>; [key: string]: unknown; };
  "ChatMessage": { "id": string; "session_id": string; "role": "user" | "assistant" | "system" | "tool"; "content": string | null; "tool_calls"?: unknown; "created_at": string; "feedback_rating"?: number | null; [key: string]: unknown; };
  "CustomEntityAlias": { "id": string; "vault_id": string | null; "org_id": string; "name": string; "aliases": Array<string>; "entity_type": string; "canonical_id": string; "created_at": string; [key: string]: unknown; };
  "CreateEntityAliasBody": { "vault_id"?: string | null; "name"?: string; "aliases"?: Array<string>; "entity_type"?: string; "canonical_id"?: string; [key: string]: unknown; };
  "CustomEntityType": { "id": string; "vault_id": string | null; "org_id": string; "name": string; "description": string | null; "created_at": string; [key: string]: unknown; };
  "CreateEntityTypeBody": { "vault_id"?: string | null; "name"?: string; "description"?: string | null; [key: string]: unknown; };
  "GraphNode": { "id": string; "type": "file" | "link" | "note" | "image" | "tag" | "entity"; "label": string; "subtype"?: string; "validity"?: "pending" | "valid" | "temporal" | "expired"; "temporal_kind"?: string | null; "vault_id"?: string; "superseded_by"?: string | null; "metadata"?: { [key: string]: unknown; }; [key: string]: unknown; };
  "GraphEdge": { "source": string; "target": string; "label": string; [key: string]: unknown; };
  "GraphResult": { "nodes": Array<Schemas["GraphNode"]>; "edges": Array<Schemas["GraphEdge"]>; "truncated"?: boolean; [key: string]: unknown; };
  "DiarizationStatus": ({ "version": 1; "status": "disabled"; [key: string]: unknown; } | { "version": 1; "status": "failed"; "error_code": "initialization_failed" | "inference_failed" | "timeout" | "child_failed"; [key: string]: unknown; } | { "version": 1; "status": "completed"; "speaker_count": number; "model": string; "revision": string; [key: string]: unknown; });
  "TranscriptChunks": { "count": number; "extracted_text": string; "diarization"?: Schemas["DiarizationStatus"]; "segments": Array<{ "chunk_index": number; "text": string; "media_start_sec": number | null; "media_end_sec": number | null; "speakers"?: Array<string>; [key: string]: unknown; }>; [key: string]: unknown; };
  "KnowledgeRecord": { "id": string; "user_id": string; "org_id": string; "vault_id": string; "type": "file" | "image" | "link" | "note"; "title": string | null; "summary": string | null; "tags": Array<string>; "parent_knowledge_id": string | null; "indexing_status": string; "indexing_error": string | null; "indexing_attempts": number; "source_url": string | null; "body": string | null; "metadata": { [key: string]: unknown; }; "chunks"?: Schemas["TranscriptChunks"]; "created_at": string; "updated_at": string; "indexed_at": string | null; "temporal_kind"?: string | null; "content_date"?: string | null; "valid_from"?: string | null; "valid_until"?: string | null; [key: string]: unknown; };
  "ListItemsResult": { "items": Array<Schemas["KnowledgeRecord"]>; "total": number; "hasMore": boolean; [key: string]: unknown; };
  "CreateItemBody": { "id"?: string; "type"?: string; "vault_id"?: string; "title"?: string; "url"?: string; "content"?: string; "tags"?: Array<string>; "metadata"?: { [key: string]: unknown; }; "s3_key"?: string; "content_date"?: string | null; [key: string]: unknown; };
  "UpdateItemBody": { "title"?: string; "body"?: string; "content"?: string; "source_url"?: string | null; "tags"?: Array<string>; "metadata"?: { [key: string]: unknown; }; "temporal_kind"?: string | null; "temporal_decay_half_life_days"?: number | null; "content_date"?: string | null; "valid_from"?: string | null; "valid_until"?: string | null; [key: string]: unknown; };
  "VideoFramesResult": { "parent_knowledge_id": string; "video_title": string | null; "frames": Array<{ "knowledge_id": string; "parent_knowledge_id": string; "frame_number": number; "timestamp_sec": number; "title": string | null; "summary": string | null; "indexing_status": string; "thumbnail_url"?: string; [key: string]: unknown; }>; "next_cursor": string | null; [key: string]: unknown; };
  "DocumentPage": { "knowledge_id": string; "parent_knowledge_id": string; "document_title": string; "pdf_page_number": number; "page_label": string | null; "summary": string | null; "indexing_status": string; "transcription_status": string; "thumbnail_url"?: string; [key: string]: unknown; };
  "DocumentPagesResult": { "parent_knowledge_id": string; "document_title": string; "generation": string; "numbering": "pdf"; "text_indexing_status": string; "totals": { "expected": number | null; "available": number; "ready": number; "failed": number; "indexing": number; "pending": number; [key: string]: unknown; }; "pages": Array<Schemas["DocumentPage"]>; "next_cursor": string | null; [key: string]: unknown; };
  "ReextractKnowledgeBody": { "engine": "vision-ocr"; [key: string]: unknown; };
  "KnowledgeLink": { "id"?: string; "src_knowledge_id": string; "dst_knowledge_id": string; "link_type": string; "metadata"?: { [key: string]: unknown; } | null; "created_at"?: string; [key: string]: unknown; };
  "RelateKnowledgeBody": { "target_id": string; "target_type": "file" | "item"; "label"?: string; [key: string]: unknown; };
  "RelatedFileReference": { "id": string; "s3_key": string | null; "relative_key"?: string | null; "file_name": string; "mime_type": string; "vault_id": string; [key: string]: unknown; };
  "RelatedEntity": { "link": Schemas["KnowledgeLink"]; "direction": "incoming" | "outgoing"; "item"?: Schemas["KnowledgeRecord"]; "file"?: Schemas["RelatedFileReference"]; [key: string]: unknown; };
  "SupersedesKnowledgeBody": { "predecessor_id": string; [key: string]: unknown; };
  "DayItem": (Schemas["KnowledgeRecord"] & { "matched_content_date": boolean; "matched_created_at": boolean; [key: string]: unknown; });
  "DayItemsResult": { "items": Array<Schemas["DayItem"]>; "truncated": boolean; [key: string]: unknown; };
  "DayDigestResult": { "summary": string | null; "item_count": number; "note_count": number; "connector_run_count": number; "pending": boolean; "reason"?: "generating" | "unavailable"; [key: string]: unknown; };
  "DayMarkersResult": { "rows": Array<{ "content_date": string | null; "created_at": string; "type": string; "updated_at": string; [key: string]: unknown; }>; [key: string]: unknown; };
  "EntitiesResult": { "entities": Array<{ "name": string; "entity_type": string; "canonical_id": string | null; "mention_count": number; "knowledge_count": number; "sample_knowledge_ids": Array<string>; [key: string]: unknown; }>; [key: string]: unknown; };
  "ForgetEntityBody": { "name": string; "entity_type"?: string; "canonical_id"?: string | null; [key: string]: unknown; };
  "EntityKnowledgeResult": { "items": Array<{ "knowledge_id": string; "title": string | null; "type": string; "vault_id": string; "created_at": string; "mention_count": number; [key: string]: unknown; }>; [key: string]: unknown; };
  "EntityRelationsResult": { "relations": Array<{ "direction": "outgoing" | "incoming"; "predicate": string; "name": string; "entity_type": string; "canonical_id": string | null; "count": number; [key: string]: unknown; }>; [key: string]: unknown; };
  "LastModifiedBy": { "actorType": "user" | "agent" | "connector"; "userId": string | null; "userDisplayName": string | null; "tokenId": string | null; "tokenName": string | null; [key: string]: unknown; } | null;
  "IndexedFilesResult": { "items": Array<{ "id": string; "s3_key": string; "relative_key": string; "file_name": string; "mime_type": string; "size_bytes": number | null; "tags": Array<string>; "summary"?: string | null; "indexing_status": "pending" | "indexing" | "ready" | "failed"; "indexed_at": string | null; "lastModifiedAt": string | null; "lastModifiedBy": Schemas["LastModifiedBy"]; [key: string]: unknown; }>; "next_cursor": string | null; [key: string]: unknown; };
  "SearchFileRecord": { "id": string; "s3_key": string; "file_name"?: string; "mime_type"?: string; "size_bytes"?: number | null; "vault_id"?: string; "knowledge_id"?: string; "title"?: string | null; "summary"?: string | null; "indexing_status"?: string; [key: string]: unknown; };
  "SearchResult": { "knowledge_id": string; "chunk_id": string; "type": "file" | "image" | "link" | "note"; "title": string | null; "vault_id": string; "chunk": { "content": string; "chunk_index": number; "metadata"?: { [key: string]: unknown; } | null; [key: string]: unknown; }; "score": number; "file_path"?: string | null; "source_url"?: string | null; "mime_type"?: string | null; "updated_at"?: string | null; "document_match_score"?: number | null; "temporal_kind"?: string | null; "temporal_decay_half_life_days"?: number | null; "content_date"?: string | null; "valid_from"?: string | null; "valid_until"?: string | null; "validity_state"?: string | null; [key: string]: unknown; };
  "SearchFilters": { "tags"?: Array<string>; "mime_type"?: Array<string>; "types"?: Array<"file" | "image" | "link" | "note">; "date_range"?: { "from"?: string; "to"?: string; [key: string]: unknown; }; "vault_ids"?: Array<string>; "vault_id"?: string; "parent_knowledge_id"?: string; "folder_id"?: string; "indexing_status"?: string; "entities"?: { "canonical_ids"?: Array<string>; "names"?: Array<string>; [key: string]: unknown; }; [key: string]: unknown; };
  "SearchBody": { "query": string; "limit"?: number; "filters"?: Schemas["SearchFilters"]; "rerank"?: boolean; "include_expired"?: boolean; "include_pending"?: boolean; [key: string]: unknown; };
  "SearchKnowledgeResult": { "results": Array<Schemas["SearchResult"]>; "advice"?: string; "empty_reason"?: "no_visible_vaults" | "no_indexed_knowledge" | "no_matches"; [key: string]: unknown; };
  "IndexingStatusResult": { "pending": number; "failed": number; "indexed": number; [key: string]: unknown; };
  "Vault": { "id": string; "user_id": string; "org_id": string; "is_default": boolean; "label": string; "s3_prefix": string; "created_at": string; "file_count"?: number; "knowledge_count"?: number; "your_role"?: "owner" | "writer" | "reader"; "last_activity_at"?: string | null; "chat_system_prompt"?: string | null; "chunk_size"?: number | null; "index_pdf_pages"?: boolean | null; "link_extraction_enabled"?: boolean | null; "persist_linked_images"?: boolean | null; "persist_linked_audio"?: boolean | null; "persist_linked_video"?: boolean | null; "link_domain_policy"?: { "mode": "all_public" | "allowlist"; "allowDomains": Array<string>; "denyDomains": Array<string>; "includeSubdomains": boolean; [key: string]: unknown; } | null; "fpm"?: number | null; "temporal_weight"?: number | null; [key: string]: unknown; };
  "CreateVaultBody": { "label"?: string; [key: string]: unknown; };
  "UpdateVaultBody": { "label"?: string; "chat_system_prompt"?: string | null; "chunkSize"?: number | null; "indexPdfPages"?: boolean | null; "linkExtractionEnabled"?: boolean | null; "persistLinkedImages"?: boolean | null; "persistLinkedAudio"?: boolean | null; "persistLinkedVideo"?: boolean | null; "linkDomainPolicy"?: { "mode": "all_public" | "allowlist"; "allowDomains": Array<string>; "denyDomains": Array<string>; "includeSubdomains": boolean; [key: string]: unknown; } | null; "fpm"?: number | null; "temporalWeight"?: number | null; [key: string]: unknown; };
  "FileMetaResult": { "file": { [key: string]: unknown; }; "lastModifiedBy"?: unknown; "lastModifiedAt": string | null; "chunks": Schemas["TranscriptChunks"]; "extracted_images": Array<{ "title": string; "url": string; "tags": Array<string>; "summary": string | null; "page": number | null; [key: string]: unknown; }>; [key: string]: unknown; };
  "FileUrlResult": { "url": string; "expiresAt": string; [key: string]: unknown; };
  "FileVersion": { "versionId": string; "lastModified": string; "size": number; "isLatest": boolean; "actorUserId": string | null; "sourceRelativeKey": string | null; "movedAt": string | null; [key: string]: unknown; };
  "ForgetResult": { "ok": true; "forgotten_at": string; "forgotten_batch_id": string; "restorable_until": string; [key: string]: unknown; };
  "MoveFilesBody": { "keys"?: Array<string>; "to"?: string; [key: string]: unknown; };
  "MoveFilesToVaultBody": { "keys"?: Array<string>; "to_vault_id"?: string; [key: string]: unknown; };
  "RestoreFileBody": { "key"?: string; "versionId"?: string; "sourceKey"?: string; [key: string]: unknown; };
  "FolderBody": { "path"?: string; [key: string]: unknown; };
  "MoveFolderBody": { "from"?: string; "to"?: string; [key: string]: unknown; };
  "ForgetKnowledgeBody": { "reason"?: string; [key: string]: unknown; };
  "PinResult": { "ok": true; "knowledge_id": string; "pinned_at": string | null; [key: string]: unknown; };
  "RestoreResult": { "ok": true; "restored": number; [key: string]: unknown; };
  "ForgetBulkBody": { "knowledge_ids"?: Array<string>; "reason"?: string; [key: string]: unknown; };
  "VaultMember": { "user_id": string; "email": string | null; "role": "reader" | "writer"; [key: string]: unknown; };
  "AddVaultMemberBody": { "user_id"?: string; "role"?: string; [key: string]: unknown; };
  "ReindexVaultBody": { "file"?: string; "failed"?: boolean; [key: string]: unknown; };
  "ShareVaultBody": { "email"?: string; "role"?: string; [key: string]: unknown; };
  "TrashItem": { "id": string; "type": string; "title": string | null; "summary": string | null; "forgotten_at": string; "forgotten_by": string | null; "forgotten_via": string | null; "forgotten_reason": string | null; "forgotten_batch_id": string | null; "vault_id": string; "org_id": string; "restorable_until": string; [key: string]: unknown; };
  "AbortUploadBody": { "fileName"?: string; "reason"?: string; "attemptId"?: string; [key: string]: unknown; };
  "FinalizeUploadBody": { "fileName"?: string; "fileSize"?: number; "hash"?: string; "s3VersionId"?: string | null; "attemptId"?: string; [key: string]: unknown; };
  "PresignUploadBody": { "fileName"?: string; "fileSize"?: number; "contentType"?: string; "contentSha256Hex"?: string; "protocol"?: "attempt-v1"; "attemptId"?: string; [key: string]: unknown; };
}
export interface Operations {
  "getAuthMe": { method: "GET"; path: "/auth/me"; body: never; response: Schemas["AccountSelf"]; parameters: {  } };
  "getChatSessions": { method: "GET"; path: "/chat/sessions"; body: never; response: Array<Schemas["ChatSession"]>; parameters: {  } };
  "postChatSessions": { method: "POST"; path: "/chat/sessions"; body: Schemas["CreateChatSessionBody"]; response: Schemas["ChatSession"]; parameters: {  } };
  "deleteChatSessionsById": { method: "DELETE"; path: "/chat/sessions/{id}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getChatSessionsById": { method: "GET"; path: "/chat/sessions/{id}"; body: never; response: Schemas["ChatSession"]; parameters: { "id": string; } };
  "postChatSessionsByIdCompletions": { method: "POST"; path: "/chat/sessions/{id}/completions"; body: Schemas["ChatCompletionBody"]; response: unknown; parameters: { "id": string; } };
  "getChatSessionsByIdMessages": { method: "GET"; path: "/chat/sessions/{id}/messages"; body: never; response: Array<Schemas["ChatMessage"]>; parameters: { "id": string; } };
  "getEntityaliases": { method: "GET"; path: "/entity-aliases"; body: never; response: { "aliases": Array<Schemas["CustomEntityAlias"]>; [key: string]: unknown; }; parameters: {  } };
  "postEntityaliases": { method: "POST"; path: "/entity-aliases"; body: Schemas["CreateEntityAliasBody"]; response: Schemas["CustomEntityAlias"]; parameters: {  } };
  "deleteEntityaliasesById": { method: "DELETE"; path: "/entity-aliases/{id}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getEntitytypes": { method: "GET"; path: "/entity-types"; body: never; response: { "types": Array<Schemas["CustomEntityType"]>; [key: string]: unknown; }; parameters: {  } };
  "postEntitytypes": { method: "POST"; path: "/entity-types"; body: Schemas["CreateEntityTypeBody"]; response: Schemas["CustomEntityType"]; parameters: {  } };
  "deleteEntitytypesById": { method: "DELETE"; path: "/entity-types/{id}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getGraph": { method: "GET"; path: "/graph"; body: never; response: Schemas["GraphResult"]; parameters: { "focus_knowledge_id"?: string; "vault_ids"?: string; } };
  "getKnowledge": { method: "GET"; path: "/knowledge"; body: never; response: Schemas["ListItemsResult"]; parameters: { "type"?: (string | Array<string>); "tags"?: (string | Array<string>); "indexed"?: "true" | "false"; "vault_ids"?: string; "vault_id"?: string; "include_auto"?: "true" | "false"; "search"?: string; "order"?: "newest" | "oldest" | "type" | "modified"; "limit"?: number; "offset"?: number | null; "top_level"?: "true" | "false"; "pinned"?: "true" | "false"; } };
  "postKnowledge": { method: "POST"; path: "/knowledge"; body: Schemas["CreateItemBody"]; response: Schemas["KnowledgeRecord"]; parameters: {  } };
  "deleteKnowledgeById": { method: "DELETE"; path: "/knowledge/{id}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getKnowledgeById": { method: "GET"; path: "/knowledge/{id}"; body: never; response: Schemas["KnowledgeRecord"]; parameters: { "id": string; } };
  "patchKnowledgeById": { method: "PATCH"; path: "/knowledge/{id}"; body: Schemas["UpdateItemBody"]; response: Schemas["KnowledgeRecord"]; parameters: { "id": string; } };
  "getKnowledgeByIdFrames": { method: "GET"; path: "/knowledge/{id}/frames"; body: never; response: Schemas["VideoFramesResult"]; parameters: { "id": string; "cursor"?: string; "limit"?: number; } };
  "getKnowledgeByIdPages": { method: "GET"; path: "/knowledge/{id}/pages"; body: never; response: Schemas["DocumentPagesResult"]; parameters: { "id": string; "cursor"?: string; "limit"?: number; "page"?: number; "pages"?: string; "from"?: number; "to"?: number; "generation"?: string; "include_thumbnails"?: "true" | "false"; } };
  "postKnowledgeByIdReextract": { method: "POST"; path: "/knowledge/{id}/reextract"; body: Schemas["ReextractKnowledgeBody"]; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "postKnowledgeByIdReindex": { method: "POST"; path: "/knowledge/{id}/reindex"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "postKnowledgeByIdRelate": { method: "POST"; path: "/knowledge/{id}/relate"; body: Schemas["RelateKnowledgeBody"]; response: Schemas["KnowledgeLink"]; parameters: { "id": string; } };
  "deleteKnowledgeByIdRelateByRelatedId": { method: "DELETE"; path: "/knowledge/{id}/relate/{relatedId}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; "relatedId": string; } };
  "getKnowledgeByIdRelated": { method: "GET"; path: "/knowledge/{id}/related"; body: never; response: Array<Schemas["RelatedEntity"]>; parameters: { "id": string; } };
  "postKnowledgeByIdSupersedes": { method: "POST"; path: "/knowledge/{id}/supersedes"; body: Schemas["SupersedesKnowledgeBody"]; response: Schemas["KnowledgeLink"]; parameters: { "id": string; } };
  "deleteKnowledgeByIdSupersedesByPredecessorId": { method: "DELETE"; path: "/knowledge/{id}/supersedes/{predecessorId}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; "predecessorId": string; } };
  "getKnowledgeCalendarDay": { method: "GET"; path: "/knowledge/calendar/day"; body: never; response: Schemas["DayItemsResult"]; parameters: { "vault_ids"?: string; "vault_id"?: string; "content_from": string; "content_to": string; "created_from": string; "created_to": string; "type"?: (string | Array<string>); "include_auto"?: "true" | "false"; "search"?: string; "top_level"?: "true" | "false"; "limit"?: number; } };
  "getKnowledgeCalendarDaydigest": { method: "GET"; path: "/knowledge/calendar/day-digest"; body: never; response: Schemas["DayDigestResult"]; parameters: { "vault_ids"?: string; "vault_id"?: string; "day": string; } };
  "getKnowledgeCalendarDaymarkers": { method: "GET"; path: "/knowledge/calendar/day-markers"; body: never; response: Schemas["DayMarkersResult"]; parameters: { "vault_ids"?: string; "vault_id"?: string; "content_from": string; "content_to": string; "created_from": string; "created_to": string; } };
  "getSearchEntities": { method: "GET"; path: "/search/entities"; body: never; response: Schemas["EntitiesResult"]; parameters: { "limit"?: number | null; "vault_ids"?: string; "vault_id"?: string; "type"?: string; "canonical_id"?: string; "q"?: string; } };
  "postSearchEntitiesForget": { method: "POST"; path: "/search/entities/forget"; body: Schemas["ForgetEntityBody"]; response: { "forgotten": number; [key: string]: unknown; }; parameters: {  } };
  "getSearchEntitiesKnowledge": { method: "GET"; path: "/search/entities/knowledge"; body: never; response: Schemas["EntityKnowledgeResult"]; parameters: { "name": string; "limit"?: number | null; "vault_ids"?: string; "vault_id"?: string; "type"?: string; "canonical_id"?: string; } };
  "getSearchEntitiesRelations": { method: "GET"; path: "/search/entities/relations"; body: never; response: Schemas["EntityRelationsResult"]; parameters: { "name": string; "limit"?: number | null; "vault_ids"?: string; "vault_id"?: string; "type"?: string; "canonical_id"?: string; } };
  "getSearchFiles": { method: "GET"; path: "/search/files"; body: never; response: Schemas["IndexedFilesResult"]; parameters: { "limit"?: number; "cursor"?: string; "tags"?: string; "mime_type"?: string; "vault_ids"?: string; "vault_id"?: string; "dir_id"?: string; "fields"?: "minimal"; "entity_canonical_ids"?: string; "entity_names"?: string; } };
  "getSearchFilesByS3Key": { method: "GET"; path: "/search/files/{s3Key}"; body: never; response: Schemas["SearchFileRecord"]; parameters: { "s3Key": string; } };
  "querySearchFulltext": { method: "QUERY"; path: "/search/fulltext"; body: Schemas["SearchBody"]; response: Array<Schemas["SearchResult"]>; parameters: {  } };
  "querySearchHybrid": { method: "QUERY"; path: "/search/hybrid"; body: Schemas["SearchBody"]; response: Schemas["SearchKnowledgeResult"]; parameters: {  } };
  "getSearchKnowledge": { method: "GET"; path: "/search/knowledge"; body: never; response: Schemas["IndexedFilesResult"]; parameters: { "limit"?: number; "cursor"?: string; "tags"?: string; "mime_type"?: string; "vault_ids"?: string; "vault_id"?: string; "dir_id"?: string; "fields"?: "minimal"; "entity_canonical_ids"?: string; "entity_names"?: string; } };
  "querySearchSemantic": { method: "QUERY"; path: "/search/semantic"; body: Schemas["SearchBody"]; response: Array<Schemas["SearchResult"]>; parameters: {  } };
  "getSearchStatus": { method: "GET"; path: "/search/status"; body: never; response: Schemas["IndexingStatusResult"]; parameters: {  } };
  "getVaults": { method: "GET"; path: "/vaults"; body: never; response: Array<Schemas["Vault"]>; parameters: {  } };
  "postVaults": { method: "POST"; path: "/vaults"; body: Schemas["CreateVaultBody"]; response: Schemas["Vault"]; parameters: {  } };
  "deleteVaultsById": { method: "DELETE"; path: "/vaults/{id}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getVaultsById": { method: "GET"; path: "/vaults/{id}"; body: never; response: Schemas["Vault"]; parameters: { "id": string; } };
  "patchVaultsById": { method: "PATCH"; path: "/vaults/{id}"; body: Schemas["UpdateVaultBody"]; response: Schemas["Vault"]; parameters: { "id": string; } };
  "getVaultsByIdFilemetaByKey": { method: "GET"; path: "/vaults/{id}/file-meta/{key}"; body: never; response: Schemas["FileMetaResult"]; parameters: { "id": string; "key": string; } };
  "getVaultsByIdFileurlByKey": { method: "GET"; path: "/vaults/{id}/file-url/{key}"; body: never; response: Schemas["FileUrlResult"]; parameters: { "id": string; "key": string; } };
  "getVaultsByIdFileversionurl": { method: "GET"; path: "/vaults/{id}/file-version-url"; body: never; response: Schemas["FileUrlResult"]; parameters: { "id": string; "key"?: string; "versionId"?: string; "sourceKey"?: string; } };
  "getVaultsByIdFileversions": { method: "GET"; path: "/vaults/{id}/file-versions"; body: never; response: { "versions": Array<Schemas["FileVersion"]>; [key: string]: unknown; }; parameters: { "id": string; "key"?: string; } };
  "deleteVaultsByIdFilesByKey": { method: "DELETE"; path: "/vaults/{id}/files/{key}"; body: never; response: (Schemas["ForgetResult"] | { "ok": true; [key: string]: unknown; }); parameters: { "id": string; "key": string; "purge"?: string; } };
  "getVaultsByIdFilesByKey": { method: "GET"; path: "/vaults/{id}/files/{key}"; body: never; response: unknown; parameters: { "id": string; "key": string; } };
  "putVaultsByIdFilesByKey": { method: "PUT"; path: "/vaults/{id}/files/{key}"; body: never; response: { "ok": true; "knowledgeId": string; [key: string]: unknown; }; parameters: { "id": string; "key": string; } };
  "postVaultsByIdFilesMove": { method: "POST"; path: "/vaults/{id}/files/move"; body: Schemas["MoveFilesBody"]; response: { "ok": true; "moved": number; "moved_keys"?: Array<string>; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdFilesMovetovault": { method: "POST"; path: "/vaults/{id}/files/move-to-vault"; body: Schemas["MoveFilesToVaultBody"]; response: { "ok": true; "moved": number; "moved_keys"?: Array<string>; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdFilesRestore": { method: "POST"; path: "/vaults/{id}/files/restore"; body: Schemas["RestoreFileBody"]; response: { "ok": true; "knowledgeId": string; "newVersionId"?: string | null; [key: string]: unknown; }; parameters: { "id": string; } };
  "deleteVaultsByIdFolders": { method: "DELETE"; path: "/vaults/{id}/folders"; body: Schemas["FolderBody"]; response: { "ok": true; "deletedFiles": number; "deletedBytes": number; "batchId": string; [key: string]: unknown; }; parameters: { "id": string; } };
  "getVaultsByIdFolders": { method: "GET"; path: "/vaults/{id}/folders"; body: never; response: { "paths": Array<string>; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdFolders": { method: "POST"; path: "/vaults/{id}/folders"; body: Schemas["FolderBody"]; response: { "ok": true; "path": string; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdFoldersMove": { method: "POST"; path: "/vaults/{id}/folders/move"; body: Schemas["MoveFolderBody"]; response: { "ok": true; "movedFiles": number; [key: string]: unknown; }; parameters: { "id": string; } };
  "getVaultsByIdInvitations": { method: "GET"; path: "/vaults/{id}/invitations"; body: never; response: { "invitations": Array<{ "id": string; "email": string; "role": string; "expires_at": string; "expired": boolean; [key: string]: unknown; }>; [key: string]: unknown; }; parameters: { "id": string; } };
  "deleteVaultsByIdKnowledgeByKid": { method: "DELETE"; path: "/vaults/{id}/knowledge/{kid}"; body: never; response: (Schemas["ForgetResult"] | { "ok": true; [key: string]: unknown; }); parameters: { "id": string; "kid": string; "purge"?: string; } };
  "postVaultsByIdKnowledgeByKidForget": { method: "POST"; path: "/vaults/{id}/knowledge/{kid}/forget"; body: Schemas["ForgetKnowledgeBody"]; response: Schemas["ForgetResult"]; parameters: { "id": string; "kid": string; } };
  "postVaultsByIdKnowledgeByKidPin": { method: "POST"; path: "/vaults/{id}/knowledge/{kid}/pin"; body: never; response: Schemas["PinResult"]; parameters: { "id": string; "kid": string; } };
  "postVaultsByIdKnowledgeByKidRestore": { method: "POST"; path: "/vaults/{id}/knowledge/{kid}/restore"; body: { "replace"?: Array<{ "id": string; "updated_at": string; [key: string]: unknown; }>; [key: string]: unknown; }; response: Schemas["RestoreResult"]; parameters: { "id": string; "kid": string; } };
  "postVaultsByIdKnowledgeByKidUnpin": { method: "POST"; path: "/vaults/{id}/knowledge/{kid}/unpin"; body: never; response: Schemas["PinResult"]; parameters: { "id": string; "kid": string; } };
  "postVaultsByIdKnowledgeForgetbulk": { method: "POST"; path: "/vaults/{id}/knowledge/forget-bulk"; body: Schemas["ForgetBulkBody"]; response: { "ok": true; "forgotten_batch_id": string; "forgotten_count": number; "results": Array<Schemas["ForgetResult"]>; [key: string]: unknown; }; parameters: { "id": string; } };
  "getVaultsByIdLogByFile": { method: "GET"; path: "/vaults/{id}/log/{file}"; body: never; response: Array<{ [key: string]: unknown; }>; parameters: { "id": string; "file": string; } };
  "getVaultsByIdMembers": { method: "GET"; path: "/vaults/{id}/members"; body: never; response: Array<Schemas["VaultMember"]>; parameters: { "id": string; } };
  "postVaultsByIdMembers": { method: "POST"; path: "/vaults/{id}/members"; body: Schemas["AddVaultMemberBody"]; response: Schemas["VaultMember"]; parameters: { "id": string; } };
  "deleteVaultsByIdMembersByMemberUserId": { method: "DELETE"; path: "/vaults/{id}/members/{memberUserId}"; body: never; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; "memberUserId": string; } };
  "patchVaultsByIdMembersByMemberUserId": { method: "PATCH"; path: "/vaults/{id}/members/{memberUserId}"; body: { "role": "reader" | "writer"; [key: string]: unknown; }; response: { "user_id": string; "role": string; "email": string | null; [key: string]: unknown; }; parameters: { "id": string; "memberUserId": string; } };
  "postVaultsByIdReindex": { method: "POST"; path: "/vaults/{id}/reindex"; body: Schemas["ReindexVaultBody"]; response: ({ "ok": true; [key: string]: unknown; } | { "moved": number; [key: string]: unknown; }); parameters: { "id": string; } };
  "postVaultsByIdShare": { method: "POST"; path: "/vaults/{id}/share"; body: Schemas["ShareVaultBody"]; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "getVaultsByIdTrash": { method: "GET"; path: "/vaults/{id}/trash"; body: never; response: { "items": Array<Schemas["TrashItem"]>; "next_cursor": string | null; [key: string]: unknown; }; parameters: { "id": string; "cursor"?: string; "limit"?: number | null; } };
  "postVaultsByIdUploadAbort": { method: "POST"; path: "/vaults/{id}/upload/abort"; body: Schemas["AbortUploadBody"]; response: { "ok": true; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdUploadFinalize": { method: "POST"; path: "/vaults/{id}/upload/finalize"; body: Schemas["FinalizeUploadBody"]; response: { "ok": true; "key": string; "knowledgeId": string; "s3Key"?: string; "attemptId"?: string; "state"?: "committed"; "fileId": string; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdUploadPresign": { method: "POST"; path: "/vaults/{id}/upload/presign"; body: Schemas["PresignUploadBody"]; response: { "protocol"?: "attempt-v1"; "attemptId"?: string; "uploadUrl": string; "s3Key": string; "expiresAt": string; [key: string]: unknown; }; parameters: { "id": string; } };
  "postVaultsByIdUploadReconcile": { method: "POST"; path: "/vaults/{id}/upload/reconcile"; body: { "fileName": string; "attemptId": string; [key: string]: unknown; }; response: { "ok": true; "state": "pending" | "committed" | "aborted"; "attemptId": string; "knowledgeId"?: string; "s3Key"?: string; [key: string]: unknown; }; parameters: { "id": string; } };
}
export type Vault = Schemas["Vault"];

export const OPERATION_METADATA = {
  "getAuthMe": {
    "method": "GET",
    "path": "/auth/me"
  },
  "getChatSessions": {
    "method": "GET",
    "path": "/chat/sessions"
  },
  "postChatSessions": {
    "method": "POST",
    "path": "/chat/sessions"
  },
  "deleteChatSessionsById": {
    "method": "DELETE",
    "path": "/chat/sessions/{id}"
  },
  "getChatSessionsById": {
    "method": "GET",
    "path": "/chat/sessions/{id}"
  },
  "postChatSessionsByIdCompletions": {
    "method": "POST",
    "path": "/chat/sessions/{id}/completions"
  },
  "getChatSessionsByIdMessages": {
    "method": "GET",
    "path": "/chat/sessions/{id}/messages"
  },
  "getEntityaliases": {
    "method": "GET",
    "path": "/entity-aliases"
  },
  "postEntityaliases": {
    "method": "POST",
    "path": "/entity-aliases"
  },
  "deleteEntityaliasesById": {
    "method": "DELETE",
    "path": "/entity-aliases/{id}"
  },
  "getEntitytypes": {
    "method": "GET",
    "path": "/entity-types"
  },
  "postEntitytypes": {
    "method": "POST",
    "path": "/entity-types"
  },
  "deleteEntitytypesById": {
    "method": "DELETE",
    "path": "/entity-types/{id}"
  },
  "getGraph": {
    "method": "GET",
    "path": "/graph"
  },
  "getKnowledge": {
    "method": "GET",
    "path": "/knowledge"
  },
  "postKnowledge": {
    "method": "POST",
    "path": "/knowledge"
  },
  "deleteKnowledgeById": {
    "method": "DELETE",
    "path": "/knowledge/{id}"
  },
  "getKnowledgeById": {
    "method": "GET",
    "path": "/knowledge/{id}"
  },
  "patchKnowledgeById": {
    "method": "PATCH",
    "path": "/knowledge/{id}"
  },
  "getKnowledgeByIdFrames": {
    "method": "GET",
    "path": "/knowledge/{id}/frames"
  },
  "getKnowledgeByIdPages": {
    "method": "GET",
    "path": "/knowledge/{id}/pages"
  },
  "postKnowledgeByIdReextract": {
    "method": "POST",
    "path": "/knowledge/{id}/reextract"
  },
  "postKnowledgeByIdReindex": {
    "method": "POST",
    "path": "/knowledge/{id}/reindex"
  },
  "postKnowledgeByIdRelate": {
    "method": "POST",
    "path": "/knowledge/{id}/relate"
  },
  "deleteKnowledgeByIdRelateByRelatedId": {
    "method": "DELETE",
    "path": "/knowledge/{id}/relate/{relatedId}"
  },
  "getKnowledgeByIdRelated": {
    "method": "GET",
    "path": "/knowledge/{id}/related"
  },
  "postKnowledgeByIdSupersedes": {
    "method": "POST",
    "path": "/knowledge/{id}/supersedes"
  },
  "deleteKnowledgeByIdSupersedesByPredecessorId": {
    "method": "DELETE",
    "path": "/knowledge/{id}/supersedes/{predecessorId}"
  },
  "getKnowledgeCalendarDay": {
    "method": "GET",
    "path": "/knowledge/calendar/day"
  },
  "getKnowledgeCalendarDaydigest": {
    "method": "GET",
    "path": "/knowledge/calendar/day-digest"
  },
  "getKnowledgeCalendarDaymarkers": {
    "method": "GET",
    "path": "/knowledge/calendar/day-markers"
  },
  "getSearchEntities": {
    "method": "GET",
    "path": "/search/entities"
  },
  "postSearchEntitiesForget": {
    "method": "POST",
    "path": "/search/entities/forget"
  },
  "getSearchEntitiesKnowledge": {
    "method": "GET",
    "path": "/search/entities/knowledge"
  },
  "getSearchEntitiesRelations": {
    "method": "GET",
    "path": "/search/entities/relations"
  },
  "getSearchFiles": {
    "method": "GET",
    "path": "/search/files"
  },
  "getSearchFilesByS3Key": {
    "method": "GET",
    "path": "/search/files/{s3Key}"
  },
  "querySearchFulltext": {
    "method": "QUERY",
    "path": "/search/fulltext"
  },
  "querySearchHybrid": {
    "method": "QUERY",
    "path": "/search/hybrid"
  },
  "getSearchKnowledge": {
    "method": "GET",
    "path": "/search/knowledge"
  },
  "querySearchSemantic": {
    "method": "QUERY",
    "path": "/search/semantic"
  },
  "getSearchStatus": {
    "method": "GET",
    "path": "/search/status"
  },
  "getVaults": {
    "method": "GET",
    "path": "/vaults"
  },
  "postVaults": {
    "method": "POST",
    "path": "/vaults"
  },
  "deleteVaultsById": {
    "method": "DELETE",
    "path": "/vaults/{id}"
  },
  "getVaultsById": {
    "method": "GET",
    "path": "/vaults/{id}"
  },
  "patchVaultsById": {
    "method": "PATCH",
    "path": "/vaults/{id}"
  },
  "getVaultsByIdFilemetaByKey": {
    "method": "GET",
    "path": "/vaults/{id}/file-meta/{key}"
  },
  "getVaultsByIdFileurlByKey": {
    "method": "GET",
    "path": "/vaults/{id}/file-url/{key}"
  },
  "getVaultsByIdFileversionurl": {
    "method": "GET",
    "path": "/vaults/{id}/file-version-url"
  },
  "getVaultsByIdFileversions": {
    "method": "GET",
    "path": "/vaults/{id}/file-versions"
  },
  "deleteVaultsByIdFilesByKey": {
    "method": "DELETE",
    "path": "/vaults/{id}/files/{key}"
  },
  "getVaultsByIdFilesByKey": {
    "method": "GET",
    "path": "/vaults/{id}/files/{key}"
  },
  "putVaultsByIdFilesByKey": {
    "method": "PUT",
    "path": "/vaults/{id}/files/{key}"
  },
  "postVaultsByIdFilesMove": {
    "method": "POST",
    "path": "/vaults/{id}/files/move"
  },
  "postVaultsByIdFilesMovetovault": {
    "method": "POST",
    "path": "/vaults/{id}/files/move-to-vault"
  },
  "postVaultsByIdFilesRestore": {
    "method": "POST",
    "path": "/vaults/{id}/files/restore"
  },
  "deleteVaultsByIdFolders": {
    "method": "DELETE",
    "path": "/vaults/{id}/folders"
  },
  "getVaultsByIdFolders": {
    "method": "GET",
    "path": "/vaults/{id}/folders"
  },
  "postVaultsByIdFolders": {
    "method": "POST",
    "path": "/vaults/{id}/folders"
  },
  "postVaultsByIdFoldersMove": {
    "method": "POST",
    "path": "/vaults/{id}/folders/move"
  },
  "getVaultsByIdInvitations": {
    "method": "GET",
    "path": "/vaults/{id}/invitations"
  },
  "deleteVaultsByIdKnowledgeByKid": {
    "method": "DELETE",
    "path": "/vaults/{id}/knowledge/{kid}"
  },
  "postVaultsByIdKnowledgeByKidForget": {
    "method": "POST",
    "path": "/vaults/{id}/knowledge/{kid}/forget"
  },
  "postVaultsByIdKnowledgeByKidPin": {
    "method": "POST",
    "path": "/vaults/{id}/knowledge/{kid}/pin"
  },
  "postVaultsByIdKnowledgeByKidRestore": {
    "method": "POST",
    "path": "/vaults/{id}/knowledge/{kid}/restore"
  },
  "postVaultsByIdKnowledgeByKidUnpin": {
    "method": "POST",
    "path": "/vaults/{id}/knowledge/{kid}/unpin"
  },
  "postVaultsByIdKnowledgeForgetbulk": {
    "method": "POST",
    "path": "/vaults/{id}/knowledge/forget-bulk"
  },
  "getVaultsByIdLogByFile": {
    "method": "GET",
    "path": "/vaults/{id}/log/{file}"
  },
  "getVaultsByIdMembers": {
    "method": "GET",
    "path": "/vaults/{id}/members"
  },
  "postVaultsByIdMembers": {
    "method": "POST",
    "path": "/vaults/{id}/members"
  },
  "deleteVaultsByIdMembersByMemberUserId": {
    "method": "DELETE",
    "path": "/vaults/{id}/members/{memberUserId}"
  },
  "patchVaultsByIdMembersByMemberUserId": {
    "method": "PATCH",
    "path": "/vaults/{id}/members/{memberUserId}"
  },
  "postVaultsByIdReindex": {
    "method": "POST",
    "path": "/vaults/{id}/reindex"
  },
  "postVaultsByIdShare": {
    "method": "POST",
    "path": "/vaults/{id}/share"
  },
  "getVaultsByIdTrash": {
    "method": "GET",
    "path": "/vaults/{id}/trash"
  },
  "postVaultsByIdUploadAbort": {
    "method": "POST",
    "path": "/vaults/{id}/upload/abort"
  },
  "postVaultsByIdUploadFinalize": {
    "method": "POST",
    "path": "/vaults/{id}/upload/finalize"
  },
  "postVaultsByIdUploadPresign": {
    "method": "POST",
    "path": "/vaults/{id}/upload/presign"
  },
  "postVaultsByIdUploadReconcile": {
    "method": "POST",
    "path": "/vaults/{id}/upload/reconcile"
  }
} as const;
