# T-020 Document vault in the manual search

Owner: planner (this brief), Claude Code builds · Status: todo · Depends on T-007 (embedding queue and worker) and T-R1 (`rag_chunks`, critical review §7)
Goal: drop files into the Document vault (drag and drop on a computer; Files, Photos or camera on a phone) and, within minutes, the manual's question box can answer from them and cite them.
Non-goals: Pinecone or any second vector store (vectors stay in Supabase at 768 dimensions, ADR-0004); OpenAI-style 3,072-dim embeddings; indexing bookings, expenses or tasks (those are SQL questions, not text search).

## Flow

1. **Upload.** The Documents page gets a drop zone that takes several files at once: PDF, DOCX, TXT, JPG/PNG (iPhone HEIC converted in the browser where it can be decoded), up to 20 MB each. Each file becomes a `documents` row with its visibility (all members or admins only) and an "Use in search" switch, on by default.
2. **Queue.** An insert or file change on `documents` adds a job to `embedding_jobs` (T-007). The upload finishes immediately; a small status shows "reading…", then "searchable" or the error.
3. **Read.** The cron worker (existing `cron-auth.ts`) downloads the file with the service key and extracts text: PDF text layer (a Workers-compatible parser such as unpdf); DOCX via its XML; scanned PDFs and photos through the vision model on the same AI gateway, capped per account per day (`usage_counters`).
4. **Chunk.** ~800 tokens with ~100 overlap, split on headings and pages; each chunk keeps its page number for citations. A content hash per chunk: re-uploading the same file costs no AI calls.
5. **Embed and store.** gemini-embedding-001 at 768 dimensions into `rag_chunks` (`source_type = 'document'`, `visibility` copied from the document, `model_version` recorded). RLS: members never retrieve admin-only chunks.
6. **Answer.** `search_chunks` (SECURITY INVOKER, hybrid vector + full text) searches manual sections and documents together; answers cite "Deed.pdf, page 2". Deleting a document deletes its chunks and file.

## Decisions for the maintainers

- **What leaves the EU.** Documents like deeds or insurance papers contain personal data. Choose Lovable's gateway or Google directly in an EU region before this ships (ADR, critical review §7), and say it in the privacy page.
- **Cost cap.** Pages of OCR per account per month on the free plan; more on paid plans (entitlements).

## Tasks (one PR each)

T-020a upload drop zone and statuses (UI, can be Lovable) · T-020b worker: extract, chunk, embed documents · T-020c OCR for scans and photos with caps · T-020d search across manual + documents with citations · T-020e tests: tenant isolation, admin-only chunks, re-upload costs 0 calls.

Acceptance (on staging): five files (text PDF, scanned PDF, DOCX, photo of a receipt, TXT) searchable within 5 minutes; "Kde je záruka na čerpadlo?" returns the warranty with its page; a member of the account can't retrieve an admin-only document; a member of another account gets nothing; re-uploading the same file makes 0 embedding calls.
