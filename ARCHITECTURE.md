# DAM (Digital Asset Management) - Architecture & Design

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT / BROWSER                             │
└─────────────────────────────────────────┬───────────────────────────┘
                                          │
                                    HTTP/REST
                                          │
        ┌─────────────────────────────────┴─────────────────────────────┐
        │                                                               │
┌───────▼────────────┐                                    ┌────────────▼─────┐
│   API Server       │                                    │  MinIO Console    │
│  (Express.js)      │                                    │  (Port 9001)      │
│  (Port 4000)       │◄──────────────────────────────────►│                   │
│                    │      HTTP/REST/S3 Protocol         │  File Uploads     │
│  ┌──────────────┐  │                                    │                   │
│  │ Controllers  │  │                                    └───────────────────┘
│  ├──────────────┤  │
│  │   Routes     │  │                    ┌──────────────────────────┐
│  │              │  │                    │  MinIO Object Storage    │
│  │ /health      │  │                    │  (Port 9000)             │
│  │ /api/assets  │  │                    │                          │
│  │ /api/upload  │  │─────────────────────►  File Bucket: "assets"  │
│  │ /api/stats   │  │     putObject()     │  ├─ uploads/            │
│  │ /api/delete  │  │     statObject()    │  └─ thumbnails/        │
│  └──────────────┘  │                    │                          │
│  ┌──────────────┐  │                    └──────────────────────────┘
│  │ Service Layer│  │
│  ├──────────────┤  │
│  │ AssetService │  │
│  │              │  │                    ┌──────────────────────────┐
│  │ ├─ CRUD      │  │                    │    MongoDB 6.0           │
│  │ ├─ Upload    │  │                    │                          │
│  │ ├─ Queue Job │  │─────────────────────►  Database: "mediadb"    │
│  │ └─ FileCheck │  │                    │  ├─ assets collection    │
│  └──────────────┘  │                    │  └─ thumbnails coll.    │
│  ┌──────────────┐  │                    └──────────────────────────┘
│  │   Database   │  │
│  │   Module     │  │
│  ├──────────────┤  │
│  │ Schemas      │  │
│  │ Models       │  │
│  └──────────────┘  │
└────────────────────┘
        ▲
        │
        └─────────────────────────────────────────────────────┐
                          Shared DTOs & Interfaces            │
                          ┌──────────────────────────────────►│
                          │   @dam/database package           │
                          │   • IAsset interface              │
                          │   • CreateAssetDTO                │
                          │   • ProcessMediaJobPayload        │
                          │   • Schema definitions            │
                          └──────────────────────────────────┬┘
                                                             │
        ┌────────────────────────────────────────────────────┘
        │
┌───────▼──────────────┐
│   Worker Service     │
│  (Node.js Process)   │
│                      │
│  ┌────────────────┐  │
│  │  BullMQ Worker │  │
│  │                │  │
│  │  Listens to    │  │
│  │  'asset-tasks' │  │◄────────────────────────────────┐
│  │  queue         │  │                                 │
│  └────────────────┘  │                                 │
│  ┌────────────────┐  │                                 │
│  │  Job Handler   │  │                      ┌──────────▼─────────┐
│  │                │  │                      │  Redis (Queue)     │
│  │  1. Verify     │  │                      │  (Port 6379)       │
│  │  2. Process    │  │◄─────────────────────│                    │
│  │  3. Update     │  │                      │  Queue:            │
│  │  4. Complete   │  │                      │  'asset-tasks'     │
│  └────────────────┘  │                      │                    │
│  ┌────────────────┐  │                      └────────────────────┘
│  │  Status Mgmt   │  │
│  │                │  │
│  │  PENDING    →  │  │
│  │  PROCESSING →  │  │
│  │  PROCESSED  →  │  │
│  │  FAILED        │  │
│  └────────────────┘  │
└──────────────────────┘


## Data Flow

### 1. FILE UPLOAD FLOW

┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/upload (base64 file)
     ▼
┌─────────────────┐
│  API Controller │
└────┬────────────┘
     │
     ▼
┌──────────────────┐
│ AssetService     │
│ .uploadToMinIO() │
└────┬─────────────┘
     │
     ├─────────────────────────────────┐
     │                                 │
     ▼                                 ▼
┌──────────────┐              ┌──────────────────┐
│   MinIO      │              │ MongoDB (create) │
│ putObject()  │              │  Asset record    │
└──────────────┘              └────┬─────────────┘
     │                             │
     │                      ▼
     │              ┌──────────────────┐
     │              │ AssetService     │
     │              │.queueAssetFor... │
     │              └────┬─────────────┘
     │                   │
     │                   ▼
     │              ┌──────────────────┐
     │              │  Redis Queue     │
     │              │ add job          │
     │              └──────────────────┘
     │
     └─────────────────────┬─────────────────────────┐
                           │                         │
                    HTTP 201 Response                │
                 {assetId, jobId, ...}               │
                           │                         │
                           ▼                         │
                      ┌──────────┐                  │
                      │  Client  │                  │
                      └──────────┘           Worker listening...
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │  Job Processing │
                                            │  (see below)    │
                                            └─────────────────┘


### 2. JOB PROCESSING FLOW (Worker)

┌─────────────┐
│ Redis Queue │
└──────┬──────┘
       │ job: process-media
       ▼
┌──────────────────┐
│  BullMQ Worker   │
│  onJob handler   │
└────┬─────────────┘
     │
     ├─────────────────────────────────────────┐
     │                                         │
     ▼                                         ▼
┌─────────────────────┐          ┌──────────────────────┐
│ Update Status:      │          │ Verify MinIO File    │
│ PENDING → PROCESSING│          │ statObject() call    │
└──────────┬──────────┘          └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
       MongoDB                          MinIO S3
       (status)                    (file validation)
           │                                 │
           └─────────────────┬───────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Process Media  │
                    │ (future: video │
                    │  conversion,   │
                    │ thumbnails)    │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Update Status: │
                    │ PROCESSED or   │
                    │ FAILED         │
                    │ + error msg    │
                    └────────┬───────┘
                             │
                             ▼
                         MongoDB
                      (final status)
```
