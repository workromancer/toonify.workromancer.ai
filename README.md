# Toonify · AI Webtoon Studio

[English](README.md) · [한국어](README.ko.md)

**Turn a story idea into characters, episodes, and webtoon panels with AI.**

Toonify (툰이파이) is an AI-assisted webtoon creation platform. It brings worldbuilding, art direction, character design, storyboard editing, image generation, and episode export into one workflow.

Developed as an **AI Native project with Antigravity + Gemini 3 Pro**.

![Toonify project preview](frontend/public/og.png)

## What you can do

1. Create a project and expand its world, genre, and tone with AI suggestions.
2. Choose an art style and generate style references and a project cover.
3. Cast characters with profiles, reference boards, and outfit references.
4. Develop episode ideas and plan scenes in the storyboard editor.
5. Generate, edit, and regenerate panels with character, style, and previous-panel references.
6. Review episodes in the mobile viewer and export a vertical strip or ZIP archive.

The application also includes workspaces, generation credits, and Korean/English localization. Character consistency is a design goal supported by reference images and prompts; generated results can vary.

## Development history

Dates below come from Git history fetched on **November 16, 2026**. All dates use **Asia/Seoul (KST, UTC+9)**. Calendar spans include both endpoints and do not represent hours worked.

| Scope | Recorded period | Calendar span | Commits |
| --- | --- | --- | --- |
| Default branch (`main`) | December 6, 2025 – January 7, 2026 | 33 days | 313 |
| All fetched branches | December 6, 2025 – January 12, 2026 | 38 days | 323 unique commits |

- **First recorded commit:** [`b46ec0a`](https://github.com/workromancer/toonify.workromancer.ai/commit/b46ec0a), December 6, 2025 at 22:57 KST.
- **Latest original main commit:** [`19f8c41`](https://github.com/workromancer/toonify.workromancer.ai/commit/19f8c41), January 7, 2026 at 22:46 KST.
- **Additional feature work:** [`feature/improve-cut-generation`](https://github.com/workromancer/toonify.workromancer.ai/tree/feature/improve-cut-generation), through [`3489932`](https://github.com/workromancer/toonify.workromancer.ai/commit/3489932) on January 12, 2026.
- **GitHub repository created:** December 7, 2025. Repository creation and push timestamps are distinct from the development period.

These counts describe the original development history before this open-source preparation change. Later maintenance and documentation commits are excluded.

## AI Native development

**Antigravity + Gemini 3 Pro** served as the development toolchain for this project. The repository includes agent workflows for documentation, linting, commits, Google Cloud authentication, and deployment in [`.agent/workflows/`](.agent/workflows/), alongside [prompt designs and implementation plans](docs/ai-prompts/README.md).

The AI used to **build the software** is separate from the models **called by the application**. The checked-in backend configures the following runtime models in [`base.py`](backend/app/services/ai/base.py):

| Application task | Configured model |
| --- | --- |
| Worldbuilding, art direction, character text, and episode planning | `gemini-3-flash-preview` |
| Image generation and editing | `gemini-3-pro-image-preview` |
| Text embeddings | `gemini-embedding-001` |

These are repository configuration values, not a guarantee of current provider availability. Running the project requires access to the configured models or updating the configuration for your environment.

## Architecture and stack

```text
Browser → Next.js frontend / API proxy → FastAPI backend
                                           ├─ PostgreSQL + pgvector
                                           ├─ Gemini / Vertex AI
                                           └─ MinIO (local) / Cloud Storage (production)
```

| Layer | Technologies in the repository |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, next-intl |
| Backend | Python, FastAPI, SQLModel, Pydantic, Alembic, Google Gen AI SDK |
| Data and storage | PostgreSQL 16 + pgvector, MinIO, Google Cloud Storage |
| Authentication | Clerk integration and legacy email/password authentication |
| Deployment | Docker, Google Cloud Run, Cloud SQL, Artifact Registry |

## Local development

Use **Node.js 20.9+** (the Docker build uses Node 20), **Python 3.11**, and **Docker Compose**. You also need your own Gemini API credentials and Clerk development keys. Clerk is initialized by the frontend even when using legacy email/password login.

```bash
git clone https://github.com/workromancer/toonify.workromancer.ai.git
cd toonify.workromancer.ai
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
```

Edit both environment files. Set a unique backend `SECRET_KEY`, your `GEMINI_API_KEY`, and your Clerk development keys. The example database and MinIO credentials match Docker Compose and are for local use only.

```bash
# Start PostgreSQL and MinIO only; Compose does not start the application servers.
docker compose up -d

# Backend, in one terminal
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Frontend, in another terminal, from the repository root
cd frontend
npm ci --legacy-peer-deps
npm run dev
```

- Frontend: [localhost:3000](http://localhost:3000)
- API documentation: [localhost:8000/docs](http://localhost:8000/docs)
- MinIO console: [localhost:9001](http://localhost:9001)

The backend initializes tables on startup. The existing development bootstrap also creates a sample user; review and remove development seeding before deploying to a public environment. AI requests require external services and may incur charges.

The optional `./dev.sh` helper installs dependencies, restarts Compose, seeds sample data, and starts both servers. It also terminates processes using ports 3000 and 8000; use it only in a dedicated local environment.

For Vertex AI, configure your Google Cloud project, location, and Application Default Credentials. See [the authentication workflow](.agent/workflows/gcloud-auth.md). GitHub Actions deployment has been removed. The remaining manual deployment scripts require your own cloud resources and secrets; audit environment-specific values before use.

## Repository guide

| Path | Contents |
| --- | --- |
| [`frontend/`](frontend/) | Studio UI, localized pages, API and asset proxies |
| [`backend/`](backend/) | API, data models, AI services, storage, migrations |
| [`scripts/`](scripts/) | Infrastructure and deployment utilities |
| [`.agent/workflows/`](.agent/workflows/) | AI-assisted development workflows |
| [`docs/`](docs/) | Product, architecture, prompt, and deployment documents |

## Documentation

- [Product manual](docs/PRODUCT_MANUAL.md)
- [Webtoon creation workflow](docs/WEBTOON_CREATION_PROCESS.md)
- [API reference](docs/API_REFERENCE.md)
- [AI models and prompts](docs/AI_MODELS.md)
- [Character consistency — English](docs/character-consistency/character-consistency-solution-en.md) · [한국어](docs/character-consistency/character-consistency-solution-ko.md)
- [Deployment guide — 한국어](docs/prod/deployment_guide_ko.md)
- [Roadmap](docs/roadmap/README.md)

Some design and operations documents describe earlier iterations. For current dependencies, configuration, and behavior, use the manifests and source code as the reference.

## Contributing

Open an issue with the problem, expected behavior, and reproduction steps. For pull requests, describe the change and its validation; never include credentials, user data, or generated cloud environment files.

For frontend changes, run `cd frontend && npm run lint` and `npm run build` with your development environment configured. For backend changes, validate the affected API behavior in a local environment.

## License

The source code is available under the [MIT License](LICENSE). Third-party dependencies retain their respective licenses. External services and generated content are subject to their applicable terms; this license does not grant rights to third-party characters, brands, or reference images.
