# Digital Asset Manager

A simple yet powerful system for uploading, processing, and managing your media files (images, videos, audio). It automatically creates thumbnails, compresses videos, and extracts metadata.

## Features

### Upload & Management
- Upload single or multiple files at once
- Drag-and-drop interface
- View all files in an easy gallery
- See file details (size, type, when it was uploaded)
- Delete files you don't need
- Real-time status updates

### Automatic Processing
- Creates thumbnail previews automatically
- Compresses videos to 3 different quality levels (1080p, 720p, 480p)
- Extracts file information (dimensions, duration, bitrate, format)
- Works with images, videos, and audio files

### Smart Features
- Responsive design (works on phones, tablets, desktops)
- Real-time updates every 3 seconds
- Shows statistics (total files, processing, completed)
- Handles errors gracefully with retry logic
- Never loses your files

---

## Tech Stack

### Frontend (What You See)
| Technology | Purpose |
|-----------|---------|
| **React 18** | Web interface & user interactions |
| **TypeScript** | Makes the code safer & less buggy |
| **Vite** | Super fast build tool |
| **Tailwind CSS** | Beautiful styling |
| **Axios** | Sends requests to the server |

### Backend (The Server)
| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime for the server |
| **Express.js** | Web server framework |
| **TypeScript** | Makes the code safer & less buggy |
| **Mongoose** | Database connection library |

### Database & Storage
| Technology | Purpose |
|-----------|---------|
| **MongoDB** | Stores file info & metadata |
| **MinIO** | Stores the actual files (like AWS S3) |
| **Redis** | Message queue for background jobs |

### Media Processing
| Technology | Purpose |
|-----------|---------|
| **FFmpeg** | Compresses videos & extracts info |
| **Sharp** | Creates image thumbnails |
| **BullMQ** | Manages background processing jobs |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker** | Runs everything in containers |
| **Docker Compose** | Manages all containers together |

---

## Getting Started

### What You Need

- Docker and Docker Compose
- That's it! Everything else runs in containers.

### 1. Initialize Docker swarm

```bash
docker swarm init --advertise-addr 127.0.0.1
```

### 2. Build
```bash
cd your_project_root/apps/client
docker build -f apps/api/Dockerfile -t dam-api:latest .
docker build -f apps/worker/Dockerfile -t dam-worker:latest .
docker build -f apps/client/Dockerfile -t dam-client:latest .

```

### 3. Deploy dammulti(name of stack)
```bash
docker stack deploy -c docker-stack.yaml dammulti
```
### 4. Run Client App

```bash
cd your_project_root/apps/client
npm run dev
```