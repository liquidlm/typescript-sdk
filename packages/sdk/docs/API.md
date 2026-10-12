# Generated API reference

Contract SHA-256: `39c9bd00960c130f9c36874d67c8ff81a3d0492fd676c3691136e8c28d8cbb5e`.

Generated from the reviewed public OpenAPI snapshot. Use the operation ID with
`client.call(id, { parameters, body, options })`; exported `Operations` and
`Schemas` provide the corresponding TypeScript types. A deployment may expose
a subset of these operations; this inventory is not a self-host parity claim.

| Operation ID | Method | API path | Parameters | JSON body |
| --- | --- | --- | --- | --- |
| `getAuthMe` | GET | `/auth/me` | — | — |
| `getChatSessions` | GET | `/chat/sessions` | — | — |
| `postChatSessions` | POST | `/chat/sessions` | — | `CreateChatSessionBody` |
| `deleteChatSessionsById` | DELETE | `/chat/sessions/{id}` | `id` (path, required) | — |
| `getChatSessionsById` | GET | `/chat/sessions/{id}` | `id` (path, required) | — |
| `postChatSessionsByIdCompletions` | POST | `/chat/sessions/{id}/completions` | `id` (path, required) | `ChatCompletionBody` |
| `getChatSessionsByIdMessages` | GET | `/chat/sessions/{id}/messages` | `id` (path, required) | — |
| `getEntityaliases` | GET | `/entity-aliases` | — | — |
| `postEntityaliases` | POST | `/entity-aliases` | — | `CreateEntityAliasBody` |
| `deleteEntityaliasesById` | DELETE | `/entity-aliases/{id}` | `id` (path, required) | — |
| `getEntitytypes` | GET | `/entity-types` | — | — |
| `postEntitytypes` | POST | `/entity-types` | — | `CreateEntityTypeBody` |
| `deleteEntitytypesById` | DELETE | `/entity-types/{id}` | `id` (path, required) | — |
| `getGraph` | GET | `/graph` | `focus_knowledge_id` (query), `vault_ids` (query) | — |
| `getKnowledge` | GET | `/knowledge` | `type` (query), `tags` (query), `indexed` (query), `vault_ids` (query), `vault_id` (query), `include_auto` (query), `search` (query), `order` (query), `limit` (query), `offset` (query), `top_level` (query), `pinned` (query) | — |
| `postKnowledge` | POST | `/knowledge` | — | `CreateItemBody` |
| `deleteKnowledgeById` | DELETE | `/knowledge/{id}` | `id` (path, required) | — |
| `getKnowledgeById` | GET | `/knowledge/{id}` | `id` (path, required) | — |
| `patchKnowledgeById` | PATCH | `/knowledge/{id}` | `id` (path, required) | `UpdateItemBody` |
| `getKnowledgeByIdFrames` | GET | `/knowledge/{id}/frames` | `id` (path, required), `cursor` (query), `limit` (query) | — |
| `getKnowledgeByIdPages` | GET | `/knowledge/{id}/pages` | `id` (path, required), `cursor` (query), `limit` (query), `page` (query), `pages` (query), `from` (query), `to` (query), `generation` (query), `include_thumbnails` (query) | — |
| `postKnowledgeByIdReextract` | POST | `/knowledge/{id}/reextract` | `id` (path, required) | `ReextractKnowledgeBody` |
| `postKnowledgeByIdReindex` | POST | `/knowledge/{id}/reindex` | `id` (path, required) | — |
| `postKnowledgeByIdRelate` | POST | `/knowledge/{id}/relate` | `id` (path, required) | `RelateKnowledgeBody` |
| `deleteKnowledgeByIdRelateByRelatedId` | DELETE | `/knowledge/{id}/relate/{relatedId}` | `id` (path, required), `relatedId` (path, required) | — |
| `getKnowledgeByIdRelated` | GET | `/knowledge/{id}/related` | `id` (path, required) | — |
| `postKnowledgeByIdSupersedes` | POST | `/knowledge/{id}/supersedes` | `id` (path, required) | `SupersedesKnowledgeBody` |
| `deleteKnowledgeByIdSupersedesByPredecessorId` | DELETE | `/knowledge/{id}/supersedes/{predecessorId}` | `id` (path, required), `predecessorId` (path, required) | — |
| `getKnowledgeCalendarDay` | GET | `/knowledge/calendar/day` | `vault_ids` (query), `vault_id` (query), `content_from` (query, required), `content_to` (query, required), `created_from` (query, required), `created_to` (query, required), `type` (query), `include_auto` (query), `search` (query), `top_level` (query), `limit` (query) | — |
| `getKnowledgeCalendarDaydigest` | GET | `/knowledge/calendar/day-digest` | `vault_ids` (query), `vault_id` (query), `day` (query, required) | — |
| `getKnowledgeCalendarDaymarkers` | GET | `/knowledge/calendar/day-markers` | `vault_ids` (query), `vault_id` (query), `content_from` (query, required), `content_to` (query, required), `created_from` (query, required), `created_to` (query, required) | — |
| `getSearchEntities` | GET | `/search/entities` | `limit` (query), `vault_ids` (query), `vault_id` (query), `type` (query), `canonical_id` (query), `q` (query) | — |
| `postSearchEntitiesForget` | POST | `/search/entities/forget` | — | `ForgetEntityBody` |
| `getSearchEntitiesKnowledge` | GET | `/search/entities/knowledge` | `name` (query, required), `limit` (query), `vault_ids` (query), `vault_id` (query), `type` (query), `canonical_id` (query) | — |
| `getSearchEntitiesRelations` | GET | `/search/entities/relations` | `name` (query, required), `limit` (query), `vault_ids` (query), `vault_id` (query), `type` (query), `canonical_id` (query) | — |
| `getSearchFiles` | GET | `/search/files` | `limit` (query), `cursor` (query), `tags` (query), `mime_type` (query), `vault_ids` (query), `vault_id` (query), `dir_id` (query), `fields` (query), `entity_canonical_ids` (query), `entity_names` (query) | — |
| `getSearchFilesByS3Key` | GET | `/search/files/{s3Key}` | `s3Key` (path, required) | — |
| `querySearchFulltext` | QUERY | `/search/fulltext` | — | `SearchBody` |
| `querySearchHybrid` | QUERY | `/search/hybrid` | — | `SearchBody` |
| `getSearchKnowledge` | GET | `/search/knowledge` | `limit` (query), `cursor` (query), `tags` (query), `mime_type` (query), `vault_ids` (query), `vault_id` (query), `dir_id` (query), `fields` (query), `entity_canonical_ids` (query), `entity_names` (query) | — |
| `querySearchSemantic` | QUERY | `/search/semantic` | — | `SearchBody` |
| `getSearchStatus` | GET | `/search/status` | — | — |
| `getVaults` | GET | `/vaults` | — | — |
| `postVaults` | POST | `/vaults` | — | `CreateVaultBody` |
| `deleteVaultsById` | DELETE | `/vaults/{id}` | `id` (path, required) | — |
| `getVaultsById` | GET | `/vaults/{id}` | `id` (path, required) | — |
| `patchVaultsById` | PATCH | `/vaults/{id}` | `id` (path, required) | `UpdateVaultBody` |
| `getVaultsByIdFilemetaByKey` | GET | `/vaults/{id}/file-meta/{key}` | `id` (path, required), `key` (path, required) | — |
| `getVaultsByIdFileurlByKey` | GET | `/vaults/{id}/file-url/{key}` | `id` (path, required), `key` (path, required) | — |
| `getVaultsByIdFileversionurl` | GET | `/vaults/{id}/file-version-url` | `id` (path, required), `key` (query), `versionId` (query), `sourceKey` (query) | — |
| `getVaultsByIdFileversions` | GET | `/vaults/{id}/file-versions` | `id` (path, required), `key` (query) | — |
| `deleteVaultsByIdFilesByKey` | DELETE | `/vaults/{id}/files/{key}` | `id` (path, required), `key` (path, required), `purge` (query) | — |
| `getVaultsByIdFilesByKey` | GET | `/vaults/{id}/files/{key}` | `id` (path, required), `key` (path, required) | — |
| `putVaultsByIdFilesByKey` | PUT | `/vaults/{id}/files/{key}` | `id` (path, required), `key` (path, required) | — |
| `postVaultsByIdFilesMove` | POST | `/vaults/{id}/files/move` | `id` (path, required) | `MoveFilesBody` |
| `postVaultsByIdFilesMovetovault` | POST | `/vaults/{id}/files/move-to-vault` | `id` (path, required) | `MoveFilesToVaultBody` |
| `postVaultsByIdFilesRestore` | POST | `/vaults/{id}/files/restore` | `id` (path, required) | `RestoreFileBody` |
| `deleteVaultsByIdFolders` | DELETE | `/vaults/{id}/folders` | `id` (path, required) | `FolderBody` |
| `getVaultsByIdFolders` | GET | `/vaults/{id}/folders` | `id` (path, required) | — |
| `postVaultsByIdFolders` | POST | `/vaults/{id}/folders` | `id` (path, required) | `FolderBody` |
| `postVaultsByIdFoldersMove` | POST | `/vaults/{id}/folders/move` | `id` (path, required) | `MoveFolderBody` |
| `getVaultsByIdInvitations` | GET | `/vaults/{id}/invitations` | `id` (path, required) | — |
| `deleteVaultsByIdKnowledgeByKid` | DELETE | `/vaults/{id}/knowledge/{kid}` | `id` (path, required), `kid` (path, required), `purge` (query) | — |
| `postVaultsByIdKnowledgeByKidForget` | POST | `/vaults/{id}/knowledge/{kid}/forget` | `id` (path, required), `kid` (path, required) | `ForgetKnowledgeBody` |
| `postVaultsByIdKnowledgeByKidPin` | POST | `/vaults/{id}/knowledge/{kid}/pin` | `id` (path, required), `kid` (path, required) | — |
| `postVaultsByIdKnowledgeByKidRestore` | POST | `/vaults/{id}/knowledge/{kid}/restore` | `id` (path, required), `kid` (path, required) | Inline; see Operations type |
| `postVaultsByIdKnowledgeByKidUnpin` | POST | `/vaults/{id}/knowledge/{kid}/unpin` | `id` (path, required), `kid` (path, required) | — |
| `postVaultsByIdKnowledgeForgetbulk` | POST | `/vaults/{id}/knowledge/forget-bulk` | `id` (path, required) | `ForgetBulkBody` |
| `getVaultsByIdLogByFile` | GET | `/vaults/{id}/log/{file}` | `id` (path, required), `file` (path, required) | — |
| `getVaultsByIdMembers` | GET | `/vaults/{id}/members` | `id` (path, required) | — |
| `postVaultsByIdMembers` | POST | `/vaults/{id}/members` | `id` (path, required) | `AddVaultMemberBody` |
| `deleteVaultsByIdMembersByMemberUserId` | DELETE | `/vaults/{id}/members/{memberUserId}` | `id` (path, required), `memberUserId` (path, required) | — |
| `patchVaultsByIdMembersByMemberUserId` | PATCH | `/vaults/{id}/members/{memberUserId}` | `id` (path, required), `memberUserId` (path, required) | Inline; see Operations type |
| `postVaultsByIdReindex` | POST | `/vaults/{id}/reindex` | `id` (path, required) | `ReindexVaultBody` |
| `postVaultsByIdShare` | POST | `/vaults/{id}/share` | `id` (path, required) | `ShareVaultBody` |
| `getVaultsByIdTrash` | GET | `/vaults/{id}/trash` | `id` (path, required), `cursor` (query), `limit` (query) | — |
| `postVaultsByIdUploadAbort` | POST | `/vaults/{id}/upload/abort` | `id` (path, required) | `AbortUploadBody` |
| `postVaultsByIdUploadFinalize` | POST | `/vaults/{id}/upload/finalize` | `id` (path, required) | `FinalizeUploadBody` |
| `postVaultsByIdUploadPresign` | POST | `/vaults/{id}/upload/presign` | `id` (path, required) | `PresignUploadBody` |
| `postVaultsByIdUploadReconcile` | POST | `/vaults/{id}/upload/reconcile` | `id` (path, required) | Inline; see Operations type |

## Exported schemas

- `Schemas["ExpandedScopes"]`
- `Schemas["AccountSelf"]`
- `Schemas["ErrorResponse"]`
- `Schemas["ChatSession"]`
- `Schemas["CreateChatSessionBody"]`
- `Schemas["ChatCompletionBody"]`
- `Schemas["ChatMessage"]`
- `Schemas["CustomEntityAlias"]`
- `Schemas["CreateEntityAliasBody"]`
- `Schemas["CustomEntityType"]`
- `Schemas["CreateEntityTypeBody"]`
- `Schemas["GraphNode"]`
- `Schemas["GraphEdge"]`
- `Schemas["GraphResult"]`
- `Schemas["DiarizationStatus"]`
- `Schemas["TranscriptChunks"]`
- `Schemas["KnowledgeRecord"]`
- `Schemas["ListItemsResult"]`
- `Schemas["CreateItemBody"]`
- `Schemas["UpdateItemBody"]`
- `Schemas["VideoFramesResult"]`
- `Schemas["DocumentPage"]`
- `Schemas["DocumentPagesResult"]`
- `Schemas["ReextractKnowledgeBody"]`
- `Schemas["KnowledgeLink"]`
- `Schemas["RelateKnowledgeBody"]`
- `Schemas["RelatedFileReference"]`
- `Schemas["RelatedEntity"]`
- `Schemas["SupersedesKnowledgeBody"]`
- `Schemas["DayItem"]`
- `Schemas["DayItemsResult"]`
- `Schemas["DayDigestResult"]`
- `Schemas["DayMarkersResult"]`
- `Schemas["EntitiesResult"]`
- `Schemas["ForgetEntityBody"]`
- `Schemas["EntityKnowledgeResult"]`
- `Schemas["EntityRelationsResult"]`
- `Schemas["LastModifiedBy"]`
- `Schemas["IndexedFilesResult"]`
- `Schemas["SearchFileRecord"]`
- `Schemas["SearchResult"]`
- `Schemas["SearchFilters"]`
- `Schemas["SearchBody"]`
- `Schemas["SearchKnowledgeResult"]`
- `Schemas["IndexingStatusResult"]`
- `Schemas["Vault"]`
- `Schemas["CreateVaultBody"]`
- `Schemas["UpdateVaultBody"]`
- `Schemas["FileMetaResult"]`
- `Schemas["FileUrlResult"]`
- `Schemas["FileVersion"]`
- `Schemas["ForgetResult"]`
- `Schemas["MoveFilesBody"]`
- `Schemas["MoveFilesToVaultBody"]`
- `Schemas["RestoreFileBody"]`
- `Schemas["FolderBody"]`
- `Schemas["MoveFolderBody"]`
- `Schemas["ForgetKnowledgeBody"]`
- `Schemas["PinResult"]`
- `Schemas["RestoreResult"]`
- `Schemas["ForgetBulkBody"]`
- `Schemas["VaultMember"]`
- `Schemas["AddVaultMemberBody"]`
- `Schemas["ReindexVaultBody"]`
- `Schemas["ShareVaultBody"]`
- `Schemas["TrashItem"]`
- `Schemas["AbortUploadBody"]`
- `Schemas["FinalizeUploadBody"]`
- `Schemas["PresignUploadBody"]`
